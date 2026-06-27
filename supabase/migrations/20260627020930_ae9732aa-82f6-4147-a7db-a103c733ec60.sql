
-- 1. Converter perfil de enum para text e padronizar valores
ALTER TABLE public.usuarios ALTER COLUMN perfil DROP DEFAULT;
ALTER TABLE public.usuarios ALTER COLUMN perfil TYPE text USING perfil::text;
ALTER TABLE public.convites ALTER COLUMN perfil_convidado DROP DEFAULT;
ALTER TABLE public.convites ALTER COLUMN perfil_convidado TYPE text USING perfil_convidado::text;
DROP TYPE IF EXISTS public.user_perfil;

UPDATE public.usuarios SET perfil = 'Administrador'
  WHERE perfil IN ('SUPER ADMIN','SUPER ADMINISTRADOR','admin');
UPDATE public.usuarios SET perfil = 'Operador'
  WHERE perfil IN ('Usuário','Usuario','usuario');
UPDATE public.convites SET perfil_convidado = 'Operador'
  WHERE perfil_convidado IN ('Usuário','Usuario','usuario');
UPDATE public.convites SET perfil_convidado = 'Administrador'
  WHERE perfil_convidado IN ('SUPER ADMIN','SUPER ADMINISTRADOR','admin');

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_perfil_check CHECK (perfil IN ('Administrador','Gestor','Operador'));
ALTER TABLE public.usuarios ALTER COLUMN perfil SET DEFAULT 'Operador';
ALTER TABLE public.convites
  ADD CONSTRAINT convites_perfil_check CHECK (perfil_convidado IN ('Administrador','Gestor','Operador'));
ALTER TABLE public.convites ALTER COLUMN perfil_convidado SET DEFAULT 'Operador';

-- 2. Coluna ativo
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 3. Funções SECURITY DEFINER (anti-recursão)
CREATE OR REPLACE FUNCTION public.tem_funcao(_user_id uuid, _funcao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND perfil = _funcao AND ativo = true)
$$;
CREATE OR REPLACE FUNCTION public.e_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND perfil = 'Administrador' AND ativo = true)
$$;
CREATE OR REPLACE FUNCTION public.e_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND perfil = 'Gestor' AND ativo = true)
$$;
CREATE OR REPLACE FUNCTION public.e_operador(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = _user_id AND perfil = 'Operador' AND ativo = true)
$$;

-- 4. Atualizar trigger handle_new_user para novos papéis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
  v_perfil text;
  v_invited public.convites%ROWTYPE;
BEGIN
  SELECT * INTO v_invited FROM public.convites
    WHERE email_convidado = NEW.email AND status = 'pendente' AND expira_em > now()
    ORDER BY criado_em DESC LIMIT 1;

  SELECT COUNT(*) INTO v_count FROM public.usuarios;

  IF v_count = 0 THEN
    v_perfil := 'Administrador';
  ELSIF v_invited.id IS NOT NULL THEN
    v_perfil := v_invited.perfil_convidado;
    UPDATE public.convites SET status = 'aceito' WHERE id = v_invited.id;
  ELSE
    v_perfil := 'Operador';
  END IF;

  INSERT INTO public.usuarios (id, nome_completo, email, perfil, google_id, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email, v_perfil, NEW.raw_user_meta_data->>'sub', true
  );

  -- manter user_roles em sincronia (compat com código legado)
  INSERT INTO public.user_roles (user_id, role) VALUES (
    NEW.id,
    CASE v_perfil WHEN 'Administrador' THEN 'admin'::public.app_role ELSE 'usuario'::public.app_role END
  ) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RLS — recriar policies usando funções novas
-- 5.1 usuarios
DROP POLICY IF EXISTS usuarios_admin_all ON public.usuarios;
DROP POLICY IF EXISTS usuarios_select_all_auth ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update_self ON public.usuarios;
CREATE POLICY "Admin ve tudo usuarios" ON public.usuarios FOR SELECT TO authenticated
  USING (public.e_admin(auth.uid()) OR id = auth.uid());
CREATE POLICY "User edita nome proprio" ON public.usuarios FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admin gerencia usuarios" ON public.usuarios FOR ALL TO authenticated
  USING (public.e_admin(auth.uid())) WITH CHECK (public.e_admin(auth.uid()));

-- 5.2 Operação: movimentacoes e configuracao_alertas (Operador+ pode tudo)
DROP POLICY IF EXISTS movimentacoes_select ON public.movimentacoes;
DROP POLICY IF EXISTS movimentacoes_insert ON public.movimentacoes;
DROP POLICY IF EXISTS movimentacoes_update ON public.movimentacoes;
DROP POLICY IF EXISTS movimentacoes_delete ON public.movimentacoes;
DROP POLICY IF EXISTS movimentacoes_select_all_auth ON public.movimentacoes;
DROP POLICY IF EXISTS movimentacoes_all_auth ON public.movimentacoes;
CREATE POLICY "Todos veem movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operador+ gerencia movimentacoes" ON public.movimentacoes FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_operador(auth.uid()))
  WITH CHECK (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_operador(auth.uid()));

DROP POLICY IF EXISTS configuracao_alertas_select_all_auth ON public.configuracao_alertas;
DROP POLICY IF EXISTS configuracao_alertas_admin_all ON public.configuracao_alertas;
CREATE POLICY "Todos veem alertas" ON public.configuracao_alertas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operador+ gerencia alertas" ON public.configuracao_alertas FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_operador(auth.uid()))
  WITH CHECK (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_operador(auth.uid()));

-- 5.3 Cadastros: atms, cds, auditoria (Gestor+ gerencia; Operador só lê)
DROP POLICY IF EXISTS atms_select_all_auth ON public.atms;
DROP POLICY IF EXISTS atms_admin_all ON public.atms;
CREATE POLICY "Todos veem atms" ON public.atms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor+ gerencia atms" ON public.atms FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()))
  WITH CHECK (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()));

DROP POLICY IF EXISTS cds_select_all_auth ON public.cds;
DROP POLICY IF EXISTS cds_admin_all ON public.cds;
CREATE POLICY "Todos veem cds" ON public.cds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor+ gerencia cds" ON public.cds FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()))
  WITH CHECK (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()));

DROP POLICY IF EXISTS auditoria_select_all_auth ON public.auditoria;
DROP POLICY IF EXISTS auditoria_admin_all ON public.auditoria;
CREATE POLICY "Todos veem auditoria" ON public.auditoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestor+ gerencia auditoria" ON public.auditoria FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()))
  WITH CHECK (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()));
