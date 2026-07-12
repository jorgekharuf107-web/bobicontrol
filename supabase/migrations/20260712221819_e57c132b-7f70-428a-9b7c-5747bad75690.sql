CREATE TABLE IF NOT EXISTS public.historico_saldos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('atm','cd')),
  id_item uuid NOT NULL,
  saldo integer NOT NULL DEFAULT 0,
  data_snapshot date NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS historico_saldos_lookup_idx
  ON public.historico_saldos (data_snapshot, tipo, id_item);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_saldos TO authenticated;
GRANT ALL ON public.historico_saldos TO service_role;

ALTER TABLE public.historico_saldos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico_saldos admin select" ON public.historico_saldos
  FOR SELECT TO authenticated USING (public.e_admin(auth.uid()));
CREATE POLICY "historico_saldos admin write" ON public.historico_saldos
  FOR ALL TO authenticated USING (public.e_admin(auth.uid())) WITH CHECK (public.e_admin(auth.uid()));
