import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";
import { confirmarExclusao } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_authenticated/linhas")({
  head: () => ({
    meta: [
      { title: "Linhas | Bobi Control" },
      { name: "description", content: "Cadastro das linhas do metrô com cor de identificação e estações vinculadas." },
      { property: "og:title", content: "Linhas | Bobi Control" },
      { property: "og:description", content: "Cadastro das linhas do metrô com cor de identificação e estações vinculadas." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/linhas" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/linhas" }],
  }),
  component: LinhasPage,
});

type Linha = { id: string; nome: string; cor_hex: string; linha_ativa_sim_nao: boolean };

function LinhasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Linha | null>(null);
  const [form, setForm] = useState({ nome: "", cor_hex: "#3b82f6", linha_ativa_sim_nao: true });

  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ["linhas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("linhas").select("*").order("nome");
      if (error) throw error;
      return data as Linha[];
    },
  });

  function startCreate() {
    setEditing(null);
    setForm({ nome: "", cor_hex: "#3b82f6", linha_ativa_sim_nao: true });
    setOpen(true);
  }
  function startEdit(l: Linha) {
    setEditing(l);
    setForm({ nome: l.nome, cor_hex: l.cor_hex, linha_ativa_sim_nao: l.linha_ativa_sim_nao });
    setOpen(true);
  }
  async function save() {
    if (!form.nome.trim()) return toast.error("Informe o nome da linha");
    const payload = { ...form };
    const { error } = editing
      ? await supabase.from("linhas").update(payload).eq("id", editing.id)
      : await supabase.from("linhas").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Linha atualizada" : "Linha criada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["linhas"] });
  }
  async function remove(id: string) {
    if (!(await confirmarExclusao("linha"))) return;
    const { error } = await supabase.from("linhas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Linha excluída");
    qc.invalidateQueries({ queryKey: ["linhas"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-semibold">Linhas</h1>
        </div>
        <div className="flex items-center gap-2">
          <CsvExportButton
            rows={linhas}
            columns={[
              { header: "Nome", accessor: (l) => l.nome },
              { header: "Cor", accessor: (l) => l.cor_hex },
              { header: "Status", accessor: (l) => (l.linha_ativa_sim_nao ? "Ativa" : "Inativa") },
            ]}
            filename="linhas"
          />
          <Button onClick={startCreate}><Plus className="h-4 w-4" /> Nova linha</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && linhas.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma linha cadastrada.</TableCell></TableRow>
            )}
            {linhas.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: l.cor_hex }} />
                </TableCell>
                <TableCell>{l.linha_ativa_sim_nao ? "Ativa" : "Inativa"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(l)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar linha" : "Nova linha"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input type="color" value={form.cor_hex} onChange={(e) => setForm({ ...form, cor_hex: e.target.value })} className="h-10 w-20 p-1" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.linha_ativa_sim_nao} onCheckedChange={(v) => setForm({ ...form, linha_ativa_sim_nao: v })} />
              <Label>Linha ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
