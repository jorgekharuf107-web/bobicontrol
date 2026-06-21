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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/cds")({
  component: CdsPage,
});

type Cd = {
  id: string; nome_cd: string; estacao: string | null; linha_id: string | null;
  capacidade: number; nivel_minimo: number; status: "ativo" | "inativo";
};

type CdForm = {
  nome_cd: string; estacao: string; linha_id: string;
  capacidade: number; nivel_minimo: number; status: "ativo" | "inativo";
};
const emptyForm: CdForm = {
  nome_cd: "", estacao: "", linha_id: "", capacidade: 0, nivel_minimo: 0, status: "ativo",
};

function CdsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cd | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: cds = [] } = useQuery({
    queryKey: ["cds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cds").select("*, linhas(nome)").order("nome_cd");
      if (error) throw error;
      return data as (Cd & { linhas: { nome: string } | null })[];
    },
  });
  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas"],
    queryFn: async () => {
      const { data } = await supabase.from("linhas").select("id, nome").order("nome");
      return data ?? [];
    },
  });

  function startCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function startEdit(c: Cd) {
    setEditing(c);
    setForm({
      nome_cd: c.nome_cd, estacao: c.estacao ?? "", linha_id: c.linha_id ?? "",
      capacidade: c.capacidade, nivel_minimo: c.nivel_minimo, status: c.status,
    });
    setOpen(true);
  }
  async function save() {
    if (!form.nome_cd.trim()) return toast.error("Informe o nome do CD");
    const payload = { ...form, linha_id: form.linha_id || null, estacao: form.estacao || null };
    const { error } = editing
      ? await supabase.from("cds").update(payload).eq("id", editing.id)
      : await supabase.from("cds").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "CD atualizado" : "CD criado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["cds"] });
  }
  async function remove(id: string) {
    if (!confirm("Excluir este CD?")) return;
    const { error } = await supabase.from("cds").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cds"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-semibold">Centros de Distribuição</h1>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4" /> Novo CD</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>Estação</TableHead><TableHead>Linha</TableHead>
              <TableHead>Capacidade</TableHead><TableHead>Nível mín.</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cds.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum CD cadastrado.</TableCell></TableRow>
            )}
            {cds.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome_cd}</TableCell>
                <TableCell>{c.estacao ?? "—"}</TableCell>
                <TableCell>{c.linhas?.nome ?? "—"}</TableCell>
                <TableCell>{c.capacidade}</TableCell>
                <TableCell>{c.nivel_minimo}</TableCell>
                <TableCell>{c.status}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar CD" : "Novo CD"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2"><Label>Nome do CD</Label>
              <Input value={form.nome_cd} onChange={(e) => setForm({ ...form, nome_cd: e.target.value })} /></div>
            <div className="space-y-2"><Label>Estação</Label>
              <Input value={form.estacao} onChange={(e) => setForm({ ...form, estacao: e.target.value })} /></div>
            <div className="space-y-2"><Label>Linha</Label>
              <Select value={form.linha_id} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>{linhas.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Capacidade</Label>
              <Input type="number" value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: +e.target.value })} /></div>
            <div className="space-y-2"><Label>Nível mínimo</Label>
              <Input type="number" value={form.nivel_minimo} onChange={(e) => setForm({ ...form, nivel_minimo: +e.target.value })} /></div>
            <div className="space-y-2 col-span-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select></div>
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
