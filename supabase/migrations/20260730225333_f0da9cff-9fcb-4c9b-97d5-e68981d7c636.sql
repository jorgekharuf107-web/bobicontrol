-- 1) Campos solicitados (sincronizados automaticamente com as colunas existentes)
ALTER TABLE public.movimentacoes
  ADD COLUMN IF NOT EXISTS tipo_mov text,
  ADD COLUMN IF NOT EXISTS data_hora timestamptz,
  ADD COLUMN IF NOT EXISTS id_item uuid,
  ADD COLUMN IF NOT EXISTS qtd_caixa integer,
  ADD COLUMN IF NOT EXISTS qtd_avulsa_cheia integer,
  ADD COLUMN IF NOT EXISTS qtd_avulsa_parcial integer;

CREATE OR REPLACE FUNCTION public.movimentacao_sync_aliases()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.tipo_mov := NEW.tipo::text;
  NEW.data_hora := NEW.data;
  NEW.id_item := NEW.item_id;
  NEW.qtd_caixa := NEW.qtd_caixas;
  NEW.qtd_avulsa_cheia := NEW.qtd_bobina_100;
  NEW.qtd_avulsa_parcial := NEW.qtd_bobina_50;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.movimentacao_sync_aliases() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_movimentacao_sync_aliases ON public.movimentacoes;
CREATE TRIGGER trg_movimentacao_sync_aliases
BEFORE INSERT OR UPDATE ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.movimentacao_sync_aliases();

UPDATE public.movimentacoes SET tipo_mov = tipo::text;

-- 2) Tabela de saldo de estoque
CREATE TABLE IF NOT EXISTS public.estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_tipo text NOT NULL CHECK (local_tipo IN ('CD','ATM','Linha')),
  local_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.itens(id) ON DELETE CASCADE,
  qtd_caixas integer NOT NULL DEFAULT 0,
  qtd_bobina_100 integer NOT NULL DEFAULT 0,
  qtd_bobina_50 integer NOT NULL DEFAULT 0,
  total_bobinas integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (local_tipo, local_id, item_id)
);

GRANT SELECT ON public.estoque TO authenticated;
GRANT ALL ON public.estoque TO service_role;

ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estoque_select_authenticated" ON public.estoque;
CREATE POLICY "estoque_select_authenticated" ON public.estoque
  FOR SELECT TO authenticated USING (true);

-- 3) Aplicação automática do saldo
CREATE OR REPLACE FUNCTION public.aplicar_saldo_estoque(
  _local_tipo text, _local_id uuid, _item_id uuid,
  _caixas integer, _b100 integer, _b50 integer, _sinal integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _por_caixa integer;
BEGIN
  IF _local_tipo IS NULL OR _local_id IS NULL OR _item_id IS NULL THEN
    RETURN;
  END IF;
  SELECT COALESCE(bobinas_por_caixa, 6) INTO _por_caixa FROM public.itens WHERE id = _item_id;
  _por_caixa := COALESCE(_por_caixa, 6);

  INSERT INTO public.estoque (local_tipo, local_id, item_id, qtd_caixas, qtd_bobina_100, qtd_bobina_50, total_bobinas)
  VALUES (
    _local_tipo, _local_id, _item_id,
    _sinal * COALESCE(_caixas,0),
    _sinal * COALESCE(_b100,0),
    _sinal * COALESCE(_b50,0),
    _sinal * (COALESCE(_caixas,0) * _por_caixa + COALESCE(_b100,0) + COALESCE(_b50,0))
  )
  ON CONFLICT (local_tipo, local_id, item_id) DO UPDATE SET
    qtd_caixas = public.estoque.qtd_caixas + EXCLUDED.qtd_caixas,
    qtd_bobina_100 = public.estoque.qtd_bobina_100 + EXCLUDED.qtd_bobina_100,
    qtd_bobina_50 = public.estoque.qtd_bobina_50 + EXCLUDED.qtd_bobina_50,
    total_bobinas = public.estoque.total_bobinas + EXCLUDED.total_bobinas,
    atualizado_em = now();
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_saldo_estoque(text, uuid, uuid, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.movimentacao_atualiza_estoque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ot text; _oi uuid; _dt text; _di uuid;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    _ot := CASE WHEN OLD.linha_origem_id IS NOT NULL THEN 'Linha' ELSE OLD.origem_tipo::text END;
    _oi := COALESCE(OLD.linha_origem_id, OLD.origem_id);
    _dt := CASE WHEN OLD.linha_destino_id IS NOT NULL THEN 'Linha' ELSE OLD.destino_tipo::text END;
    _di := COALESCE(OLD.linha_destino_id, OLD.destino_id);
    PERFORM public.aplicar_saldo_estoque(_ot, _oi, OLD.item_id, OLD.qtd_caixas, OLD.qtd_bobina_100, OLD.qtd_bobina_50, 1);
    PERFORM public.aplicar_saldo_estoque(_dt, _di, OLD.item_id, OLD.qtd_caixas, OLD.qtd_bobina_100, OLD.qtd_bobina_50, -1);
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    _ot := CASE WHEN NEW.linha_origem_id IS NOT NULL THEN 'Linha' ELSE NEW.origem_tipo::text END;
    _oi := COALESCE(NEW.linha_origem_id, NEW.origem_id);
    _dt := CASE WHEN NEW.linha_destino_id IS NOT NULL THEN 'Linha' ELSE NEW.destino_tipo::text END;
    _di := COALESCE(NEW.linha_destino_id, NEW.destino_id);
    PERFORM public.aplicar_saldo_estoque(_ot, _oi, NEW.item_id, NEW.qtd_caixas, NEW.qtd_bobina_100, NEW.qtd_bobina_50, -1);
    PERFORM public.aplicar_saldo_estoque(_dt, _di, NEW.item_id, NEW.qtd_caixas, NEW.qtd_bobina_100, NEW.qtd_bobina_50, 1);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_movimentacao_estoque ON public.movimentacoes;
CREATE TRIGGER trg_movimentacao_estoque
AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.movimentacao_atualiza_estoque();

-- 4) Recalcular saldos com base nas movimentações existentes
TRUNCATE public.estoque;
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM public.movimentacoes LOOP
    PERFORM public.aplicar_saldo_estoque(
      CASE WHEN r.linha_origem_id IS NOT NULL THEN 'Linha' ELSE r.origem_tipo::text END,
      COALESCE(r.linha_origem_id, r.origem_id), r.item_id,
      r.qtd_caixas, r.qtd_bobina_100, r.qtd_bobina_50, -1);
    PERFORM public.aplicar_saldo_estoque(
      CASE WHEN r.linha_destino_id IS NOT NULL THEN 'Linha' ELSE r.destino_tipo::text END,
      COALESCE(r.linha_destino_id, r.destino_id), r.item_id,
      r.qtd_caixas, r.qtd_bobina_100, r.qtd_bobina_50, 1);
  END LOOP;
END;
$$;