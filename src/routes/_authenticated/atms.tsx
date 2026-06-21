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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/atms")({
  component: AtmsPage,
});

type StatusOp = "operacional" | "manutencao" | "desativado";
type Atm = {
  id: string; id_atm: string; modelo: string | null; estacao: string | null;
  localizacao_detalhada: string | null; capacidade_bobinas: number; nivel_minimo: number;
  status_operacional: StatusOp; atm_ativo_sim_nao: boolean; cd_id: string | null;
};

const emptyForm = {
  id_atm: "", modelo: "", estacao: "", localizacao_detalhada: "", capacidade_bobinas: 0,
  nivel_minimo: 0, status_operacional: "operacional" as StatusOp, atm_ativo_sim_nao: true, cd_id: "",
};

function AtmsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Atm | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: atms = [] } = useQuery({
    queryKey: ["atms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("atms").select("*, cds(nome_cd)").order("id_atm");
      if (error) throw error;
      return data as (Atm & { cds: { nome_cd: string } | null })[];
    },
  });
  const { data: cds = [] } = useQuery({
    queryKey: ["cds-select"],
    queryFn: async () => (await supabase.from("cds").select("id, nome_cd").order("nome_cd")).data ?? [],
  });

  function startCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function startEdit(a: Atm) {
    setEditing(a);
    setForm({
      id_atm: a.id_atm, modelo: a.modelo ?? "", estacao: a.estacao ?? "",
      localizacao_detalhada: a.localizacao_detalhada ?? "", capacidade_bobinas: a.capacidade_bobinas,
      nivel_minimo: a.nivel_minimo, status_operacional: a.status_operacional,
      atm_ativo_sim_nao: a.atm_ativo_sim_nao, cd_id: a.cd_id ?? "",
    });
    setOpen(true);
  }
  async function save() {
    if (!form.id_atm.trim()) return toast.error("Informe o ID do ATM");
    const payload: any = { ...form, cd_id: form.cd_id || null };
    ["modelo","estacao","localizacao_detalhada"].forEach(k => { if (!payload[k]) payload[k] = null; });
    const { error } = editing
      ? await supabase.from("atms").update(payload).eq("id", editing.id)
      : await supabase.from("atms").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "ATM atualizado" : "ATM criado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["atms"] });
  }
  async function remove(id: string) {
    if (!confirm("Excluir este ATM?")) return;
    const { error } = await supabase.from("atms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["atms"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><BackButton to="/dashboard" /><h1 className="text-2xl font-semibold">ATMs</h1></div>
        <Button onClick={startCreate}><Plus className="h-4 w-4" /> Novo ATM</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>ID</TableHead><TableHead>Modelo</TableHead><TableHead>Estação</TableHead>
            <TableHead>CD</TableHead><TableHead>Status</TableHead><TableHead>Ativo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {atms.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum ATM cadastrado.</TableCell></TableRow>
            )}
            {atms.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.id_atm}</TableCell>
                <TableCell>{a.modelo ?? "—"}</TableCell>
                <TableCell>{a.estacao ?? "—"}</TableCell>
                <TableCell>{a.cds?.nome_cd ?? "—"}</TableCell>
                <TableCell>{a.status_operacional}</TableCell>
                <TableCell>{a.atm_ativo_sim_nao ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar ATM" : "Novo ATM"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>ID do ATM</Label>
              <Input value={form.id_atm} onChange={(e) => setForm({ ...form, id_atm: e.target.value })} /></div>
            <div className="space-y-2"><Label>Modelo</Label>
              <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
            <div className="space-y-2"><Label>Estação</Label>
              <Input value={form.estacao} onChange={(e) => setForm({ ...form, estacao: e.target.value })} /></div>
            <div className="space-y-2"><Label>CD vinculado</Label>
              <Select value={form.cd_id} onValueChange={(v) => setForm({ ...form, cd_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>{cds.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_cd}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-2 col-span-2"><Label>Localização detalhada</Label>
              <Input value={form.localizacao_detalhada} onChange={(e) => setForm({ ...form, localizacao_detalhada: e.target.value })} /></div>
            <div className="space-y-2"><Label>Capacidade (bobinas)</Label>
              <Input type="number" value={form.capacidade_bobinas} onChange={(e) => setForm({ ...form, capacidade_bobinas: +e.target.value })} /></div>
            <div className="space-y-2"><Label>Nível mínimo</Label>
              <Input type="number" value={form.nivel_minimo} onChange={(e) => setForm({ ...form, nivel_minimo: +e.target.value })} /></div>
            <div className="space-y-2"><Label>Status operacional</Label>
              <Select value={form.status_operacional} onValueChange={(v: any) => setForm({ ...form, status_operacional: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="desativado">Desativado</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="flex items-center gap-2 mt-7">
              <Switch checked={form.atm_ativo_sim_nao} onCheckedChange={(v) => setForm({ ...form, atm_ativo_sim_nao: v })} />
              <Label>ATM ativo</Label>
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
