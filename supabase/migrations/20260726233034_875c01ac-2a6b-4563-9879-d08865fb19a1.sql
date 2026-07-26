-- 1. search_path fixo
CREATE OR REPLACE FUNCTION public.calcular_total_bobinas(_caixas integer, _avulsas integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(_caixas,0)*6 + COALESCE(_avulsas,0)
$$;

-- 2. Revogar EXECUTE de anon em todas as funções públicas; e de authenticated nas internas
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.movimentacao_before_write() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tem_funcao(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;

-- Funções necessárias em RLS / RPC continuam disponíveis a usuários autenticados
GRANT EXECUTE ON FUNCTION public.e_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_gestor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_operador(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_dispatcher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_ve_linha(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aprovar_movimentacao(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_total_bobinas(integer, integer) TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3. Convites: remover leitura anônima irrestrita
DROP POLICY IF EXISTS convites_anon_select_by_token ON public.convites;
REVOKE ALL ON public.convites FROM anon;

-- 4. Fornecedores / Motoristas
DROP POLICY IF EXISTS fornecedores_select ON public.fornecedores;
DROP POLICY IF EXISTS fornecedores_write ON public.fornecedores;
CREATE POLICY fornecedores_select ON public.fornecedores FOR SELECT TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_dispatcher(auth.uid()));
CREATE POLICY fornecedores_write ON public.fornecedores FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()))
  WITH CHECK (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()));

DROP POLICY IF EXISTS motoristas_select ON public.motoristas;
DROP POLICY IF EXISTS motoristas_write ON public.motoristas;
CREATE POLICY motoristas_select ON public.motoristas FOR SELECT TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_dispatcher(auth.uid()));
CREATE POLICY motoristas_write ON public.motoristas FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()))
  WITH CHECK (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()));

-- 5. Linhas / ATMs / CDs: remover escrita aberta
DROP POLICY IF EXISTS linhas_write ON public.linhas;
CREATE POLICY linhas_write ON public.linhas FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()))
  WITH CHECK (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()));
DROP POLICY IF EXISTS atms_write ON public.atms;
DROP POLICY IF EXISTS cds_write ON public.cds;

-- Restringir políticas de leitura de atms/cds/movimentacoes ao papel authenticated
DROP POLICY IF EXISTS atms_select_por_linha ON public.atms;
CREATE POLICY atms_select_por_linha ON public.atms FOR SELECT TO authenticated
  USING (linha_id IS NULL OR public.usuario_ve_linha(auth.uid(), linha_id));
DROP POLICY IF EXISTS cds_select_por_linha ON public.cds;
CREATE POLICY cds_select_por_linha ON public.cds FOR SELECT TO authenticated
  USING (linha_id IS NULL OR public.usuario_ve_linha(auth.uid(), linha_id));
DROP POLICY IF EXISTS mov_select_por_linha ON public.movimentacoes;
CREATE POLICY mov_select_por_linha ON public.movimentacoes FOR SELECT TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_dispatcher(auth.uid()) OR public.e_gestor(auth.uid())
    OR (linha_origem_id IS NOT NULL AND public.usuario_ve_linha(auth.uid(), linha_origem_id))
    OR (linha_destino_id IS NOT NULL AND public.usuario_ve_linha(auth.uid(), linha_destino_id)));

-- 6. Agendamentos
DROP POLICY IF EXISTS "auth read agendamentos" ON public.agendamentos_entrega;
DROP POLICY IF EXISTS "auth write agendamentos" ON public.agendamentos_entrega;
CREATE POLICY agendamentos_select ON public.agendamentos_entrega FOR SELECT TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_dispatcher(auth.uid())
    OR tecnico_id = auth.uid());
CREATE POLICY agendamentos_write ON public.agendamentos_entrega FOR ALL TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_dispatcher(auth.uid())
    OR tecnico_id = auth.uid())
  WITH CHECK (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_dispatcher(auth.uid())
    OR tecnico_id = auth.uid());

DROP POLICY IF EXISTS "auth read agendamento_itens" ON public.agendamento_itens;
DROP POLICY IF EXISTS "auth write agendamento_itens" ON public.agendamento_itens;
CREATE POLICY agendamento_itens_select ON public.agendamento_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agendamentos_entrega a WHERE a.id = agendamento_id));
CREATE POLICY agendamento_itens_write ON public.agendamento_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agendamentos_entrega a WHERE a.id = agendamento_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agendamentos_entrega a WHERE a.id = agendamento_id));

-- 7. Destinatários de alertas
DROP POLICY IF EXISTS ad_select ON public.alerta_destinatarios;
CREATE POLICY ad_select ON public.alerta_destinatarios FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.e_admin(auth.uid()));

-- 8. Auditoria
DROP POLICY IF EXISTS "Todos veem auditoria" ON public.auditoria;

-- 9. Solicitações de reposição
DROP POLICY IF EXISTS "Autenticados podem ver solicitacoes" ON public.solicitacoes_reposicao;
CREATE POLICY solicitacoes_select ON public.solicitacoes_reposicao FOR SELECT TO authenticated
  USING (solicitado_por = auth.uid() OR public.e_admin(auth.uid()) OR public.e_gestor(auth.uid())
    OR public.e_dispatcher(auth.uid()));