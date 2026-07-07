import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/cds")({
  component: CdsPage,
});

const cdSchema = z.object({
  nome_cd: z.string().trim().min(1, "Informe o nome do CD").max(120),
  estacao_id: z.string().uuid().optional().or(z.literal("")),
  linha_id: z.string().uuid().optional().or(z.literal("")),
  capacidade: z.number().int().min(0, "Capacidade deve ser ≥ 0"),
  nivel_minimo: z.number().int().min(0, "Nível mínimo deve ser ≥ 0"),
  status: z.enum(["ativo", "inativo"]),
});

type CdForm = z.infer<typeof cdSchema>;
const empty: CdForm = { nome_cd: "", estacao_id: "", linha_id: "", capacidade: 0, nivel_minimo: 0, status: "ativo" };

function CdsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CdForm>(empty);
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState("nome_cd");
  const [direcao, setDirecao] = useState<"asc" | "desc">("asc");

  const { data: cds = [] } = useQuery({
    queryKey: ["cds"],
    queryFn: async () => (await supabase.from("cds").select("*, estacoes(nome), linhas(nome, cor_hex)").order("nome_cd")).data ?? [],
  });
  const { data: estacoes = [] } = useQuery({
    queryKey: ["estacoes-sel-cd"],
    queryFn: async () => (await supabase.from("estacoes").select("id, nome").order("nome")).data ?? [],
  });
  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-sel-cd"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome").order("nome")).data ?? [],
  });

  const filtrados = useMemo(() => {
    const f = busca.toLowerCase();
    const arr = cds.filter((c: any) => !f || c.nome_cd?.toLowerCase().includes(f) || c.estacoes?.nome?.toLowerCase().includes(f));
    arr.sort((a: any, b: any) => {
      const av = (a[ordenar] ?? "").toString();
      const bv = (b[ordenar] ?? "").toString();
      return direcao === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return arr;
  }, [cds, busca, ordenar, direcao]);

  function startCreate() { setEditingId(null); setForm(empty); setOpen(true); }
  function startEdit(c: any) {
    setEditingId(c.id);
    setForm({
      nome_cd: c.nome_cd, estacao_id: c.estacao_id ?? "", linha_id: c.linha_id ?? "",
      capacidade: c.capacidade, nivel_minimo: c.nivel_minimo, status: c.status,
    });
    setOpen(true);
  }
  async function salvar() {
    const p = cdSchema.safeParse(form);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const payload = { ...p.data, estacao_id: p.data.estacao_id || null, linha_id: p.data.linha_id || null, estacao: null };
    const { error } = editingId
      ? await supabase.from("cds").update(payload).eq("id", editingId)
      : await supabase.from("cds").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "CD atualizado" : "CD criado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["cds"] });
  }
  async function excluir(id: string) {
    if (!confirm("Excluir este CD?")) return;
    const { error } = await supabase.from("cds").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cds"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-bold">Centros de Distribuição</h1>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4" /> Novo CD</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px]">
          <Label>Pesquisar</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input placeholder="Pesquisar CDs..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
          </div>
        </div>
        <div><Label>Ordenar</Label>
          <Select value={ordenar} onValueChange={setOrdenar}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nome_cd">Nome</SelectItem>
              <SelectItem value="estacao">Estação</SelectItem>
              <SelectItem value="linha">Linha</SelectItem>
              <SelectItem value="criado_em">Data Criação</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Direção</Label>
          <Select value={direcao} onValueChange={(v: any) => setDirecao(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascendente ↑</SelectItem>
              <SelectItem value="desc">Descendente ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="excel-table">
          <thead><tr>
            <th>Nome do CD</th><th>Estação</th><th>Linha</th><th>Capacidade</th><th>Nível Mínimo</th><th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={7} className="text-center py-8 font-bold text-muted-foreground">Nenhum CD cadastrado</td></tr>}
            {filtrados.map((c: any) => (
              <tr key={c.id}>
                <td>{c.nome_cd}</td>
                <td>{c.estacoes?.nome ?? c.estacao ?? "—"}</td>
                <td>{c.linhas ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: c.linhas.cor_hex || "#1e40af" }} />
                    {c.linhas.nome}
                  </span>
                ) : "—"}</td>
                <td>{c.capacidade}</td><td>{c.nivel_minimo}</td>
                <td>{c.status === "ativo" ? "Ativo" : "Inativo"}</td>
                <td className="whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => excluir(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar CD" : "Novo CD"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome do CD</Label>
              <Input value={form.nome_cd} onChange={(e) => setForm({ ...form, nome_cd: e.target.value })} />
            </div>
            <div><Label>Estação</Label>
              <Select value={form.estacao_id || undefined} onValueChange={(v) => setForm({ ...form, estacao_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{estacoes.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Linha</Label>
              <Select value={form.linha_id || undefined} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{linhas.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Capacidade</Label>
              <Input type="number" min={0} value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: Math.max(0, +e.target.value || 0) })} />
            </div>
            <div><Label>Nível Mínimo</Label>
              <Input type="number" min={0} value={form.nivel_minimo} onChange={(e) => setForm({ ...form, nivel_minimo: Math.max(0, +e.target.value || 0) })} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                id="cd-ativo"
                type="checkbox"
                className="h-4 w-4"
                checked={form.status === "ativo"}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? "ativo" : "inativo" })}
              />
              <Label htmlFor="cd-ativo">Ativo</Label>
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
