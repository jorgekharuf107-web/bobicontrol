-- 1) Proteger app_password em email_config
ALTER TABLE public.email_config
  ADD COLUMN IF NOT EXISTS senha_definida boolean NOT NULL DEFAULT false;

UPDATE public.email_config SET senha_definida = (app_password IS NOT NULL AND app_password <> '');

CREATE OR REPLACE FUNCTION public.email_config_set_senha_flag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.senha_definida := (NEW.app_password IS NOT NULL AND NEW.app_password <> '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_config_senha_flag ON public.email_config;
CREATE TRIGGER trg_email_config_senha_flag
BEFORE INSERT OR UPDATE ON public.email_config
FOR EACH ROW EXECUTE FUNCTION public.email_config_set_senha_flag();

-- Revogar leitura da coluna de credencial (mantendo escrita para admins conforme RLS)
REVOKE SELECT ON public.email_config FROM anon, authenticated;
GRANT SELECT (id, sender_email, ativo, senha_definida, atualizado_em, atualizado_por)
  ON public.email_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.email_config TO authenticated;
GRANT ALL ON public.email_config TO service_role;

-- 2) SECURITY DEFINER: revogar execução pública/indevida
REVOKE ALL ON FUNCTION public.aplicar_saldo_estoque(text, uuid, uuid, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aprovar_movimentacao(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.movimentacao_atualiza_estoque() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.movimentacao_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.movimentacao_sync_aliases() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_config_set_senha_flag() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calcular_total_bobinas(integer, integer) FROM PUBLIC, anon;

-- Funções de verificação de perfil: somente usuários autenticados
REVOKE ALL ON FUNCTION public.e_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.e_dispatcher(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.e_gestor(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.e_operador(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.e_super_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin_or_super(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tem_funcao(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.usuario_ve_linha(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.e_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_dispatcher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_gestor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_operador(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_funcao(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_ve_linha(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_total_bobinas(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aprovar_movimentacao(uuid, boolean) TO authenticated;

-- 3) agendamentos_entrega: limitar PII do motorista a papéis de gestão e ao técnico da entrega
REVOKE SELECT ON public.agendamentos_entrega FROM anon;