
-- Add Permuta to enum
ALTER TYPE public.movimentacao_tipo ADD VALUE IF NOT EXISTS 'Permuta';

-- Add linha columns for RLS scoping
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS linha_origem_id uuid,
  ADD COLUMN IF NOT EXISTS linha_destino_id uuid,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;

-- Trigger to derive linha from origem/destino and gate permuta approval
CREATE OR REPLACE FUNCTION public.movimentacao_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lo uuid; v_ld uuid;
BEGIN
  IF NEW.origem_tipo = 'ATM' AND NEW.origem_id IS NOT NULL THEN
    SELECT linha_id INTO v_lo FROM public.atms WHERE id = NEW.origem_id;
  ELSIF NEW.origem_tipo = 'CD' AND NEW.origem_id IS NOT NULL THEN
    SELECT linha_id INTO v_lo FROM public.cds WHERE id = NEW.origem_id;
  END IF;
  IF NEW.destino_tipo = 'ATM' AND NEW.destino_id IS NOT NULL THEN
    SELECT linha_id INTO v_ld FROM public.atms WHERE id = NEW.destino_id;
  ELSIF NEW.destino_tipo = 'CD' AND NEW.destino_id IS NOT NULL THEN
    SELECT linha_id INTO v_ld FROM public.cds WHERE id = NEW.destino_id;
  END IF;
  NEW.linha_origem_id := v_lo;
  NEW.linha_destino_id := v_ld;

  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo = 'Permuta' AND v_lo IS NOT NULL AND v_ld IS NOT NULL AND v_lo <> v_ld THEN
      NEW.status_aprovacao := COALESCE(NEW.status_aprovacao, 'pendente');
    ELSE
      NEW.status_aprovacao := COALESCE(NEW.status_aprovacao, 'aprovado');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_movimentacao_before_write ON public.movimentacoes;
CREATE TRIGGER trg_movimentacao_before_write
  BEFORE INSERT OR UPDATE ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.movimentacao_before_write();

-- Backfill existing rows
UPDATE public.movimentacoes m SET
  linha_origem_id = CASE m.origem_tipo
    WHEN 'ATM' THEN (SELECT linha_id FROM public.atms WHERE id = m.origem_id)
    WHEN 'CD' THEN (SELECT linha_id FROM public.cds WHERE id = m.origem_id)
  END,
  linha_destino_id = CASE m.destino_tipo
    WHEN 'ATM' THEN (SELECT linha_id FROM public.atms WHERE id = m.destino_id)
    WHEN 'CD' THEN (SELECT linha_id FROM public.cds WHERE id = m.destino_id)
  END
WHERE linha_origem_id IS NULL AND linha_destino_id IS NULL;

-- Approval RPC
CREATE OR REPLACE FUNCTION public.aprovar_movimentacao(_id uuid, _aprovar boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.e_admin(auth.uid()) OR public.e_dispatcher(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão para aprovar permutas';
  END IF;
  UPDATE public.movimentacoes
     SET status_aprovacao = CASE WHEN _aprovar THEN 'aprovado' ELSE 'rejeitado' END,
         aprovado_por = auth.uid(),
         aprovado_em = now()
   WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprovar_movimentacao(uuid, boolean) TO authenticated;

-- Tighten RLS: per-linha SELECT
DROP POLICY IF EXISTS "Todos veem atms" ON public.atms;
DROP POLICY IF EXISTS "atms_select" ON public.atms;
CREATE POLICY "atms_select_por_linha" ON public.atms
  FOR SELECT USING (linha_id IS NULL OR public.usuario_ve_linha(auth.uid(), linha_id));

DROP POLICY IF EXISTS "Todos veem cds" ON public.cds;
DROP POLICY IF EXISTS "cds_select" ON public.cds;
CREATE POLICY "cds_select_por_linha" ON public.cds
  FOR SELECT USING (linha_id IS NULL OR public.usuario_ve_linha(auth.uid(), linha_id));

DROP POLICY IF EXISTS "Todos veem movimentacoes" ON public.movimentacoes;
DROP POLICY IF EXISTS "mov select" ON public.movimentacoes;
CREATE POLICY "mov_select_por_linha" ON public.movimentacoes
  FOR SELECT USING (
    public.e_admin(auth.uid())
    OR public.e_dispatcher(auth.uid())
    OR public.e_gestor(auth.uid())
    OR (linha_origem_id IS NOT NULL AND public.usuario_ve_linha(auth.uid(), linha_origem_id))
    OR (linha_destino_id IS NOT NULL AND public.usuario_ve_linha(auth.uid(), linha_destino_id))
  );
