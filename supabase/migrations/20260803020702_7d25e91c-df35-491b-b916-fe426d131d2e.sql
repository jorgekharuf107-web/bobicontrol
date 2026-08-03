ALTER TABLE public.agendamentos_entrega DROP CONSTRAINT IF EXISTS agendamentos_entrega_status_check;
ALTER TABLE public.agendamentos_entrega ADD CONSTRAINT agendamentos_entrega_status_check
  CHECK (status = ANY (ARRAY['Agendado'::text,'Em Rota'::text,'Entregue'::text,'Recebido'::text,'Cancelado'::text]));

ALTER TABLE public.agendamentos_entrega ADD COLUMN IF NOT EXISTS atm_id uuid REFERENCES public.atms(id) ON DELETE SET NULL;

CREATE OR REPLACE VIEW public.estoque_reservado AS
SELECT 'CD'::text AS local_tipo,
       a.estacao_cd_id AS local_id,
       ai.item_id,
       SUM(COALESCE(ai.qtd_caixas,0) * COALESCE(i.bobinas_por_caixa,1)
           + COALESCE(ai.qtd_bobina_100,0) + COALESCE(ai.qtd_bobina_50,0))::integer AS reservado
FROM public.agendamentos_entrega a
JOIN public.agendamento_itens ai ON ai.agendamento_id = a.id
LEFT JOIN public.itens i ON i.id = ai.item_id
WHERE a.status IN ('Agendado','Em Rota') AND ai.item_id IS NOT NULL
GROUP BY a.estacao_cd_id, ai.item_id;

CREATE OR REPLACE VIEW public.estoque_disponivel AS
SELECT COALESCE(s.local_tipo, r.local_tipo) AS local_tipo,
       COALESCE(s.local_id, r.local_id) AS local_id,
       COALESCE(s.item_id, r.item_id) AS item_id,
       COALESCE(s.saldo_total,0) AS saldo_total,
       COALESCE(r.reservado,0) AS reservado,
       (COALESCE(s.saldo_total,0) - COALESCE(r.reservado,0))::integer AS saldo_disponivel
FROM public.estoque_saldo s
FULL JOIN public.estoque_reservado r
  ON r.local_tipo = s.local_tipo AND r.local_id = s.local_id AND r.item_id = s.item_id;

GRANT SELECT ON public.estoque_reservado TO authenticated;
GRANT SELECT ON public.estoque_disponivel TO authenticated;
GRANT ALL ON public.estoque_reservado TO service_role;
GRANT ALL ON public.estoque_disponivel TO service_role;