ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS motorista1_id uuid REFERENCES public.motoristas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motorista2_id uuid REFERENCES public.motoristas(id) ON DELETE SET NULL;

ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS celular text;