CREATE OR REPLACE VIEW public.estoque_saldo
WITH (security_invoker = true) AS
WITH mov AS (
  SELECT m.destino_tipo::text AS local_tipo, m.destino_id AS local_id, m.item_id, COALESCE(m.qtd,0)::numeric AS delta
  FROM public.movimentacoes m
  WHERE m.destino_id IS NOT NULL AND m.destino_tipo IS NOT NULL AND m.item_id IS NOT NULL
  UNION ALL
  SELECT m.origem_tipo::text, m.origem_id, m.item_id, -COALESCE(m.qtd,0)::numeric
  FROM public.movimentacoes m
  WHERE m.origem_id IS NOT NULL AND m.origem_tipo IS NOT NULL AND m.item_id IS NOT NULL
)
SELECT local_tipo, local_id, item_id, COALESCE(SUM(delta),0)::int AS saldo_total
FROM mov
GROUP BY local_tipo, local_id, item_id;

GRANT SELECT ON public.estoque_saldo TO authenticated;
GRANT SELECT ON public.estoque_saldo TO service_role;