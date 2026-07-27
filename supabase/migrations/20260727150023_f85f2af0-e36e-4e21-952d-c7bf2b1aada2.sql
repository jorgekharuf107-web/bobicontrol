ALTER TABLE public.itens
  ADD COLUMN IF NOT EXISTS bobinas_por_caixa integer NOT NULL DEFAULT 6;

ALTER TABLE public.itens ALTER COLUMN codigo DROP NOT NULL;
ALTER TABLE public.itens ALTER COLUMN unidade SET DEFAULT 'Caixa'::public.item_unidade;