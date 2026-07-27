-- 1. agendamento_itens: reuse authorization of parent
DROP POLICY IF EXISTS agendamento_itens_select ON public.agendamento_itens;
DROP POLICY IF EXISTS agendamento_itens_write ON public.agendamento_itens;

CREATE POLICY agendamento_itens_select ON public.agendamento_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agendamentos_entrega a
    WHERE a.id = agendamento_itens.agendamento_id
      AND (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid())
           OR public.e_dispatcher(auth.uid()) OR a.tecnico_id = auth.uid())
  ));

CREATE POLICY agendamento_itens_write ON public.agendamento_itens
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agendamentos_entrega a
    WHERE a.id = agendamento_itens.agendamento_id
      AND (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid())
           OR public.e_dispatcher(auth.uid()) OR a.tecnico_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agendamentos_entrega a
    WHERE a.id = agendamento_itens.agendamento_id
      AND (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid())
           OR public.e_dispatcher(auth.uid()) OR a.tecnico_id = auth.uid())
  ));

-- 2. configuracao_alertas: remove USING(true) select policies
DROP POLICY IF EXISTS "Todos veem alertas" ON public.configuracao_alertas;
DROP POLICY IF EXISTS alertas_select_auth ON public.configuracao_alertas;

CREATE POLICY alertas_select_roles ON public.configuracao_alertas
  FOR SELECT TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_gestor(auth.uid()) OR public.e_operador(auth.uid()));

-- 3. SECURITY DEFINER functions not required by RLS: block direct client execution
REVOKE EXECUTE ON FUNCTION public.aprovar_movimentacao(uuid, boolean) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.e_super_admin(uuid) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.aprovar_movimentacao(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.e_super_admin(uuid) TO service_role;