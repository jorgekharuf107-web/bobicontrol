import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/controle-estoque")({
  component: ControleEstoque,
});

function ControleEstoque() {
  const { data: movs = [] } = useQuery({
    queryKey: ["movs-all"],
    queryFn: async () => (await supabase.from("movimentacoes").select("*, itens(nome), usuarios(nome_completo)").order("data", { ascending: false })).data ?? [],
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-bold">Controle de Estoque</h1>
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="excel-table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th>Qtd</th><th>Origem</th><th>Destino</th><th>Técnico</th></tr></thead>
          <tbody>
            {movs.length === 0 && <tr><td colSpan={7} className="text-center py-8 font-bold text-muted-foreground">Nenhuma movimentação registrada</td></tr>}
            {movs.map((m: any) => (
              <tr key={m.id}>
                <td>{new Date(m.data).toLocaleString("pt-BR")}</td>
                <td>{m.tipo}</td><td>{m.itens?.nome ?? "—"}</td><td>{m.qtd}</td>
                <td>{m.origem_tipo ?? "—"}</td><td>{m.destino_tipo ?? "—"}</td>
                <td>{m.usuarios?.nome_completo ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
