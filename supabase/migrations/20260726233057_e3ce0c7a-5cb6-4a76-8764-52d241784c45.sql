DROP POLICY IF EXISTS "mov insert" ON public.movimentacoes;
DROP POLICY IF EXISTS auditoria_insert_auth ON public.auditoria;
CREATE POLICY auditoria_insert_auth ON public.auditoria FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() OR public.is_admin_or_super(auth.uid()));