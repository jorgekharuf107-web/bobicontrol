
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS qtd_caixas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_bobina_100 integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qtd_bobina_50 integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='Recebimento' AND enumtypid='public.movimentacao_tipo'::regtype) THEN
    ALTER TYPE public.movimentacao_tipo ADD VALUE 'Recebimento';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='Retirada' AND enumtypid='public.movimentacao_tipo'::regtype) THEN
    ALTER TYPE public.movimentacao_tipo ADD VALUE 'Retirada';
  END IF;
END $$;

DROP POLICY IF EXISTS "mov_select_scope" ON public.movimentacoes;
CREATE POLICY "mov_select_scope" ON public.movimentacoes
  FOR SELECT TO authenticated
  USING (
    public.e_admin(auth.uid())
    OR public.e_dispatcher(auth.uid())
    OR tecnico_id = auth.uid()
  );

DROP POLICY IF EXISTS "mov_insert_own" ON public.movimentacoes;
CREATE POLICY "mov_insert_own" ON public.movimentacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    tecnico_id = auth.uid()
    OR public.e_admin(auth.uid())
    OR public.e_dispatcher(auth.uid())
  );
