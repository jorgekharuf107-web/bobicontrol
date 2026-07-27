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
import { TableSearch } from "@/components/table-search";
import { useAccessibleLinhas, LinhaBadge } from "@/lib/use-accessible-linhas";
import { confirmarExclusao } from "@/components/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MovimentacaoForm } from "@/components/movimentacao-form";

export const Route = createFileRoute("/_authenticated/controle-estoque")({
  head: () => ({
    meta: [
      { title: "Controle de Estoque | Bobi Control" },
      { name: "description", content: "Acompanhe o saldo e o histórico de movimentações de bobinas." },
      { property: "og:title", content: "Controle de Estoque | Bobi Control" },
      { property: "og:description", content: "Acompanhe o saldo e o histórico de movimentações de bobinas." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/controle-estoque" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/controle-estoque" }],
  }),
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
  const [linhaFiltro, setLinhaFiltro] = useState<string>("todas");
  const [q, setQ] = useState("");
  const [dIni, setDIni] = useState("");
  const [dFim, setDFim] = useState("");
  const [tecFiltro, setTecFiltro] = useState<string>("todos");
  const [itensOpen, setItensOpen] = useState(false);
  const [itemEditId, setItemEditId] = useState<string | null>(null);
  const [itemNome, setItemNome] = useState("");
  const [itemBpc, setItemBpc] = useState(6);
  const { data: linhas = [] } = useAccessibleLinhas();
  const linhaMap = new Map(linhas.map((l) => [l.id, l]));

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
    queryFn: async () =>
      (await supabase.from("itens").select("id, nome, bobinas_por_caixa, ativo").order("nome")).data ?? [],
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
    if (!(await confirmarExclusao("movimentação"))) return;
    const { error } = await supabase.from("movimentacoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["movs-all"] });
  }

  async function salvarItem() {
    const nome = itemNome.trim();
    if (!nome) return toast.error("Informe o nome do item");
    const bpc = Math.max(1, itemBpc || 1);
    const payload: any = { nome, bobinas_por_caixa: bpc, qtd_por_unidade: bpc, ativo: true };
    const { error } = itemEditId
      ? await supabase.from("itens").update(payload).eq("id", itemEditId)
      : await supabase.from("itens").insert({ ...payload, codigo: nome.toUpperCase().slice(0, 20) });
    if (error) return toast.error(error.message);
    toast.success(itemEditId ? "Item atualizado" : "Item cadastrado");
    setItemEditId(null); setItemNome(""); setItemBpc(6);
    qc.invalidateQueries({ queryKey: ["itens-sel"] });
    qc.invalidateQueries({ queryKey: ["itens-mov"] });
    qc.invalidateQueries({ queryKey: ["itens"] });
  }

  async function excluirItem(id: string) {
    if (!(await confirmarExclusao("item"))) return;
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["itens-sel"] });
    qc.invalidateQueries({ queryKey: ["itens-mov"] });
    qc.invalidateQueries({ queryKey: ["itens"] });
  }



  const tecnicos = (() => {
    const map = new Map<string, string>();
    (movs as any[]).forEach((m) => { if (m.tecnico_id) map.set(m.tecnico_id, m.usuarios?.nome_completo ?? m.tecnico_id); });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  })();

  const movsFiltradas = (movs as any[]).filter((m) => {
    if (linhaFiltro !== "todas" && m.linha_origem_id !== linhaFiltro && m.linha_destino_id !== linhaFiltro) return false;
    if (tecFiltro !== "todos" && m.tecnico_id !== tecFiltro) return false;
    if (dIni && new Date(m.data) < new Date(dIni)) return false;
    if (dFim) { const f = new Date(dFim); f.setHours(23,59,59,999); if (new Date(m.data) > f) return false; }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      const hay = [m.tipo, m.itens?.nome, m.origem_tipo, m.destino_tipo, m.usuarios?.nome_completo, m.observacao, m.status_aprovacao].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  const linhaAfetada = (m: any) => {
    const ids = Array.from(new Set([m.linha_origem_id, m.linha_destino_id].filter(Boolean)));
    return ids.map((id) => linhaMap.get(id)).filter(Boolean);
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-bold">Controle de Estoque</h1>
      </div>

      <Tabs defaultValue="controle">
        <TabsList>
          <TabsTrigger value="controle">Controle de Estoque</TabsTrigger>
          <TabsTrigger value="nova">Nova Movimentação</TabsTrigger>
        </TabsList>

        <TabsContent value="nova" className="pt-3">
          <MovimentacaoForm />
        </TabsContent>

        <TabsContent value="controle" className="space-y-3 pt-3">
      <div className="flex items-center justify-end gap-2 flex-wrap">
          {linhas.length > 1 && (
            <Select value={linhaFiltro} onValueChange={setLinhaFiltro}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar por linha" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as linhas</SelectItem>
                {linhas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <CsvExportButton
            rows={movsFiltradas}
            columns={[
              { header: "Data", accessor: (m: any) => new Date(m.data).toLocaleString("pt-BR") },
              { header: "Tipo", accessor: (m: any) => m.tipo },
              { header: "Item", accessor: (m: any) => m.itens?.nome ?? "" },
              { header: "Qtd", accessor: (m: any) => m.qtd },
              { header: "Origem Tipo", accessor: (m: any) => m.origem_tipo ?? "" },
              { header: "Destino Tipo", accessor: (m: any) => m.destino_tipo ?? "" },
              { header: "Linha(s)", accessor: (m: any) => linhaAfetada(m).map((l: any) => l.nome).join(" / ") },
              { header: "Técnico", accessor: (m: any) => m.usuarios?.nome_completo ?? "" },
              { header: "Status", accessor: (m: any) => m.status_aprovacao ?? "" },
              { header: "Observações", accessor: (m: any) => m.observacao ?? "" },
            ]}
            filename="movimentacoes"
          />
          <Button onClick={startCreate}><Plus className="h-4 w-4" /> Nova Movimentação</Button>
      </div>

      <TableSearch
        search={q} onSearch={setQ}
        placeholder="Pesquisar tipo, item, origem/destino, observação…"
        dataInicio={dIni} onDataInicio={setDIni}
        dataFim={dFim} onDataFim={setDFim}
      >
        {tecnicos.length > 0 && (
          <Select value={tecFiltro} onValueChange={setTecFiltro}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Técnico" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os técnicos</SelectItem>
              {tecnicos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </TableSearch>


      <Card className="p-0 overflow-hidden">
        <table className="excel-table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th className="num">Qtd</th><th>Origem</th><th>Destino</th><th>Linha</th><th>Técnico</th><th>Status</th><th>Observações</th></tr></thead>
          <tbody>
            {movsFiltradas.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8 font-bold text-muted-foreground">Nenhuma movimentação registrada</td></tr>
            )}
            {movsFiltradas.map((m: any) => {
              const st = m.status_aprovacao ?? "aprovado";
              const cls = st === "pendente" ? "bg-yellow-100 text-yellow-800" : st === "rejeitado" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
              const linhasAfe = linhaAfetada(m);
              return (
              <tr key={m.id}>
                <td>{new Date(m.data).toLocaleString("pt-BR")}</td>
                <td>{m.tipo}</td>
                <td>{m.itens?.nome ?? "—"}</td>
                <td className="num">{m.qtd}</td>
                <td>{m.origem_tipo ?? "—"}</td>
                <td>{m.destino_tipo ?? "—"}</td>
                <td>
                  {linhasAfe.length === 0 ? "—" : (
                    <span className="inline-flex flex-wrap gap-1">
                      {linhasAfe.map((l: any) => <LinhaBadge key={l.id} nome={l.nome} cor={l.cor_hex} />)}
                    </span>
                  )}
                </td>
                <td>{m.usuarios?.nome_completo ?? "—"}</td>
                <td><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{st}</span></td>
                <td>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs">{m.observacao || "—"}</span>
                    <span className="whitespace-nowrap">
                      <Button variant="ghost" size="icon" aria-label="Editar registro" onClick={() => startEdit(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Excluir registro" onClick={() => excluir(m.id)}><Trash2 className="h-4 w-4" /></Button>
                    </span>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
        </TabsContent>
      </Tabs>



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
