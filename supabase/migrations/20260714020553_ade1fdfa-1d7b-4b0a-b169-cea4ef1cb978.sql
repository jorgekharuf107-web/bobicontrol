
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_perfil_check
  CHECK (perfil IN ('SUPER_ADMIN','Administrador','Gestor','Operador',
                    'admin_geral','supervisor_linha','tecnico_estacao','dispatcher'));
UPDATE public.usuarios SET perfil='admin_geral'      WHERE perfil='Administrador';
UPDATE public.usuarios SET perfil='supervisor_linha' WHERE perfil='Gestor';
UPDATE public.usuarios SET perfil='tecnico_estacao'  WHERE perfil='Operador';
ALTER TABLE public.usuarios DROP CONSTRAINT usuarios_perfil_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_perfil_check
  CHECK (perfil IN ('SUPER_ADMIN','admin_geral','supervisor_linha','tecnico_estacao','dispatcher'));

-- Drop TODAS as constraints CHECK em convites que referenciem perfil
ALTER TABLE public.convites DROP CONSTRAINT IF EXISTS convites_perfil_convidado_check;
ALTER TABLE public.convites DROP CONSTRAINT IF EXISTS convites_perfil_check;
UPDATE public.convites SET perfil_convidado='admin_geral'      WHERE perfil_convidado='Administrador';
UPDATE public.convites SET perfil_convidado='supervisor_linha' WHERE perfil_convidado='Gestor';
UPDATE public.convites SET perfil_convidado='tecnico_estacao'  WHERE perfil_convidado='Operador';
ALTER TABLE public.convites ADD CONSTRAINT convites_perfil_convidado_check
  CHECK (perfil_convidado IN ('admin_geral','supervisor_linha','tecnico_estacao','dispatcher'));

ALTER TABLE public.atms
  ADD COLUMN IF NOT EXISTS fabricante text,
  ADD COLUMN IF NOT EXISTS caixas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avulsas integer NOT NULL DEFAULT 0;

ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS tecnico_responsavel_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motorista1 text,
  ADD COLUMN IF NOT EXISTS motorista2 text;

ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS status_aprovacao text NOT NULL DEFAULT 'aprovado',
  ADD COLUMN IF NOT EXISTS motivo_permuta text;
ALTER TABLE public.movimentacoes DROP CONSTRAINT IF EXISTS movimentacoes_status_aprovacao_check;
ALTER TABLE public.movimentacoes ADD CONSTRAINT movimentacoes_status_aprovacao_check
  CHECK (status_aprovacao IN ('pendente','aprovado','negado'));

ALTER TABLE public.itens
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS tipo_bobina text,
  ADD COLUMN IF NOT EXISTS qtd_caixas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_avulsas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cd_id uuid REFERENCES public.cds(id) ON DELETE SET NULL;
ALTER TABLE public.itens DROP CONSTRAINT IF EXISTS itens_tipo_bobina_check;
ALTER TABLE public.itens ADD CONSTRAINT itens_tipo_bobina_check
  CHECK (tipo_bobina IS NULL OR tipo_bobina IN ('caixa_3','avulsa'));

ALTER TABLE public.cds ADD COLUMN IF NOT EXISTS estoque_minimo integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.calcular_total_bobinas(_caixas integer, _avulsas integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(_caixas,0)*3 + COALESCE(_avulsas,0)
$$;

CREATE TABLE IF NOT EXISTS public.usuario_linhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  linha_id uuid NOT NULL REFERENCES public.linhas(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, linha_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_linhas TO authenticated;
GRANT ALL ON public.usuario_linhas TO service_role;
ALTER TABLE public.usuario_linhas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.alerta_destinatarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id uuid NOT NULL REFERENCES public.configuracao_alertas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alerta_id, usuario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerta_destinatarios TO authenticated;
GRANT ALL ON public.alerta_destinatarios TO service_role;
ALTER TABLE public.alerta_destinatarios ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.e_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id=_user_id AND perfil IN ('admin_geral','SUPER_ADMIN') AND ativo=true)
$$;
CREATE OR REPLACE FUNCTION public.e_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id=_user_id AND perfil='supervisor_linha' AND ativo=true)
$$;
CREATE OR REPLACE FUNCTION public.e_operador(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id=_user_id AND perfil='tecnico_estacao' AND ativo=true)
$$;
CREATE OR REPLACE FUNCTION public.e_dispatcher(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id=_user_id AND perfil='dispatcher' AND ativo=true)
$$;
CREATE OR REPLACE FUNCTION public.usuario_ve_linha(_user_id uuid, _linha_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.e_admin(_user_id) OR public.e_dispatcher(_user_id) OR public.e_gestor(_user_id)
    OR EXISTS (SELECT 1 FROM public.usuario_linhas WHERE usuario_id=_user_id AND linha_id=_linha_id)
$$;

DROP POLICY IF EXISTS "ul_select" ON public.usuario_linhas;
CREATE POLICY "ul_select" ON public.usuario_linhas FOR SELECT TO authenticated
  USING (usuario_id=auth.uid() OR public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()));
DROP POLICY IF EXISTS "ul_all_admin" ON public.usuario_linhas;
CREATE POLICY "ul_all_admin" ON public.usuario_linhas FOR ALL TO authenticated
  USING (public.e_admin(auth.uid())) WITH CHECK (public.e_admin(auth.uid()));

DROP POLICY IF EXISTS "ad_select" ON public.alerta_destinatarios;
CREATE POLICY "ad_select" ON public.alerta_destinatarios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ad_all_admin" ON public.alerta_destinatarios;
CREATE POLICY "ad_all_admin" ON public.alerta_destinatarios FOR ALL TO authenticated
  USING (public.e_admin(auth.uid())) WITH CHECK (public.e_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count INTEGER; v_perfil text; v_invited public.convites%ROWTYPE;
BEGIN
  SELECT * INTO v_invited FROM public.convites
    WHERE email_convidado=NEW.email AND status='pendente' AND expira_em>now()
    ORDER BY criado_em DESC LIMIT 1;
  SELECT COUNT(*) INTO v_count FROM public.usuarios;
  IF v_count=0 THEN v_perfil:='SUPER_ADMIN';
  ELSIF v_invited.id IS NOT NULL THEN
    v_perfil:=v_invited.perfil_convidado;
    UPDATE public.convites SET status='aceito' WHERE id=v_invited.id;
  ELSE v_perfil:='tecnico_estacao'; END IF;

  INSERT INTO public.usuarios (id, nome_completo, email, perfil, google_id, ativo)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email, v_perfil, NEW.raw_user_meta_data->>'sub', true);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,
    CASE WHEN v_perfil IN ('admin_geral','SUPER_ADMIN') THEN 'admin'::public.app_role
         ELSE 'usuario'::public.app_role END
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
