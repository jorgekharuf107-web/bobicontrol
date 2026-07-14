import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";

export const Route = createFileRoute("/_authenticated/controle-estoque")({
  component: ControleEstoque,
});

const tipos = ["Entrada", "Saida", "Transferencia", "Permuta", "Ajuste", "Abastecimento"] as const;
const locais = ["CD", "ATM"] as const;

const movSchema = z.object({
  tipo: z.enum(tipos),
  item_id: z.string().uuid("Selecione o item"),
  qtd: z.number().int().min(1, "Quantidade deve ser ≥ 1"),
  origem_tipo: z.enum(locais).optional().or(z.literal("")),
  origem_id: z.string().uuid().optional().or(z.literal("")),
  destino_tipo: z.enum(locais).optional().or(z.literal("")),
  destino_id: z.string().uuid().optional().or(z.literal("")),
  observacao: z.string().max(500).optional().or(z.literal("")),
});

type MovForm = z.infer<typeof movSchema>;
const empty: MovForm = {
  tipo: "Entrada", item_id: "", qtd: 1,
  origem_tipo: "", origem_id: "", destino_tipo: "", destino_id: "", observacao: "",
};

function ControleEstoque() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MovForm>(empty);

  const { data: movs = [] } = useQuery({
    queryKey: ["movs-all"],
    queryFn: async () =>
      (await supabase
        .from("movimentacoes")
        .select("*, itens(nome), usuarios(nome_completo)")
        .order("data", { ascending: false })).data ?? [],
  });
  const { data: itens = [] } = useQuery({
    queryKey: ["itens-sel"],
    queryFn: async () => (await supabase.from("itens").select("id, nome").order("nome")).data ?? [],
  });
  const { data: cds = [] } = useQuery({
    queryKey: ["cds-sel"],
    queryFn: async () => (await supabase.from("cds").select("id, nome").order("nome")).data ?? [],
  });
  const { data: atms = [] } = useQuery({
    queryKey: ["atms-sel"],
    queryFn: async () => (await supabase.from("atms").select("id, id_atm").order("id_atm")).data ?? [],
  });

  function localOptions(tipo?: string) {
    if (tipo === "CD") return cds.map((c: any) => ({ id: c.id, label: c.nome }));
    if (tipo === "ATM") return atms.map((a: any) => ({ id: a.id, label: a.id_atm }));
    return [];
  }

  function startCreate() { setEditingId(null); setForm(empty); setOpen(true); }
  function startEdit(m: any) {
    setEditingId(m.id);
    setForm({
      tipo: m.tipo, item_id: m.item_id ?? "", qtd: m.qtd,
      origem_tipo: m.origem_tipo ?? "", origem_id: m.origem_id ?? "",
      destino_tipo: m.destino_tipo ?? "", destino_id: m.destino_id ?? "",
      observacao: m.observacao ?? "",
    });
    setOpen(true);
  }

  async function salvar() {
    const p = movSchema.safeParse(form);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const { data: ses } = await supabase.auth.getUser();
    const payload: any = {
      tipo: p.data.tipo,
      item_id: p.data.item_id,
      qtd: p.data.qtd,
      origem_tipo: p.data.origem_tipo || null,
      origem_id: p.data.origem_id || null,
      destino_tipo: p.data.destino_tipo || null,
      destino_id: p.data.destino_id || null,
      observacao: p.data.observacao || null,
      tecnico_id: ses.user?.id ?? null,
    };
    const { error } = editingId
      ? await supabase.from("movimentacoes").update(payload).eq("id", editingId)
      : await supabase.from("movimentacoes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Movimentação atualizada" : "Movimentação criada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["movs-all"] });
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta movimentação?")) return;
    const { error } = await supabase.from("movimentacoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["movs-all"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-bold">Controle de Estoque</h1>
        </div>
        <div className="flex items-center gap-2">
          <CsvExportButton
            rows={movs}
            columns={[
              { header: "Data", accessor: (m: any) => new Date(m.data).toLocaleString("pt-BR") },
              { header: "Tipo", accessor: (m: any) => m.tipo },
              { header: "Item", accessor: (m: any) => m.itens?.nome ?? "" },
              { header: "Qtd", accessor: (m: any) => m.qtd },
              { header: "Origem Tipo", accessor: (m: any) => m.origem_tipo ?? "" },
              { header: "Destino Tipo", accessor: (m: any) => m.destino_tipo ?? "" },
              { header: "Técnico", accessor: (m: any) => m.usuarios?.nome_completo ?? "" },
              { header: "Observação", accessor: (m: any) => m.observacao ?? "" },
            ]}
            filename="movimentacoes"
          />
          <Button onClick={startCreate}><Plus className="h-4 w-4" /> Nova Movimentação</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="excel-table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th>Qtd</th><th>Origem</th><th>Destino</th><th>Técnico</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {movs.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 font-bold text-muted-foreground">Nenhuma movimentação registrada</td></tr>
            )}
            {movs.map((m: any) => {
              const st = m.status_aprovacao ?? "aprovado";
              const cls = st === "pendente" ? "bg-yellow-100 text-yellow-800" : st === "rejeitado" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
              return (
              <tr key={m.id}>
                <td>{new Date(m.data).toLocaleString("pt-BR")}</td>
                <td>{m.tipo}</td>
                <td>{m.itens?.nome ?? "—"}</td>
                <td>{m.qtd}</td>
                <td>{m.origem_tipo ?? "—"}</td>
                <td>{m.destino_tipo ?? "—"}</td>
                <td>{m.usuarios?.nome_completo ?? "—"}</td>
                <td><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{st}</span></td>
                <td className="whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => excluir(m.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar Movimentação" : "Nova Movimentação"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Item</Label>
              <Select value={form.item_id || undefined} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                <SelectContent>{itens.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade</Label>
              <Input type="number" min={1} value={form.qtd}
                onChange={(e) => setForm({ ...form, qtd: Math.max(1, +e.target.value || 1) })} />
            </div>
            <div />
            <div><Label>Origem - Tipo</Label>
              <Select value={form.origem_tipo || undefined} onValueChange={(v: any) => setForm({ ...form, origem_tipo: v, origem_id: "" })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{locais.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Origem - Local</Label>
              <Select value={form.origem_id || undefined} onValueChange={(v) => setForm({ ...form, origem_id: v })} disabled={!form.origem_tipo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{localOptions(form.origem_tipo).map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Destino - Tipo</Label>
              <Select value={form.destino_tipo || undefined} onValueChange={(v: any) => setForm({ ...form, destino_tipo: v, destino_id: "" })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{locais.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Destino - Local</Label>
              <Select value={form.destino_id || undefined} onValueChange={(v) => setForm({ ...form, destino_id: v })} disabled={!form.destino_tipo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{localOptions(form.destino_tipo).map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Observação</Label>
              <Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
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
