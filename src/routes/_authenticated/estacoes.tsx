import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";

export const Route = createFileRoute("/_authenticated/estacoes")({
  component: EstacoesPage,
});

function EstacoesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", linha_id: "" });

  const { data: estacoes = [] } = useQuery({
    queryKey: ["estacoes"],
    queryFn: async () => (await supabase.from("estacoes").select("*, linhas(nome, cor_hex)").order("nome")).data ?? [],
  });
  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-sel"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome").order("nome")).data ?? [],
  });

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome da estação");
    const payload = { nome: form.nome, linha_id: form.linha_id || null };
    const { error } = editingId
      ? await supabase.from("estacoes").update(payload).eq("id", editingId)
      : await supabase.from("estacoes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Estação atualizada" : "Estação criada");
    setOpen(false); setForm({ nome: "", linha_id: "" }); setEditingId(null);
    qc.invalidateQueries({ queryKey: ["estacoes"] });
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta estação?")) return;
    const { error } = await supabase.from("estacoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["estacoes"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-bold">Estações</h1>
        </div>
        <div className="flex items-center gap-2">
          <CsvExportButton
            rows={estacoes}
            columns={[
              { header: "Nome", accessor: (e: any) => e.nome },
              { header: "Linha", accessor: (e: any) => e.linhas?.nome ?? "" },
            ]}
            filename="estacoes"
          />
          <Button onClick={() => { setEditingId(null); setForm({ nome: "", linha_id: "" }); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Nova Estação
          </Button>
        </div>
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="excel-table">
          <thead><tr><th>Nome</th><th>Linha</th><th>Ações</th></tr></thead>
          <tbody>
            {estacoes.length === 0 && <tr><td colSpan={3} className="text-center py-8 font-bold text-muted-foreground">Nenhuma estação cadastrada</td></tr>}
            {estacoes.map((e: any) => (
              <tr key={e.id}>
                <td>{e.nome}</td>
                <td>
                  {e.linhas ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: e.linhas.cor_hex || "#1e40af" }} />
                      {e.linhas.nome}
                    </span>
                  ) : "—"}
                </td>
                <td>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingId(e.id); setForm({ nome: e.nome, linha_id: e.linha_id ?? "" }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => excluir(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Estação" : "Nova Estação"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div><Label>Linha</Label>
              <Select value={form.linha_id || undefined} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a linha" /></SelectTrigger>
                <SelectContent>{linhas.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>{editingId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
