import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/back-button";
import { TabelaCrud, type Coluna } from "@/components/tabela-crud";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/_authenticated/agendamentos-entrega")({
  component: AgendamentosEntregaPage,
});

type ItemForm = { tipo_bobina: string; quantidade: number };
type Header = {
  estacao_cd_id: string;
  data_hora_entrega: string;
  nome_motorista: string;
  celular_motorista: string;
  transportadora: string;
  numero_nf: string;
  tecnico_id: string;
  status: "Agendado" | "Recebido" | "Cancelado";
  observacao: string;
};
const emptyHeader: Header = {
  estacao_cd_id: "", data_hora_entrega: "", nome_motorista: "", celular_motorista: "",
  transportadora: "", numero_nf: "", tecnico_id: "", status: "Agendado", observacao: "",
};

const STATUS_TONE: Record<string, string> = {
  Agendado: "bg-blue-100 text-blue-900",
  Recebido: "bg-green-100 text-green-900",
  Cancelado: "bg-red-100 text-red-900",
};

function AgendamentosEntregaPage() {
  const qc = useQueryClient();
  const { user, canManageEstoque } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [header, setHeader] = useState<Header>(emptyHeader);
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [novoItem, setNovoItem] = useState<ItemForm>({ tipo_bobina: "", quantidade: 1 });

  const [fCd, setFCd] = useState("todos");
  const [fData, setFData] = useState("");
  const [fTecnico, setFTecnico] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");

  const { data: cds = [] } = useQuery({
    queryKey: ["cds-agend"],
    queryFn: async () =>
      (await supabase.from("cds").select("id, nome_cd, estacoes(nome)").order("nome_cd")).data ?? [],
  });
  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnicos-agend"],
    queryFn: async () =>
      (await supabase.from("usuarios").select("id, nome_completo").eq("ativo", true).order("nome_completo")).data ?? [],
  });
  const { data: tiposBobina = [] } = useQuery({
    queryKey: ["tipos-bobina-agend"],
    queryFn: async () => {
      const { data } = await supabase.from("itens").select("tipo_bobina").not("tipo_bobina", "is", null);
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.tipo_bobina && set.add(r.tipo_bobina));
      return Array.from(set).sort();
    },
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["agendamentos", fCd, fData, fTecnico, fStatus],
    queryFn: async () => {
      let q = supabase
        .from("agendamentos_entrega")
        .select("*, cds(nome_cd, estacoes(nome)), agendamento_itens(id, tipo_bobina, quantidade)")
        .order("data_hora_entrega", { ascending: false });
      if (fCd !== "todos") q = q.eq("estacao_cd_id", fCd);
      if (fTecnico !== "todos") q = q.eq("tecnico_id", fTecnico);
      if (fStatus !== "todos") q = q.eq("status", fStatus);
      if (fData) {
        q = q.gte("data_hora_entrega", `${fData}T00:00:00`).lte("data_hora_entrega", `${fData}T23:59:59`);
      }
      return (await q).data ?? [];
    },
  });

  function resetForm() {
    setHeader(emptyHeader); setItens([]); setNovoItem({ tipo_bobina: "", quantidade: 1 }); setEditingId(null);
  }

  function abrirNovo() {
    resetForm();
    if (user?.id) setHeader((h) => ({ ...h, tecnico_id: user.id }));
    setOpen(true);
  }

  async function abrirEditar(row: any) {
    resetForm();
    setEditingId(row.id);
    setHeader({
      estacao_cd_id: row.estacao_cd_id,
      data_hora_entrega: row.data_hora_entrega?.slice(0, 16) ?? "",
      nome_motorista: row.nome_motorista ?? "",
      celular_motorista: row.celular_motorista ?? "",
      transportadora: row.transportadora ?? "",
      numero_nf: row.numero_nf ?? "",
      tecnico_id: row.tecnico_id ?? "",
      status: row.status,
      observacao: row.observacao ?? "",
    });
    setItens((row.agendamento_itens ?? []).map((i: any) => ({ tipo_bobina: i.tipo_bobina, quantidade: i.quantidade })));
    setOpen(true);
  }

  function addItem() {
    if (!novoItem.tipo_bobina.trim() || novoItem.quantidade <= 0) {
      toast.error("Informe tipo de bobina e quantidade > 0");
      return;
    }
    setItens((arr) => [...arr, novoItem]);
    setNovoItem({ tipo_bobina: "", quantidade: 1 });
  }
  function removeItem(idx: number) {
    setItens((arr) => arr.filter((_, i) => i !== idx));
  }

  async function criarMovimentacaoEntrada(agId: string, cdId: string, itensList: ItemForm[]) {
    const tipos = Array.from(new Set(itensList.map((i) => i.tipo_bobina)));
    const { data: itensDb } = await supabase.from("itens").select("id, tipo_bobina").in("tipo_bobina", tipos);
    const mapa = new Map<string, string>();
    (itensDb ?? []).forEach((it: any) => { if (it.tipo_bobina) mapa.set(it.tipo_bobina, it.id); });

    const rows = itensList.map((i) => ({
      tipo: "Entrada" as const,
      item_id: mapa.get(i.tipo_bobina) ?? null,
      qtd: i.quantidade,
      destino_tipo: "CD" as const,
      destino_id: cdId,
      tecnico_id: user?.id ?? null,
      observacao: `Recebimento agendamento #${agId.slice(0, 8)} — ${i.tipo_bobina}`,
      data: new Date().toISOString(),
      status_aprovacao: "aprovado",
    }));
    if (rows.length) {
      const { error } = await supabase.from("movimentacoes").insert(rows as any);
      if (error) throw error;
    }
  }

  async function salvar() {
    if (!header.estacao_cd_id) return toast.error("Selecione o CD de destino");
    if (!header.data_hora_entrega) return toast.error("Informe a data/hora de entrega");
    if (!header.nome_motorista.trim()) return toast.error("Informe o nome do motorista");
    if (itens.length === 0) return toast.error("Adicione ao menos um item");

    const payload = {
      estacao_cd_id: header.estacao_cd_id,
      data_hora_entrega: new Date(header.data_hora_entrega).toISOString(),
      nome_motorista: header.nome_motorista.trim(),
      celular_motorista: header.celular_motorista || null,
      transportadora: header.transportadora || null,
      numero_nf: header.numero_nf || null,
      tecnico_id: header.tecnico_id || null,
      status: header.status,
      observacao: header.observacao || null,
    };

    let previous: any = null;
    if (editingId) {
      const { data: prev } = await supabase.from("agendamentos_entrega").select("status").eq("id", editingId).maybeSingle();
      previous = prev;
      const { error } = await supabase.from("agendamentos_entrega").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      await supabase.from("agendamento_itens").delete().eq("agendamento_id", editingId);
      const itRows = itens.map((i) => ({ agendamento_id: editingId, tipo_bobina: i.tipo_bobina, quantidade: i.quantidade }));
      if (itRows.length) await supabase.from("agendamento_itens").insert(itRows);
    } else {
      const { data: ins, error } = await supabase.from("agendamentos_entrega").insert(payload).select("id").maybeSingle();
      if (error || !ins) return toast.error(error?.message ?? "Erro ao criar");
      const itRows = itens.map((i) => ({ agendamento_id: ins.id, tipo_bobina: i.tipo_bobina, quantidade: i.quantidade }));
      if (itRows.length) await supabase.from("agendamento_itens").insert(itRows);
      previous = { status: "Agendado" };
      if (header.status === "Recebido") {
        try { await criarMovimentacaoEntrada(ins.id, header.estacao_cd_id, itens); }
        catch (e: any) { toast.error("Agendamento criado, mas falha ao gerar entrada: " + e.message); }
      }
    }

    if (editingId && previous?.status !== "Recebido" && header.status === "Recebido") {
      try { await criarMovimentacaoEntrada(editingId, header.estacao_cd_id, itens); }
      catch (e: any) { toast.error("Status atualizado, mas falha ao gerar entrada: " + e.message); }
    }

    toast.success(editingId ? "Agendamento atualizado" : "Agendamento criado");
    qc.invalidateQueries({ queryKey: ["agendamentos"] });
    setOpen(false);
    resetForm();
  }

  async function marcarRecebido(row: any) {
    const { error } = await supabase.from("agendamentos_entrega").update({ status: "Recebido" }).eq("id", row.id);
    if (error) return toast.error(error.message);
    try {
      await criarMovimentacaoEntrada(row.id, row.estacao_cd_id,
        (row.agendamento_itens ?? []).map((i: any) => ({ tipo_bobina: i.tipo_bobina, quantidade: i.quantidade })));
    } catch (e: any) { toast.error("Falha ao gerar entrada: " + e.message); }
    toast.success("Marcado como Recebido e entrada gerada no CD");
    qc.invalidateQueries({ queryKey: ["agendamentos"] });
  }

  async function excluir(id: string) {
    if (!confirm("Excluir agendamento?")) return;
    const { error } = await supabase.from("agendamentos_entrega").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    qc.invalidateQueries({ queryKey: ["agendamentos"] });
  }

  const colunas: Coluna<any>[] = [
    { header: "Data/Hora", cell: (r) => new Date(r.data_hora_entrega).toLocaleString("pt-BR"),
      csv: (r) => new Date(r.data_hora_entrega).toLocaleString("pt-BR") },
    { header: "CD / Estação", cell: (r) => `${r.cds?.nome_cd ?? "—"} / ${r.cds?.estacoes?.nome ?? "—"}`,
      csv: (r) => `${r.cds?.nome_cd ?? ""} / ${r.cds?.estacoes?.nome ?? ""}` },
    { header: "Motorista", cell: (r) => r.nome_motorista, csv: (r) => r.nome_motorista },
    { header: "Transportadora", cell: (r) => r.transportadora ?? "—", csv: (r) => r.transportadora ?? "" },
    { header: "NF", cell: (r) => r.numero_nf ?? "—", csv: (r) => r.numero_nf ?? "" },
    { header: "Itens", cell: (r) => (r.agendamento_itens ?? []).reduce((s: number, i: any) => s + i.quantidade, 0),
      csv: (r) => (r.agendamento_itens ?? []).reduce((s: number, i: any) => s + i.quantidade, 0) },
    { header: "Status", cell: (r) => (
        <Badge className={STATUS_TONE[r.status] ?? ""} variant="secondary">{r.status}</Badge>
      ), csv: (r) => r.status },
  ];

  return (
    <div className="space-y-4">
      <BackButton />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos de Entrega</h1>
          <p className="text-sm text-muted-foreground">Recepção de bobinas no CD da estação</p>
        </div>
        {canManageEstoque && (
          <Button onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo Agendamento</Button>
        )}
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label>CD</Label>
            <Select value={fCd} onValueChange={setFCd}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {cds.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_cd} — {c.estacoes?.nome ?? "—"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" className="h-9" value={fData} onChange={(e) => setFData(e.target.value)} />
          </div>
          <div>
            <Label>Técnico</Label>
            <Select value={fTecnico} onValueChange={setFTecnico}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tecnicos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Agendado">Agendado</SelectItem>
                <SelectItem value="Recebido">Recebido</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <TabelaCrud
        data={agendamentos}
        colunas={colunas}
        rowKey={(r) => r.id}
        csvFilename="agendamentos-entrega"
        emptyMessage="Nenhum agendamento encontrado"
        acoes={(r) => (
          <div className="flex gap-1">
            {r.status === "Agendado" && canManageEstoque && (
              <Button size="sm" variant="outline" title="Marcar Recebido" onClick={() => marcarRecebido(r)}>
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => abrirEditar(r)}><Pencil className="h-4 w-4" /></Button>
            {canManageEstoque && (
              <Button size="sm" variant="ghost" onClick={() => excluir(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            )}
          </div>
        )}
      />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>CD / Estação de recebimento *</Label>
              <Select value={header.estacao_cd_id} onValueChange={(v) => setHeader({ ...header, estacao_cd_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o CD" /></SelectTrigger>
                <SelectContent>
                  {cds.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_cd} — {c.estacoes?.nome ?? "—"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data/Hora *</Label>
              <Input type="datetime-local" className="h-9"
                value={header.data_hora_entrega}
                onChange={(e) => setHeader({ ...header, data_hora_entrega: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={header.status} onValueChange={(v: any) => setHeader({ ...header, status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agendado">Agendado</SelectItem>
                  <SelectItem value="Recebido">Recebido</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motorista *</Label>
              <Input className="h-9" value={header.nome_motorista}
                onChange={(e) => setHeader({ ...header, nome_motorista: e.target.value })} />
            </div>
            <div>
              <Label>Celular Motorista</Label>
              <Input className="h-9" value={header.celular_motorista}
                onChange={(e) => setHeader({ ...header, celular_motorista: e.target.value })} />
            </div>
            <div>
              <Label>Transportadora</Label>
              <Input className="h-9" value={header.transportadora}
                onChange={(e) => setHeader({ ...header, transportadora: e.target.value })} />
            </div>
            <div>
              <Label>Nº NF</Label>
              <Input className="h-9" value={header.numero_nf}
                onChange={(e) => setHeader({ ...header, numero_nf: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Técnico Responsável</Label>
              <Select value={header.tecnico_id} onValueChange={(v) => setHeader({ ...header, tecnico_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_completo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Observação</Label>
              <Textarea rows={2} value={header.observacao}
                onChange={(e) => setHeader({ ...header, observacao: e.target.value })} />
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-semibold">Itens do Agendamento</p>
            <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
              <div>
                <Label>Tipo de Bobina</Label>
                <Select value={novoItem.tipo_bobina} onValueChange={(v) => setNovoItem({ ...novoItem, tipo_bobina: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione ou digite" /></SelectTrigger>
                  <SelectContent>
                    {tiposBobina.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min={1} className="h-9" value={novoItem.quantidade}
                  onChange={(e) => setNovoItem({ ...novoItem, quantidade: Number(e.target.value) })} />
              </div>
              <Button type="button" onClick={addItem}><Plus className="h-4 w-4" /></Button>
            </div>
            <Card className="p-0 overflow-hidden">
              <table className="excel-table">
                <thead><tr><th>Tipo de Bobina</th><th>Qtd</th><th>Ações</th></tr></thead>
                <tbody>
                  {itens.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-4 text-muted-foreground">Nenhum item</td></tr>
                  )}
                  {itens.map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.tipo_bobina}</td>
                      <td>{i.quantidade}</td>
                      <td>
                        <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            {header.status === "Recebido" && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
                Ao salvar como "Recebido", será gerada uma Entrada no estoque do CD com a soma das quantidades.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
