ALTER TABLE public.agendamentos_entrega
  ADD COLUMN IF NOT EXISTS nome_motorista2 text,
  ADD COLUMN IF NOT EXISTS celular_motorista2 text;