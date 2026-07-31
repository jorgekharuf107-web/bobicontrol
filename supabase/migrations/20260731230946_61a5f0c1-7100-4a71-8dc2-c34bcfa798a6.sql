ALTER TABLE public.atms DROP COLUMN IF EXISTS fabricante;
ALTER TABLE public.atms ADD COLUMN IF NOT EXISTS usuario_atm text;