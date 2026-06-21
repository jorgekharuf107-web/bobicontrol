
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'usuario');
CREATE TYPE public.user_perfil AS ENUM ('Usuário', 'Administrador', 'SUPER ADMIN');
CREATE TYPE public.tipo_contato_motorista AS ENUM ('motorista1', 'motorista2');
CREATE TYPE public.status_geral AS ENUM ('ativo', 'inativo');
CREATE TYPE public.status_operacional AS ENUM ('operacional', 'manutencao', 'desativado');
CREATE TYPE public.convite_status AS ENUM ('pendente', 'aceito', 'expirado');

-- ============ USUARIOS ============
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  perfil public.user_perfil NOT NULL DEFAULT 'Usuário',
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now(),
  google_id TEXT,
  microsoft_id TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- ============ USER_ROLES (segurança) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  )
$$;

-- ============ LINHAS ============
CREATE TABLE public.linhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor_hex TEXT NOT NULL DEFAULT '#3b82f6',
  linha_ativa_sim_nao BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linhas TO authenticated;
GRANT ALL ON public.linhas TO service_role;
ALTER TABLE public.linhas ENABLE ROW LEVEL SECURITY;

-- ============ CDS ============
CREATE TABLE public.cds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_cd TEXT NOT NULL,
  estacao TEXT,
  linha_id UUID REFERENCES public.linhas(id) ON DELETE SET NULL,
  capacidade INTEGER NOT NULL DEFAULT 0,
  nivel_minimo INTEGER NOT NULL DEFAULT 0,
  status public.status_geral NOT NULL DEFAULT 'ativo',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cds TO authenticated;
GRANT ALL ON public.cds TO service_role;
ALTER TABLE public.cds ENABLE ROW LEVEL SECURITY;

-- ============ ATMS ============
CREATE TABLE public.atms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_atm TEXT NOT NULL,
  modelo TEXT,
  estacao TEXT,
  localizacao_detalhada TEXT,
  capacidade_bobinas INTEGER NOT NULL DEFAULT 0,
  nivel_minimo INTEGER NOT NULL DEFAULT 0,
  status_operacional public.status_operacional NOT NULL DEFAULT 'operacional',
  atm_ativo_sim_nao BOOLEAN NOT NULL DEFAULT TRUE,
  cd_id UUID REFERENCES public.cds(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atms TO authenticated;
GRANT ALL ON public.atms TO service_role;
ALTER TABLE public.atms ENABLE ROW LEVEL SECURITY;

-- ============ FORNECEDORES ============
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  contato_principal TEXT,
  status public.status_geral NOT NULL DEFAULT 'ativo',
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  bairro TEXT,
  cidade_endereco TEXT,
  estado_uf TEXT,
  cep TEXT,
  fornecedor_ativo_sim_nao BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- ============ MOTORISTAS ============
CREATE TABLE public.motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  cpf TEXT,
  celular TEXT,
  email TEXT,
  tipo_contato public.tipo_contato_motorista NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fornecedor_id, tipo_contato)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motoristas TO authenticated;
GRANT ALL ON public.motoristas TO service_role;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

-- ============ CONVITES ============
CREATE TABLE public.convites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_convidado TEXT NOT NULL,
  perfil_convidado public.user_perfil NOT NULL DEFAULT 'Usuário',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status public.convite_status NOT NULL DEFAULT 'pendente',
  convidado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.convites TO authenticated;
GRANT SELECT ON public.convites TO anon;
GRANT ALL ON public.convites TO service_role;
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

-- ============ CONFIGURACAO ALERTAS ============
CREATE TABLE public.configuracao_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_configuracao TEXT NOT NULL,
  tipo_alerta TEXT NOT NULL,
  nivel_alerta_percentual INTEGER NOT NULL DEFAULT 20,
  frequencia_envio_horas INTEGER NOT NULL DEFAULT 24,
  destinatarios_email TEXT[] NOT NULL DEFAULT '{}',
  mensagem_personalizada TEXT,
  configuracao_ativa BOOLEAN NOT NULL DEFAULT TRUE,
  enviar_por_email BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracao_alertas TO authenticated;
GRANT ALL ON public.configuracao_alertas TO service_role;
ALTER TABLE public.configuracao_alertas ENABLE ROW LEVEL SECURITY;

-- ============ AUDITORIA ============
CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  tabela TEXT NOT NULL,
  registro_id TEXT,
  dados_antes JSONB,
  dados_depois JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
-- usuarios: todo autenticado lê; só admin/super edita; usuário edita o próprio nome
CREATE POLICY "usuarios_select_all_auth" ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_update_self" ON public.usuarios FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "usuarios_admin_all" ON public.usuarios FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- user_roles: select próprio; admin gerencia
CREATE POLICY "user_roles_select_self" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_super(auth.uid()));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- linhas/cds/atms/fornecedores/motoristas: leitura para autenticados; escrita autenticada
CREATE POLICY "linhas_select" ON public.linhas FOR SELECT TO authenticated USING (true);
CREATE POLICY "linhas_write" ON public.linhas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "cds_select" ON public.cds FOR SELECT TO authenticated USING (true);
CREATE POLICY "cds_write" ON public.cds FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "atms_select" ON public.atms FOR SELECT TO authenticated USING (true);
CREATE POLICY "atms_write" ON public.atms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "fornecedores_select" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "fornecedores_write" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "motoristas_select" ON public.motoristas FOR SELECT TO authenticated USING (true);
CREATE POLICY "motoristas_write" ON public.motoristas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- convites: admin/super gerencia; anon pode SELECT por token (para tela aceitar)
CREATE POLICY "convites_admin_all" ON public.convites FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "convites_anon_select_by_token" ON public.convites FOR SELECT TO anon USING (true);

-- alertas: admin/super
CREATE POLICY "alertas_admin_all" ON public.configuracao_alertas FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "alertas_select_auth" ON public.configuracao_alertas FOR SELECT TO authenticated USING (true);

-- auditoria: admin/super lê; autenticado insere
CREATE POLICY "auditoria_select_admin" ON public.auditoria FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "auditoria_insert_auth" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);

-- ============ TRIGGER: auto-criar usuario + atribuir role ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_perfil public.user_perfil;
  v_role public.app_role;
  v_invited public.convites%ROWTYPE;
BEGIN
  -- Verifica se existe convite pendente para este email
  SELECT * INTO v_invited FROM public.convites
    WHERE email_convidado = NEW.email AND status = 'pendente' AND expira_em > now()
    ORDER BY criado_em DESC LIMIT 1;

  SELECT COUNT(*) INTO v_count FROM public.usuarios;

  IF v_count = 0 THEN
    v_perfil := 'SUPER ADMIN';
    v_role := 'super_admin';
  ELSIF v_invited.id IS NOT NULL THEN
    v_perfil := v_invited.perfil_convidado;
    v_role := CASE v_invited.perfil_convidado
      WHEN 'SUPER ADMIN' THEN 'super_admin'::public.app_role
      WHEN 'Administrador' THEN 'admin'::public.app_role
      ELSE 'usuario'::public.app_role
    END;
    UPDATE public.convites SET status = 'aceito' WHERE id = v_invited.id;
  ELSE
    v_perfil := 'Usuário';
    v_role := 'usuario';
  END IF;

  INSERT INTO public.usuarios (id, nome_completo, email, perfil, google_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_perfil,
    NEW.raw_user_meta_data->>'sub'
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
