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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/atms")({
  component: AtmsPage,
});

const statusEnum = ["operacional", "manutencao", "desativado"] as const;
const statusLabel: Record<string, string> = { operacional: "Operacional", manutencao: "Em Manutenção", desativado: "Desativado" };

const atmSchema = z.object({
  id_atm: z.string().trim().min(1, "Informe o ID do ATM").max(40),
  modelo: z.string().trim().min(1, "Informe o modelo").max(80),
  estacao_id: z.string().uuid().optional().or(z.literal("")),
  localizacao_detalhada: z.string().trim().max(200).optional().or(z.literal("")),
  capacidade_bobinas: z.number().int().min(1, "Capacidade deve ser ≥ 1"),
  nivel_minimo: z.number().int().min(1, "Nível mínimo deve ser ≥ 1"),
  status_operacional: z.enum(statusEnum),
  atm_ativo_sim_nao: z.boolean(),
});

type AtmForm = z.infer<typeof atmSchema>;
const empty: AtmForm = { id_atm: "", modelo: "", estacao_id: "", localizacao_detalhada: "", capacidade_bobinas: 1, nivel_minimo: 1, status_operacional: "operacional", atm_ativo_sim_nao: true };

function AtmsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AtmForm>(empty);
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState("id_atm");
  const [direcao, setDirecao] = useState<"asc" | "desc">("asc");

  const { data: atms = [] } = useQuery({
    queryKey: ["atms"],
    queryFn: async () => (await supabase.from("atms").select("*, estacoes(nome, linhas(nome, cor_hex))").order("id_atm")).data ?? [],
  });
  const { data: estacoes = [] } = useQuery({
    queryKey: ["estacoes-sel"],
    queryFn: async () => (await supabase.from("estacoes").select("id, nome").order("nome")).data ?? [],
  });

  const filtrados = useMemo(() => {
    const f = busca.toLowerCase();
    const arr = atms.filter((a: any) => !f || a.id_atm?.toLowerCase().includes(f) || a.modelo?.toLowerCase().includes(f) || a.estacoes?.nome?.toLowerCase().includes(f));
    arr.sort((a: any, b: any) => {
      const av = (a[ordenar] ?? a.estacoes?.nome ?? "").toString();
      const bv = (b[ordenar] ?? b.estacoes?.nome ?? "").toString();
      return direcao === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return arr;
  }, [atms, busca, ordenar, direcao]);

  function startCreate() { setEditingId(null); setForm(empty); setOpen(true); }
  function startEdit(a: any) {
    setEditingId(a.id);
    setForm({
      id_atm: a.id_atm, modelo: a.modelo ?? "", estacao_id: a.estacao_id ?? "",
      localizacao_detalhada: a.localizacao_detalhada ?? "", capacidade_bobinas: a.capacidade_bobinas,
      nivel_minimo: a.nivel_minimo, status_operacional: a.status_operacional, atm_ativo_sim_nao: a.atm_ativo_sim_nao,
    });
    setOpen(true);
  }
  async function salvar() {
    const p = atmSchema.safeParse(form);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const payload = { ...p.data, estacao_id: p.data.estacao_id || null, localizacao_detalhada: p.data.localizacao_detalhada || null, estacao: null };
    const { error } = editingId
      ? await supabase.from("atms").update(payload).eq("id", editingId)
      : await supabase.from("atms").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "ATM atualizado" : "ATM criado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["atms"] });
  }
  async function excluir(id: string) {
    if (!confirm("Excluir este ATM?")) return;
    const { error } = await supabase.from("atms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["atms"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-bold">Cadastro de ATM</h1>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4" /> Novo ATM</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px]">
          <Label>Pesquisar</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input placeholder="Pesquisar ATMs..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
          </div>
        </div>
        <div><Label>Ordenar</Label>
          <Select value={ordenar} onValueChange={setOrdenar}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="id_atm">ID</SelectItem>
              <SelectItem value="modelo">Modelo</SelectItem>
              <SelectItem value="estacao">Estação</SelectItem>
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
            <th>ID</th><th>Modelo</th><th>Estação</th><th>Linha</th><th>Localização</th><th>Capacidade</th><th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={8} className="text-center py-8 font-bold text-muted-foreground">Nenhum ATM cadastrado</td></tr>}
            {filtrados.map((a: any) => (
              <tr key={a.id}>
                <td>{a.id_atm}</td>
                <td>{a.modelo ?? "—"}</td>
                <td>{a.estacoes?.nome ?? a.estacao ?? "—"}</td>
                <td>{a.estacoes?.linhas ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: a.estacoes.linhas.cor_hex || "#1e40af" }} />
                    {a.estacoes.linhas.nome}
                  </span>
                ) : "—"}</td>
                <td>{a.localizacao_detalhada ?? "—"}</td>
                <td>{a.capacidade_bobinas}</td>
                <td>{statusLabel[a.status_operacional] ?? a.status_operacional}</td>
                <td className="whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => excluir(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar ATM" : "Novo ATM"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>ID ATM</Label>
              <Input value={form.id_atm} onChange={(e) => setForm({ ...form, id_atm: e.target.value })} />
            </div>
            <div><Label>Modelo</Label>
              <Input placeholder="Ex: NCR SelfServ 88" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            </div>
            <div><Label>Estação</Label>
              <Select value={form.estacao_id || undefined} onValueChange={(v) => setForm({ ...form, estacao_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a estação" /></SelectTrigger>
                <SelectContent>{estacoes.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Localização Detalhada</Label>
              <Input placeholder="Ex: Hall de entrada" value={form.localizacao_detalhada} onChange={(e) => setForm({ ...form, localizacao_detalhada: e.target.value })} />
            </div>
            <div><Label>Capacidade de Bobinas</Label>
              <Input type="number" min={1} value={form.capacidade_bobinas} onChange={(e) => setForm({ ...form, capacidade_bobinas: Math.max(1, +e.target.value || 1) })} />
            </div>
            <div><Label>Nível Mínimo</Label>
              <Input type="number" min={1} value={form.nivel_minimo} onChange={(e) => setForm({ ...form, nivel_minimo: Math.max(1, +e.target.value || 1) })} />
            </div>
            <div className="col-span-2"><Label>Status Operacional</Label>
              <Select value={form.status_operacional} onValueChange={(v: any) => setForm({ ...form, status_operacional: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="manutencao">Em Manutenção</SelectItem>
                  <SelectItem value="desativado">Desativado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.atm_ativo_sim_nao} onCheckedChange={(v) => setForm({ ...form, atm_ativo_sim_nao: v })} />
              <Label>ATM ativo</Label>
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
