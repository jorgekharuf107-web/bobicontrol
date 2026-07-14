import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";

export const Route = createFileRoute("/_authenticated/fornecedores/")({
  component: ListPage,
});

function ListPage() {
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><BackButton to="/dashboard" /><h1 className="text-2xl font-semibold">Fornecedores</h1></div>
        <Button asChild><Link to="/fornecedores/novo"><Plus className="h-4 w-4" /> Novo fornecedor</Link></Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Razão Social</TableHead><TableHead>CNPJ</TableHead>
            <TableHead>Cidade/UF</TableHead><TableHead>Contato</TableHead>
            <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {fornecedores.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum fornecedor cadastrado.</TableCell></TableRow>
            )}
            {fornecedores.map((f: any) => (
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
