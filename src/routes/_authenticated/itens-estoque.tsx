import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";

export const Route = createFileRoute("/_authenticated/itens-estoque")({
  component: ItensPage,
});

const unidades = ["Unidade", "Caixa", "Pacote", "Rolo"] as const;

const itemSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do item").max(120),
  codigo: z.string().trim().min(1, "Informe o código").max(40),
  unidade: z.enum(unidades),
  qtd_por_unidade: z.number().int().min(1, "Quantidade deve ser ≥ 1"),
  medida: z.string().trim().max(40).optional().or(z.literal("")),
  estoque_minimo: z.number().int().min(0, "Estoque mínimo deve ser ≥ 0"),
  descricao: z.string().max(1000).optional().or(z.literal("")),
  fornecedor_padrao_id: z.string().uuid().optional().or(z.literal("")),
  ativo: z.boolean(),
}).refine((v) => v.unidade !== "Unidade" || v.qtd_por_unidade === 1, {
  message: "Quando a unidade é 'Unidade', a quantidade por unidade deve ser 1",
  path: ["qtd_por_unidade"],
});

type ItemForm = z.infer<typeof itemSchema>;
const empty: ItemForm = { nome: "", codigo: "", unidade: "Unidade", qtd_por_unidade: 1, medida: "", estoque_minimo: 0, descricao: "", fornecedor_padrao_id: "", ativo: true };

function ItensPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(empty);
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState("nome");
  const [direcao, setDirecao] = useState<"asc" | "desc">("asc");

  const { data: itens = [] } = useQuery({
    queryKey: ["itens"],
    queryFn: async () => (await supabase.from("itens").select("*").order("nome")).data ?? [],
  });
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-select"],
    queryFn: async () => (await supabase.from("fornecedores").select("id, razao_social").order("razao_social")).data ?? [],
  });

  const filtrados = useMemo(() => {
    const f = busca.toLowerCase();
    const arr = itens.filter((i: any) =>
      !f || i.nome?.toLowerCase().includes(f) || i.codigo?.toLowerCase().includes(f) || i.medida?.toLowerCase().includes(f)
    );
    arr.sort((a: any, b: any) => {
      const av = (a[ordenar] ?? "").toString();
      const bv = (b[ordenar] ?? "").toString();
      return direcao === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return arr;
  }, [itens, busca, ordenar, direcao]);

  function startCreate() { setEditingId(null); setForm(empty); setOpen(true); }
  function startEdit(it: any) {
    setEditingId(it.id);
    setForm({
      nome: it.nome, codigo: it.codigo, unidade: it.unidade, qtd_por_unidade: it.qtd_por_unidade,
      medida: it.medida ?? "", estoque_minimo: it.estoque_minimo,
      descricao: it.descricao ?? "", fornecedor_padrao_id: it.fornecedor_padrao_id ?? "", ativo: it.ativo,
    });
    setOpen(true);
  }

  async function salvar() {
    const parsed = itemSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const payload = { ...parsed.data, medida: parsed.data.medida || null, descricao: parsed.data.descricao || null, fornecedor_padrao_id: parsed.data.fornecedor_padrao_id || null };
    const { error } = editingId
      ? await supabase.from("itens").update(payload).eq("id", editingId)
      : await supabase.from("itens").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Item atualizado" : "Item criado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["itens"] });
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("itens").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["itens"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-bold">Itens de Estoque</h1>
        </div>
        <div className="flex items-center gap-2">
          <CsvExportButton
            rows={filtrados}
            columns={[
              { header: "Código", accessor: (i: any) => i.codigo },
              { header: "Nome", accessor: (i: any) => i.nome },
              { header: "Medida", accessor: (i: any) => i.medida ?? "" },
              { header: "Unidade", accessor: (i: any) => i.unidade },
              { header: "Qtd por Unidade", accessor: (i: any) => i.qtd_por_unidade },
              { header: "Estoque Mínimo", accessor: (i: any) => i.estoque_minimo },
              { header: "Status", accessor: (i: any) => (i.ativo ? "Ativo" : "Inativo") },
            ]}
            filename="itens-estoque"
          />
          <Button onClick={startCreate}><Plus className="h-4 w-4" /> Novo Item</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px]">
          <Label>Pesquisar</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input placeholder="Pesquisar itens..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
          </div>
        </div>
        <div><Label>Ordenar</Label>
          <Select value={ordenar} onValueChange={setOrdenar}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome</SelectItem>
              <SelectItem value="codigo">Código</SelectItem>
              <SelectItem value="medida">Medida</SelectItem>
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
            <th>Código</th><th>Nome</th><th>Medida</th><th>Unidade</th><th>Qtd por Unidade</th><th>Estoque Mínimo</th><th>Status</th><th>Ações</th>
          </tr></thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={8} className="text-center py-8 font-bold text-muted-foreground">Nenhum item cadastrado</td></tr>}
            {filtrados.map((i: any) => (
              <tr key={i.id}>
                <td>{i.codigo}</td><td>{i.nome}</td><td>{i.medida ?? "—"}</td>
                <td>{i.unidade}</td><td>{i.qtd_por_unidade}</td><td>{i.estoque_minimo}</td>
                <td>{i.ativo ? "Ativo" : "Inativo"}</td>
                <td className="whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(i)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => excluir(i.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar Item" : "Novo Item"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome do Item</Label>
              <Input placeholder="Ex: Bobina Térmica 80mm" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div><Label>Código</Label>
              <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div><Label>Unidade</Label>
              <Select value={form.unidade} onValueChange={(v: any) => setForm({ ...form, unidade: v, qtd_por_unidade: v === "Unidade" ? 1 : form.qtd_por_unidade })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Qtd por Unidade</Label>
              <Input
                type="number"
                min={1}
                max={form.unidade === "Unidade" ? 1 : undefined}
                value={form.unidade === "Unidade" ? 1 : form.qtd_por_unidade}
                onChange={(e) => {
                  if (form.unidade === "Unidade") return;
                  setForm({ ...form, qtd_por_unidade: Math.max(1, +e.target.value || 1) });
                }}
                disabled={form.unidade === "Unidade"}
              />
              {form.unidade === "Unidade" && (
                <p className="text-xs text-muted-foreground mt-1">Travado em 1 quando a unidade é "Unidade".</p>
              )}
            </div>
            <div><Label>Medida</Label>
              <Input placeholder="Ex: 80mm" value={form.medida} onChange={(e) => setForm({ ...form, medida: e.target.value })} />
            </div>
            <div><Label>Estoque Mínimo</Label>
              <Input type="number" min={0} value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: Math.max(0, +e.target.value || 0) })} />
            </div>
            <div className="col-span-2"><Label>Descrição</Label>
              <Textarea placeholder="Descrição detalhada do item" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="col-span-2"><Label>Fornecedor Padrão</Label>
              <Select value={form.fornecedor_padrao_id || undefined} onValueChange={(v) => setForm({ ...form, fornecedor_padrao_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                <SelectContent>{fornecedores.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Item ativo</Label>
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
