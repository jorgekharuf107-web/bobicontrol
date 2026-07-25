import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AuditoriaPage,
});

function AuditoriaPage() {
  const { data: logs = [] } = useQuery({
    queryKey: ["auditoria"],
    queryFn: async () => (await supabase.from("auditoria").select("*").order("criado_em", { ascending: false }).limit(200)).data ?? [],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3"><BackButton to="/dashboard" /><h1 className="text-2xl font-semibold">Auditoria</h1></div>
        <CsvExportButton
          rows={logs}
          columns={[
            { header: "Data", accessor: (l: any) => new Date(l.criado_em).toLocaleString("pt-BR") },
            { header: "Ação", accessor: (l: any) => l.acao },
            { header: "Módulo", accessor: (l: any) => l.tabela },
            { header: "Registro", accessor: (l: any) => l.registro_id ?? "" },
            { header: "Usuário", accessor: (l: any) => l.usuario_id ?? "" },
          ]}

          filename="auditoria"
        />
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Data</TableHead><TableHead>Ação</TableHead><TableHead>Módulo</TableHead>
            <TableHead>Registro</TableHead><TableHead>Usuário</TableHead>
          </TableRow></TableHeader>

          <TableBody>
            {logs.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registro de auditoria.</TableCell></TableRow>
            )}
            {logs.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell>{new Date(l.criado_em).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{l.acao}</TableCell>
                <TableCell>{l.tabela}</TableCell>
                <TableCell className="font-mono text-xs">{l.registro_id ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{l.usuario_id ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
