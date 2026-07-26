import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";
import { useCurrentUser } from "@/lib/use-current-user";
import { LinhaBadge } from "@/lib/use-accessible-linhas";
import { confirmar } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_authenticated/permutas")({
  component: Permutas,
});

function Permutas() {
  const qc = useQueryClient();
  const { isAdmin, perfil } = useCurrentUser();
  const podeAprovar = isAdmin || perfil === "Gestor";

  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-nome"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome, cor_hex")).data ?? [],
  });
  const linhaMap = new Map<string, any>(linhas.map((l: any) => [l.id, l]));

  const { data: permutas = [], isLoading } = useQuery({
    queryKey: ["permutas"],
    queryFn: async () =>
      (await supabase
        .from("movimentacoes")
        .select("*, itens(nome), usuarios(nome_completo)")
        .eq("tipo", "Permuta")
        .order("criado_em", { ascending: false })).data ?? [],
  });

  async function decidir(id: string, aprovar: boolean) {
    if (!(await confirmar(aprovar ? "Aprovar esta permuta?" : "Rejeitar esta permuta?", { confirmLabel: aprovar ? "Aprovar" : "Rejeitar" }))) return;
    const { error } = await supabase.rpc("aprovar_movimentacao", { _id: id, _aprovar: aprovar });
    if (error) return toast.error(error.message);
    toast.success(aprovar ? "Permuta aprovada" : "Permuta rejeitada");
    qc.invalidateQueries({ queryKey: ["permutas"] });
    qc.invalidateQueries({ queryKey: ["movs-all"] });
  }

  const pendentes = permutas.filter((p: any) => p.status_aprovacao === "pendente");
  const historico = permutas.filter((p: any) => p.status_aprovacao !== "pendente");

  const linhaLabel = (id: string | null) => {
    if (!id) return "—";
    const l = linhaMap.get(id);
    return l?.nome ?? "—";
  };
  const linhaBadge = (id: string | null) => {
    if (!id) return <span className="text-muted-foreground">—</span>;
    const l = linhaMap.get(id);
    return <LinhaBadge nome={l?.nome} cor={l?.cor_hex} />;
  };

  const badge = (st: string) => {
    const cls = st === "pendente" ? "bg-yellow-100 text-yellow-800"
      : st === "aprovado" ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{st}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-bold">Permutas entre Linhas</h1>
        </div>
        <CsvExportButton
          rows={permutas}
          columns={[
            { header: "Data", accessor: (m: any) => new Date(m.criado_em).toLocaleString("pt-BR") },
            { header: "Item", accessor: (m: any) => m.itens?.nome ?? "" },
            { header: "Qtd", accessor: (m: any) => m.qtd },
            { header: "Linha Origem", accessor: (m: any) => linhaLabel(m.linha_origem_id) },
            { header: "Linha Destino", accessor: (m: any) => linhaLabel(m.linha_destino_id) },
            { header: "Solicitante", accessor: (m: any) => m.usuarios?.nome_completo ?? "" },
            { header: "Status", accessor: (m: any) => m.status_aprovacao ?? "" },
          ]}
          filename="permutas"
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Pendentes ({pendentes.length})</h2>
        <Card className="p-0 overflow-hidden">
          <table className="excel-table">
            <thead><tr><th>Data</th><th>Item</th><th>Qtd</th><th>Linha Origem</th><th>Linha Destino</th><th>Solicitante</th><th>Motivo</th><th>Ações</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="text-center py-6">Carregando…</td></tr>}
              {!isLoading && pendentes.length === 0 && (
                <tr><td colSpan={8} className="text-center py-6 font-bold text-muted-foreground">Nenhuma permuta pendente</td></tr>
              )}
              {pendentes.map((m: any) => (
                <tr key={m.id}>
                  <td>{new Date(m.criado_em).toLocaleString("pt-BR")}</td>
                  <td>{m.itens?.nome ?? "—"}</td>
                  <td>{m.qtd}</td>
                  <td>{linhaBadge(m.linha_origem_id)}</td>
                  <td>{linhaBadge(m.linha_destino_id)}</td>
                  <td>{m.usuarios?.nome_completo ?? "—"}</td>
                  <td>{m.motivo_permuta ?? m.observacao ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    {podeAprovar ? (
                      <>
                        <Button variant="ghost" size="icon" title="Aprovar" onClick={() => decidir(m.id, true)}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Rejeitar" onClick={() => decidir(m.id, false)}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    ) : <span className="text-xs text-muted-foreground">Sem permissão</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Histórico</h2>
        <Card className="p-0 overflow-hidden">
          <table className="excel-table">
            <thead><tr><th>Data</th><th>Item</th><th>Qtd</th><th>Origem</th><th>Destino</th><th>Solicitante</th><th>Status</th></tr></thead>
            <tbody>
              {historico.length === 0 && (
                <tr><td colSpan={7} className="text-center py-6 font-bold text-muted-foreground">Nenhum histórico</td></tr>
              )}
              {historico.map((m: any) => (
                <tr key={m.id}>
                  <td>{new Date(m.criado_em).toLocaleString("pt-BR")}</td>
                  <td>{m.itens?.nome ?? "—"}</td>
                  <td>{m.qtd}</td>
                  <td>{linhaBadge(m.linha_origem_id)}</td>
                  <td>{linhaBadge(m.linha_destino_id)}</td>
                  <td>{m.usuarios?.nome_completo ?? "—"}</td>
                  <td>{badge(m.status_aprovacao ?? "aprovado")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
