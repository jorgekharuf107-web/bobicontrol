
CREATE TABLE public.solicitacoes_reposicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atm_id text NOT NULL,
  tipo_bobina text NOT NULL,
  observacao text,
  status text NOT NULL DEFAULT 'pendente',
  solicitado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_reposicao TO authenticated;
GRANT ALL ON public.solicitacoes_reposicao TO service_role;
ALTER TABLE public.solicitacoes_reposicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados podem inserir solicitacoes"
  ON public.solicitacoes_reposicao FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = solicitado_por OR solicitado_por IS NULL);
CREATE POLICY "Autenticados podem ver solicitacoes"
  ON public.solicitacoes_reposicao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin e Dispatcher podem atualizar"
  ON public.solicitacoes_reposicao FOR UPDATE TO authenticated
  USING (public.e_admin(auth.uid()) OR public.e_dispatcher(auth.uid()));
CREATE POLICY "Admin pode excluir"
  ON public.solicitacoes_reposicao FOR DELETE TO authenticated
  USING (public.e_admin(auth.uid()));
