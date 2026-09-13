ALTER TABLE public.atms
  ADD COLUMN IF NOT EXISTS topdesk text,
  ADD COLUMN IF NOT EXISTS empresa text,
  ADD COLUMN IF NOT EXISTS linha text,
  ADD COLUMN IF NOT EXISTS produtos text,
  ADD COLUMN IF NOT EXISTS transaciona text,
  ADD COLUMN IF NOT EXISTS numero_de_serie text,
  ADD COLUMN IF NOT EXISTS patrimonio text,
  ADD COLUMN IF NOT EXISTS observacao text;

CREATE UNIQUE INDEX IF NOT EXISTS atms_id_atm_key ON public.atms (id_atm);