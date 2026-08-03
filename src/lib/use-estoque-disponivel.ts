import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DisponivelRow = {
  local_tipo: string;
  local_id: string;
  item_id: string;
  saldo_total: number;
  reservado: number;
  saldo_disponivel: number;
};

/**
 * Saldo disponível por local/item = QTD REAL TOTAL − RESERVADO
 * (reservas vêm de agendamentos com status Agendado ou Em Rota).
 */
export function useEstoqueDisponivel() {
  const { data = [] } = useQuery({
    queryKey: ["estoque-disponivel"],
    staleTime: 0,
    queryFn: async () => {
      const { data } = await (supabase as any).from("estoque_disponivel").select("*");
      return (data ?? []) as DisponivelRow[];
    },
  });

  return useMemo(() => {
    const key = (t: string, l: string, i: string) => `${t}|${l}|${i}`;
    const map = new Map<string, DisponivelRow>();
    data.forEach((r) => map.set(key(r.local_tipo, r.local_id, r.item_id), r));

    const get = (localTipo: string, localId: string, itemId: string) =>
      map.get(key(localTipo, localId, itemId)) ?? {
        local_tipo: localTipo, local_id: localId, item_id: itemId,
        saldo_total: 0, reservado: 0, saldo_disponivel: 0,
      };

    return {
      rows: data,
      /** Saldo disponível (real − reservado) */
      disponivel: (localTipo: string, localId: string, itemId: string) =>
        Number(get(localTipo, localId, itemId).saldo_disponivel ?? 0),
      reservado: (localTipo: string, localId: string, itemId: string) =>
        Number(get(localTipo, localId, itemId).reservado ?? 0),
      real: (localTipo: string, localId: string, itemId: string) =>
        Number(get(localTipo, localId, itemId).saldo_total ?? 0),
    };
  }, [data]);
}
