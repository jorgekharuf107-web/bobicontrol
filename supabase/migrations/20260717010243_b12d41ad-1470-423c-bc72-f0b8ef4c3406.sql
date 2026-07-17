
CREATE TABLE public.agendamentos_entrega (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estacao_cd_id UUID NOT NULL REFERENCES public.cds(id) ON DELETE RESTRICT,
  data_hora_entrega TIMESTAMPTZ NOT NULL,
  nome_motorista TEXT NOT NULL,
  celular_motorista TEXT,
  transportadora TEXT,
  numero_nf TEXT,
  tecnico_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Agendado' CHECK (status IN ('Agendado','Recebido','Cancelado')),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos_entrega TO authenticated;
GRANT ALL ON public.agendamentos_entrega TO service_role;
ALTER TABLE public.agendamentos_entrega ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read agendamentos" ON public.agendamentos_entrega FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write agendamentos" ON public.agendamentos_entrega FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.agendamento_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos_entrega(id) ON DELETE CASCADE,
  tipo_bobina TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamento_itens TO authenticated;
GRANT ALL ON public.agendamento_itens TO service_role;
ALTER TABLE public.agendamento_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read agendamento_itens" ON public.agendamento_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write agendamento_itens" ON public.agendamento_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_agendamentos_data ON public.agendamentos_entrega(data_hora_entrega);
CREATE INDEX idx_agendamentos_status ON public.agendamentos_entrega(status);
CREATE INDEX idx_agendamento_itens_agid ON public.agendamento_itens(agendamento_id);
