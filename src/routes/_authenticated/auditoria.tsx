import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";
import { useAccessibleLinhas, LinhaBadge } from "@/lib/use-accessible-linhas";

export const Route = createFileRoute("/_authenticated/auditoria")({
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [linhaFiltro, setLinhaFiltro] = useState<string>("todas");
  const { data: linhas = [] } = useAccessibleLinhas();
  const linhaMap = new Map(linhas.map((l) => [l.id, l]));

  const { data: logs = [] } = useQuery({
    queryKey: ["auditoria-full"],
    queryFn: async () =>
      (await supabase.from("auditoria").select("*, usuarios(nome_completo)")
        .order("criado_em", { ascending: false }).limit(500)).data ?? [],
  });

  const linhaDoLog = (l: any): string | null => {
    const d = l.dados_depois ?? l.dados_antes ?? {};
    return d.linha_id ?? d.linha_origem_id ?? d.linha_destino_id ?? null;
  };

  const filtrados = useMemo(() => {
    return (logs as any[]).filter((l) => {
      const dt = new Date(l.criado_em);
      if (dataInicio && dt < new Date(dataInicio)) return false;
      if (dataFim) {
        const fim = new Date(dataFim); fim.setHours(23, 59, 59, 999);
        if (dt > fim) return false;
      }
      if (linhaFiltro !== "todas") {
        const lid = linhaDoLog(l);
        if (lid !== linhaFiltro) return false;
      }
      return true;
    });
  }, [logs, dataInicio, dataFim, linhaFiltro]);

  const detalhes = (l: any) => {
    if (l.registro_id) return `Registro ${String(l.registro_id).slice(0, 8)}`;
    return "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-semibold">Auditoria</h1>
        </div>
        <CsvExportButton
          rows={filtrados}
          columns={[
            { header: "Data", accessor: (l: any) => new Date(l.criado_em).toLocaleString("pt-BR") },
            { header: "Usuário", accessor: (l: any) => l.usuarios?.nome_completo ?? l.usuario_id ?? "" },
            { header: "Ação", accessor: (l: any) => l.acao },
            { header: "Tabela", accessor: (l: any) => l.tabela },
            { header: "Detalhes", accessor: (l: any) => detalhes(l) },
            { header: "Linha Afetada", accessor: (l: any) => linhaMap.get(linhaDoLog(l) ?? "")?.nome ?? "" },
          ]}
          filename="auditoria"
        />
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div><Label>Data início</Label><Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
        <div><Label>Data fim</Label><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
        <div className="md:col-span-2">
          <Label>Linha</Label>
          <Select value={linhaFiltro} onValueChange={setLinhaFiltro}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as linhas</SelectItem>
              {linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="excel-table">
          <thead>
            <tr>
              <th>Data</th><th>Usuário</th><th>Ação</th><th>Detalhes</th><th>Linha Afetada</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 font-bold text-muted-foreground">Nenhum registro de auditoria</td></tr>
            )}
            {filtrados.map((l: any) => {
              const lid = linhaDoLog(l);
              const linha = lid ? linhaMap.get(lid) : null;
              return (
                <tr key={l.id}>
                  <td>{new Date(l.criado_em).toLocaleString("pt-BR")}</td>
                  <td>{l.usuarios?.nome_completo ?? <span className="font-mono text-xs">{l.usuario_id ?? "—"}</span>}</td>
                  <td><span className="font-medium">{l.acao}</span> <span className="text-xs text-muted-foreground">/ {l.tabela}</span></td>
                  <td className="font-mono text-xs">{detalhes(l)}</td>
                  <td>{linha ? <LinhaBadge nome={linha.nome} cor={linha.cor_hex} /> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
