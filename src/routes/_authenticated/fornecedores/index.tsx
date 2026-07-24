import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";
import { TableSearch } from "@/components/table-search";

export const Route = createFileRoute("/_authenticated/fornecedores/")({
  component: ListPage,
});

function ListPage() {
  const [q, setQ] = useState("");
  const [dIni, setDIni] = useState("");
  const [dFim, setDFim] = useState("");
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (fornecedores as any[]).filter((f) => {
      if (s) {
        const hay = [f.razao_social, f.cnpj, f.cidade, f.estado, f.contato_principal, f.telefone, f.email, f.status]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (dIni && f.criado_em && new Date(f.criado_em) < new Date(dIni)) return false;
      if (dFim && f.criado_em) {
        const end = new Date(dFim); end.setHours(23, 59, 59, 999);
        if (new Date(f.criado_em) > end) return false;
      }
      return true;
    });
  }, [fornecedores, q, dIni, dFim]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><BackButton to="/dashboard" /><h1 className="text-2xl font-semibold">Fornecedores</h1></div>
        <div className="flex items-center gap-2">
          <CsvExportButton
            rows={filtered}
            columns={[
              { header: "Razão Social", accessor: (f: any) => f.razao_social },
              { header: "CNPJ", accessor: (f: any) => f.cnpj },
              { header: "Cidade", accessor: (f: any) => f.cidade ?? "" },
              { header: "UF", accessor: (f: any) => f.estado ?? "" },
              { header: "Contato", accessor: (f: any) => f.contato_principal ?? "" },
              { header: "Telefone", accessor: (f: any) => f.telefone ?? "" },
              { header: "Email", accessor: (f: any) => f.email ?? "" },
              { header: "Status", accessor: (f: any) => f.status ?? "" },
            ]}
            filename="fornecedores"
          />
          <Button asChild><Link to="/fornecedores/novo"><Plus className="h-4 w-4" /> Novo fornecedor</Link></Button>
        </div>
      </div>
      <TableSearch
        search={q} onSearch={setQ}
        placeholder="Pesquisar por razão social, CNPJ, cidade, contato…"
        dataInicio={dIni} onDataInicio={setDIni}
        dataFim={dFim} onDataFim={setDFim}
      />
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Razão Social</TableHead><TableHead>CNPJ</TableHead>
            <TableHead>Cidade/UF</TableHead><TableHead>Contato</TableHead>
            <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum fornecedor encontrado.</TableCell></TableRow>
            )}
            {filtered.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.razao_social}</TableCell>
                <TableCell>{f.cnpj}</TableCell>
                <TableCell>{[f.cidade, f.estado].filter(Boolean).join(" / ") || "—"}</TableCell>
                <TableCell>{f.contato_principal ?? "—"}</TableCell>
                <TableCell>{f.status}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon">
                    <Link to="/fornecedores/$id" params={{ id: f.id }}><Pencil className="h-4 w-4" /></Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
