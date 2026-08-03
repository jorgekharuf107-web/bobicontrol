import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePendingMovimentacoes } from "@/lib/offline-queue";

export type SaldoRow = {
  local_tipo: "CD" | "ATM" | string;
  local_id: string;
  item_id: string;
  saldo_total: number;
};

/**
 * Saldo real por local/item, calculado 100% pela visão `estoque_saldo`
 * (soma de todas as entradas menos as saídas registradas em movimentações).
 * Nenhum valor é fixo ou digitado manualmente.
 */
export function useEstoqueSaldo() {
  return useQuery({
    queryKey: ["estoque-saldo"],
    staleTime: 0,
    queryFn: async () => {
      const { data } = await (supabase as any).from("estoque_saldo").select("*");
      return (data ?? []) as SaldoRow[];
    },
  });
}

/** Aplica sobre o saldo do banco os lançamentos offline ainda não sincronizados. */
export function useSaldoReal() {
  const { data: saldos = [] } = useEstoqueSaldo();
  const pendentes = usePendingMovimentacoes();

  return useMemo(() => {
    const map = new Map<string, number>();
    const key = (t: string, l: string, i: string) => `${t}|${l}|${i}`;
    saldos.forEach((s) => map.set(key(s.local_tipo, s.local_id, s.item_id), Number(s.saldo_total ?? 0)));
    pendentes.forEach((p: any) => {
      if (!p.item_id) return;
      if (p.destino_tipo && p.destino_id) {
        const k = key(p.destino_tipo, p.destino_id, p.item_id);
        map.set(k, (map.get(k) ?? 0) + (p.qtd ?? 0));
      }
      if (p.origem_tipo && p.origem_id) {
        const k = key(p.origem_tipo, p.origem_id, p.item_id);
        map.set(k, (map.get(k) ?? 0) - (p.qtd ?? 0));
      }
    });

    const rows = Array.from(map.entries()).map(([k, saldo_total]) => {
      const [local_tipo, local_id, item_id] = k.split("|");
      return { local_tipo, local_id, item_id, saldo_total } as SaldoRow;
    });

    const porItem = (itemId: string) =>
      rows.filter((r) => r.item_id === itemId).reduce((a, r) => a + r.saldo_total, 0);
    const porLocal = (localTipo: string, localId: string, itemId?: string) =>
      rows
        .filter((r) => r.local_tipo === localTipo && r.local_id === localId && (!itemId || r.item_id === itemId))
        .reduce((a, r) => a + r.saldo_total, 0);

    return { rows, porItem, porLocal };
  }, [saldos, pendentes]);
}

/** Código de cor do saldo: 0 = vermelho, 1 = amarelo, > 1 = verde. */
export function corSaldo(saldo: number) {
  if (saldo <= 0) return "text-red-600";
  if (saldo === 1) return "text-yellow-600";
  return "text-green-600";
}

export function badgeSaldo(saldo: number) {
  if (saldo <= 0) return "bg-red-100 text-red-700";
  if (saldo === 1) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-700";
}

/** Somente usuários com papel de Técnico (tecnico_estacao) e ativos. */
export function useTecnicos() {
  return useQuery({
    queryKey: ["tecnicos-role"],
    queryFn: async () =>
      (await supabase
        .from("usuarios")
        .select("id, nome_completo, email")
        .eq("perfil", "tecnico_estacao")
        .eq("ativo", true)
        .order("nome_completo")).data ?? [],
  });
}
