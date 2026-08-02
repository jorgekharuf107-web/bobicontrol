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

  -- Só sobrescreve quando derivado de CD/ATM; preserva linhas informadas manualmente (permuta entre linhas)
  NEW.linha_origem_id := COALESCE(v_lo, NEW.linha_origem_id);
  NEW.linha_destino_id := COALESCE(v_ld, NEW.linha_destino_id);

  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo = 'Permuta' AND NEW.linha_origem_id IS NOT NULL AND NEW.linha_destino_id IS NOT NULL
       AND NEW.linha_origem_id <> NEW.linha_destino_id THEN
      NEW.status_aprovacao := COALESCE(NEW.status_aprovacao, 'pendente');
    ELSE
      NEW.status_aprovacao := COALESCE(NEW.status_aprovacao, 'aprovado');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;