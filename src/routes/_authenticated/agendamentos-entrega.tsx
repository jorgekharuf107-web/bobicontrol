import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/back-button";
import { TabelaCrud, type Coluna } from "@/components/tabela-crud";
import { TableSearch } from "@/components/table-search";
import { useCurrentUser } from "@/lib/use-current-user";
import { useServerFn } from "@tanstack/react-start";
import { sendEmail } from "@/lib/email.functions";
import { confirmarExclusao } from "@/components/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/agendamentos-entrega")({
  head: () => ({
    meta: [
      { title: "Agendamentos de Entrega | Bobi Control" },
      { name: "description", content: "Agende e acompanhe entregas de bobinas por fornecedor, motorista e status." },
      { property: "og:title", content: "Agendamentos de Entrega | Bobi Control" },
      { property: "og:description", content: "Agende e acompanhe entregas de bobinas por fornecedor, motorista e status." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/agendamentos-entrega" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/agendamentos-entrega" }],
  }),
  component: AgendamentosEntregaPage,
});

type ItemForm = {
  item_id: string;
  qtd_caixas: number;
  qtd_bobina_100: number;
  qtd_bobina_50: number;
};
type Header = {
  estacao_cd_id: string;
  data_hora_entrega: string;
  nome_motorista: string;
  celular_motorista: string;
  transportadora: string;
  numero_nf: string;
  tecnico_id: string;
  status: "Agendado" | "Recebido" | "Cancelado";
  modo_offline: boolean;
  observacao: string;
};
const emptyHeader: Header = {
  estacao_cd_id: "", data_hora_entrega: "", nome_motorista: "", celular_motorista: "",
  transportadora: "", numero_nf: "", tecnico_id: "", status: "Agendado",
  modo_offline: false, observacao: "",
};
const emptyItem: ItemForm = { item_id: "", qtd_caixas: 0, qtd_bobina_100: 0, qtd_bobina_50: 0 };

const STATUS_TONE: Record<string, string> = {
  Agendado: "bg-blue-100 text-blue-900",
  Recebido: "bg-green-100 text-green-900",
  Cancelado: "bg-red-100 text-red-900",
};

function AgendamentosEntregaPage() {
  const qc = useQueryClient();
  const { user, canManageEstoque } = useCurrentUser();
  const send = useServerFn(sendEmail);
  const [aba, setAba] = useState("lista");
  const [fornecedorId, setFornecedorId] = useState("");
  const [fItemDataHora, setFItemDataHora] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [header, setHeader] = useState<Header>(emptyHeader);
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [novoItem, setNovoItem] = useState<ItemForm>(emptyItem);

  const [fCd, setFCd] = useState("todos");
  const [fData, setFData] = useState("");
  const [fDataFim, setFDataFim] = useState("");
  const [fTecnico, setFTecnico] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [fMotorista, setFMotorista] = useState("");
  const [busca, setBusca] = useState("");


  // Só CDs vinculados a estações (todo CD já pertence a uma estação, portanto lista todos)
  const { data: cds = [] } = useQuery({
    queryKey: ["cds-agend"],
    queryFn: async () =>
      (await supabase.from("cds").select("id, nome_cd, estacoes(nome)").order("nome_cd")).data ?? [],
  });
  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnicos-agend"],
    queryFn: async () =>
      (await supabase.from("usuarios").select("id, nome_completo, email").eq("ativo", true).order("nome_completo")).data ?? [],
  });
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-agend"],
    queryFn: async () =>
      (await supabase.from("fornecedores").select("id, razao_social, telefone, fornecedor_padrao")
        .order("razao_social")).data ?? [],
  });
  const { data: motoristas = [] } = useQuery({
    queryKey: ["motoristas-agend", fornecedorId],
    enabled: !!fornecedorId,
    queryFn: async () =>
      (await supabase.from("motoristas").select("id, nome_completo, celular, tipo_contato")
        .eq("fornecedor_id", fornecedorId).order("tipo_contato")).data ?? [],
  });
  const contatosFornecedor = (motoristas as any[]).slice(0, 2);

  // Auto-preenche Motorista (1º contato) ao selecionar o Fornecedor
  useEffect(() => {
    if (!fornecedorId) return;
    const primeiro = (motoristas as any[])[0];
    if (!primeiro) return;
    setHeader((h) => (h.nome_motorista ? h : {
      ...h,
      nome_motorista: primeiro.nome_completo ?? "",
      celular_motorista: primeiro.celular ?? h.celular_motorista,
    }));
  }, [fornecedorId, motoristas]);

  function usarContato(m: any) {
    setHeader((h) => ({ ...h, nome_motorista: m.nome_completo ?? "", celular_motorista: m.celular ?? "" }));
  }
  function aplicarFornecedor(id: string) {
    setFornecedorId(id);
    const f = (fornecedores as any[]).find((x) => x.id === id);
    setHeader((h) => ({ ...h, transportadora: f?.razao_social ?? h.transportadora }));
  }

  const { data: itensCatalogo = [] } = useQuery({
    queryKey: ["itens-agend"],
    queryFn: async () =>
      (await supabase.from("itens").select("id, tipo_bobina, descricao").order("tipo_bobina")).data ?? [],
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["agendamentos", fCd, fData, fDataFim, fTecnico, fStatus],
    queryFn: async () => {
      let q = supabase
        .from("agendamentos_entrega")
        .select("*, cds(nome_cd, estacoes(nome)), agendamento_itens(id, item_id, qtd_caixas, qtd_bobina_100, qtd_bobina_50, tipo_bobina, quantidade, itens(tipo_bobina))")
        .order("data_hora_entrega", { ascending: false });
      if (fCd !== "todos") q = q.eq("estacao_cd_id", fCd);
      if (fTecnico !== "todos") q = q.eq("tecnico_id", fTecnico);
      if (fStatus !== "todos") q = q.eq("status", fStatus);
      if (fData) q = q.gte("data_hora_entrega", `${fData}T00:00:00`);
      if (fDataFim) q = q.lte("data_hora_entrega", `${fDataFim}T23:59:59`);
      return (await q).data ?? [];
    },
  });

  const agendamentosFiltrados = (() => {
    const t = busca.trim().toLowerCase();
    const m = fMotorista.trim().toLowerCase();
    return (agendamentos as any[]).filter((r) => {
      if (m && !String(r.nome_motorista ?? "").toLowerCase().includes(m)) return false;
      if (!t) return true;
      return [r.nome_motorista, r.celular_motorista, r.transportadora, r.numero_nf, r.observacao,
        r.cds?.nome_cd, r.cds?.estacoes?.nome]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(t));
    });
  })();


  function resetForm() {
    setHeader(emptyHeader); setItens([]); setNovoItem(emptyItem); setEditingId(null); setFornecedorId("");
  }
  function abrirNovo() {
    resetForm();
    if (user?.id) setHeader((h) => ({ ...h, tecnico_id: user.id }));
    const padrao = (fornecedores as any[]).find((f) => f.fornecedor_padrao);
    if (padrao) aplicarFornecedor(padrao.id);
    setAba("novo");
  }
  function abrirEditar(row: any) {
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
      modo_offline: !!row.modo_offline,
      observacao: row.observacao ?? "",
    });
    setItens((row.agendamento_itens ?? []).map((i: any) => ({
      item_id: i.item_id ?? "",
      qtd_caixas: i.qtd_caixas ?? 0,
      qtd_bobina_100: i.qtd_bobina_100 ?? 0,
      qtd_bobina_50: i.qtd_bobina_50 ?? 0,
    })));
    setAba("novo");
  }

  function addItem() {
    if (!novoItem.item_id) return toast.error("Selecione o item");
    const total = novoItem.qtd_caixas + novoItem.qtd_bobina_100 + novoItem.qtd_bobina_50;
    if (total <= 0) return toast.error("Informe pelo menos uma quantidade");
    setItens((arr) => [...arr, novoItem]);
    setNovoItem(emptyItem);
  }
  function removeItem(idx: number) { setItens((arr) => arr.filter((_, i) => i !== idx)); }

  async function criarMovimentacoesRecebimento(agId: string, cdId: string, itensList: ItemForm[]) {
    const rows = itensList.map((i) => {
      const qtd = i.qtd_caixas * 3 + i.qtd_bobina_100 + i.qtd_bobina_50;
      return {
        tipo: "Recebimento" as const,
        item_id: i.item_id,
        qtd,
        qtd_caixas: i.qtd_caixas,
        qtd_bobina_100: i.qtd_bobina_100,
        qtd_bobina_50: i.qtd_bobina_50,
        destino_tipo: "CD" as const,
        destino_id: cdId,
        tecnico_id: user?.id ?? null,
        observacao: `Recebimento agendamento #${agId.slice(0, 8)}`,
        data: new Date().toISOString(),
        status_aprovacao: "aprovado",
      };
    });
    if (rows.length) {
      const { error } = await supabase.from("movimentacoes").insert(rows as any);
      if (error) throw error;
    }
  }

  async function enviarEmailSeguro(to: string | null | undefined, subject: string, html: string) {
    if (!to) return;
    try { await send({ data: { to, subject, html } }); } catch { /* silencioso */ }
  }

  function emailTecnico(id: string | null | undefined): string | null {
    if (!id) return null;
    const t = (tecnicos as any[]).find((x) => x.id === id);
    return t?.email ?? null;
  }

  function htmlAgendamento(h: Header, tituloExtra = "") {
    const cd = (cds as any[]).find((c) => c.id === h.estacao_cd_id);
    const totalItens = itens.reduce((s, i) => s + i.qtd_caixas * 3 + i.qtd_bobina_100 + i.qtd_bobina_50, 0);
    return `
      <div style="font-family:Arial,sans-serif">
        <h2>Bobi Control — Agendamento de Entrega ${tituloExtra}</h2>
        <p><b>CD/Estação:</b> ${cd?.nome_cd ?? "—"} / ${cd?.estacoes?.nome ?? "—"}</p>
        <p><b>Data/Hora:</b> ${new Date(h.data_hora_entrega).toLocaleString("pt-BR")}</p>
        <p><b>Motorista:</b> ${h.nome_motorista} ${h.celular_motorista ? "(" + h.celular_motorista + ")" : ""}</p>
        <p><b>Transportadora:</b> ${h.transportadora || "—"} · <b>NF:</b> ${h.numero_nf || "—"}</p>
        <p><b>Status:</b> ${h.status} ${h.modo_offline ? " · Técnico offline em campo" : ""}</p>
        <p><b>Total (bobinas):</b> ${totalItens}</p>
      </div>`;
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
      modo_offline: header.modo_offline,
      observacao: header.observacao || null,
    };

    let previous: any = null;
    let currentId = editingId;
    if (editingId) {
      const { data: prev } = await supabase.from("agendamentos_entrega").select("status").eq("id", editingId).maybeSingle();
      previous = prev;
      const { error } = await supabase.from("agendamentos_entrega").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      await supabase.from("agendamento_itens").delete().eq("agendamento_id", editingId);
      const itRows = itens.map((i) => ({ agendamento_id: editingId, ...i }));
      if (itRows.length) await supabase.from("agendamento_itens").insert(itRows);
    } else {
      const { data: ins, error } = await supabase.from("agendamentos_entrega").insert(payload).select("id").maybeSingle();
      if (error || !ins) return toast.error(error?.message ?? "Erro ao criar");
      currentId = ins.id;
      const itRows = itens.map((i) => ({ agendamento_id: ins.id, ...i }));
      if (itRows.length) await supabase.from("agendamento_itens").insert(itRows);
      previous = { status: "Agendado" };
      // e-mail: criação
      enviarEmailSeguro(emailTecnico(header.tecnico_id), "Novo agendamento de entrega", htmlAgendamento(header, "— Novo"));
    }

    const virouRecebido = previous?.status !== "Recebido" && header.status === "Recebido";
    if (virouRecebido && currentId) {
      try { await criarMovimentacoesRecebimento(currentId, header.estacao_cd_id, itens); }
      catch (e: any) { toast.error("Falha ao gerar entrada: " + e.message); }
      enviarEmailSeguro(emailTecnico(header.tecnico_id), "Entrega confirmada como recebida", htmlAgendamento(header, "— Recebido"));
    }

    toast.success(editingId ? "Agendamento atualizado" : "Agendamento criado");
    qc.invalidateQueries({ queryKey: ["agendamentos"] });
    resetForm();
    setAba("lista");
  }

  async function marcarRecebido(row: any) {
    const { error } = await supabase.from("agendamentos_entrega").update({ status: "Recebido" }).eq("id", row.id);
    if (error) return toast.error(error.message);
    const itensList: ItemForm[] = (row.agendamento_itens ?? []).map((i: any) => ({
      item_id: i.item_id,
      qtd_caixas: i.qtd_caixas ?? 0,
      qtd_bobina_100: i.qtd_bobina_100 ?? 0,
      qtd_bobina_50: i.qtd_bobina_50 ?? 0,
    })).filter((i: ItemForm) => i.item_id);
    try { await criarMovimentacoesRecebimento(row.id, row.estacao_cd_id, itensList); }
    catch (e: any) { toast.error("Falha ao gerar entrada: " + e.message); }
    enviarEmailSeguro(emailTecnico(row.tecnico_id), "Entrega confirmada como recebida",
      `<p>Agendamento <b>#${row.id.slice(0,8)}</b> marcado como <b>Recebido</b>.</p>`);
    toast.success("Marcado como Recebido e entrada gerada no CD");
    qc.invalidateQueries({ queryKey: ["agendamentos"] });
  }

  async function excluir(id: string) {
    if (!(await confirmarExclusao("agendamento"))) return;
    const { error } = await supabase.from("agendamentos_entrega").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    qc.invalidateQueries({ queryKey: ["agendamentos"] });
  }

  function totalBobinas(r: any) {
    return (r.agendamento_itens ?? []).reduce((s: number, i: any) => {
      const legado = i.quantidade ?? 0;
      return s + (i.qtd_caixas ?? 0) * 3 + (i.qtd_bobina_100 ?? 0) + (i.qtd_bobina_50 ?? 0) + legado;
    }, 0);
  }

  const colunas: Coluna<any>[] = [
    { header: "Data/Hora", cell: (r) => new Date(r.data_hora_entrega).toLocaleString("pt-BR"),
      csv: (r) => new Date(r.data_hora_entrega).toLocaleString("pt-BR") },
    { header: "CD / Estação", cell: (r) => `${r.cds?.nome_cd ?? "—"} / ${r.cds?.estacoes?.nome ?? "—"}`,
      csv: (r) => `${r.cds?.nome_cd ?? ""} / ${r.cds?.estacoes?.nome ?? ""}` },
    { header: "Motorista", cell: (r) => r.nome_motorista, csv: (r) => r.nome_motorista },
    { header: "Transportadora", cell: (r) => r.transportadora ?? "—", csv: (r) => r.transportadora ?? "" },
    { header: "NF", cell: (r) => r.numero_nf ?? "—", csv: (r) => r.numero_nf ?? "" },
    { header: "Total Bobinas", cell: (r) => totalBobinas(r), csv: (r) => totalBobinas(r) },
    { header: "Offline", cell: (r) => r.modo_offline ? <CloudOff className="h-4 w-4 text-slate-600" /> : "—",
      csv: (r) => (r.modo_offline ? "Sim" : "Não") },
    { header: "Status", cell: (r) => (
        <Badge className={STATUS_TONE[r.status] ?? ""} variant="secondary">{r.status}</Badge>
      ), csv: (r) => r.status },
  ];

  // Aba 3 — todos os itens de agendamento, achatados com Data/Hora
  const itensFlat = (agendamentosFiltrados as any[]).flatMap((r) =>
    (r.agendamento_itens ?? []).map((i: any) => ({
      id: i.id,
      data_hora: r.data_hora_entrega,
      cd: `${r.cds?.nome_cd ?? "—"} / ${r.cds?.estacoes?.nome ?? "—"}`,
      item: i.itens?.tipo_bobina ?? "—",
      qtd_caixas: i.qtd_caixas ?? 0,
      qtd_bobina_100: i.qtd_bobina_100 ?? 0,
      qtd_bobina_50: i.qtd_bobina_50 ?? 0,
      total: (i.qtd_caixas ?? 0) * 3 + (i.qtd_bobina_100 ?? 0) + (i.qtd_bobina_50 ?? 0) + (i.quantidade ?? 0),
      status: r.status,
    })),
  );
  const itensFlatFiltrados = itensFlat.filter((i) => {
    if (!fItemDataHora) return true;
    return String(i.data_hora ?? "").startsWith(fItemDataHora);
  });

  const colunasItens: Coluna<any>[] = [
    { header: "Data/Hora", cell: (i) => new Date(i.data_hora).toLocaleString("pt-BR"), csv: (i) => new Date(i.data_hora).toLocaleString("pt-BR") },
    { header: "CD / Estação", cell: (i) => i.cd, csv: (i) => i.cd },
    { header: "Item", cell: (i) => i.item, csv: (i) => i.item },
    { header: "Caixas", className: "num", cell: (i) => i.qtd_caixas, csv: (i) => i.qtd_caixas },
    { header: "Bob. 100%", className: "num", cell: (i) => i.qtd_bobina_100, csv: (i) => i.qtd_bobina_100 },
    { header: "Bob. <50%", className: "num", cell: (i) => i.qtd_bobina_50, csv: (i) => i.qtd_bobina_50 },
    { header: "Total", className: "num", cell: (i) => <b>{i.total}</b>, csv: (i) => i.total },
    { header: "Status", cell: (i) => i.status, csv: (i) => i.status },
  ];

  const formAgendamento = (
    <Card className="p-3 space-y-3">
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

        <div className="sm:col-span-2 rounded border bg-muted/40 p-2 space-y-2">
          <Label className="text-[11px]">Fornecedor / Transportadora (auto-preenche motorista)</Label>
          <Select value={fornecedorId || undefined} onValueChange={aplicarFornecedor}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
            <SelectContent>
              {fornecedores.map((f: any) => (
                <SelectItem key={f.id} value={f.id}>{f.razao_social}{f.fornecedor_padrao ? " (padrão)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {contatosFornecedor.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contatosFornecedor.map((m: any, idx: number) => (
                <Button key={m.id} type="button" size="sm" variant="outline"
                  onClick={() => usarContato(m)}>
                  {idx + 1}º contato: {m.nome_completo}{m.celular ? ` · ${m.celular}` : ""}
                </Button>
              ))}
            </div>
          )}
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
        <div className="sm:col-span-2 flex items-center gap-2">
          <Checkbox id="offline" checked={header.modo_offline}
            onCheckedChange={(c) => setHeader({ ...header, modo_offline: !!c })} />
          <Label htmlFor="offline" className="cursor-pointer flex items-center gap-1">
            <CloudOff className="h-4 w-4" /> Técnico estará Offline em campo
          </Label>
        </div>
        <div className="sm:col-span-2">
          <Label>Observação</Label>
          <Textarea rows={2} value={header.observacao}
            onChange={(e) => setHeader({ ...header, observacao: e.target.value })} />
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <p className="text-sm font-semibold">Itens do Agendamento</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_90px_90px_90px_auto] gap-2 items-end">
          <div>
            <Label>Item</Label>
            <Select value={novoItem.item_id} onValueChange={(v) => setNovoItem({ ...novoItem, item_id: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {itensCatalogo.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.tipo_bobina ?? t.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Caixas</Label>
            <Input type="number" min={0} className="h-9" value={novoItem.qtd_caixas}
              onChange={(e) => setNovoItem({ ...novoItem, qtd_caixas: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Bob. 100%</Label>
            <Input type="number" min={0} className="h-9" value={novoItem.qtd_bobina_100}
              onChange={(e) => setNovoItem({ ...novoItem, qtd_bobina_100: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Bob. &lt;50%</Label>
            <Input type="number" min={0} className="h-9" value={novoItem.qtd_bobina_50}
              onChange={(e) => setNovoItem({ ...novoItem, qtd_bobina_50: Number(e.target.value) || 0 })} />
          </div>
          <Button type="button" onClick={addItem}><Plus className="h-4 w-4" /></Button>
        </div>
        <Card className="p-0 overflow-hidden">
          <table className="excel-table">
            <thead>
              <tr><th>Item</th><th className="num">Caixas</th><th className="num">Bob. 100%</th><th className="num">Bob. &lt;50%</th><th className="num">Total</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {itens.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">Nenhum item</td></tr>
              )}
              {itens.map((i, idx) => {
                const item = (itensCatalogo as any[]).find((x) => x.id === i.item_id);
                const total = i.qtd_caixas * 3 + i.qtd_bobina_100 + i.qtd_bobina_50;
                return (
                  <tr key={idx}>
                    <td>{item?.tipo_bobina ?? item?.descricao ?? "—"}</td>
                    <td className="num">{i.qtd_caixas}</td>
                    <td className="num">{i.qtd_bobina_100}</td>
                    <td className="num">{i.qtd_bobina_50}</td>
                    <td className="num"><b>{total}</b></td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
        {header.status === "Recebido" && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
            Ao salvar como "Recebido", será gerada uma Movimentação de <b>Recebimento</b> no CD para cada item.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={resetForm}>Cancelar</Button>
        <Button onClick={salvar}>{editingId ? "Salvar" : "Criar"}</Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <BackButton />
      <div>
        <h1 className="text-2xl font-bold">Agendamentos de Entrega</h1>
        <p className="text-sm text-muted-foreground">Recepção de bobinas no CD da estação</p>
      </div>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="lista">Agendamentos de Entrega</TabsTrigger>
          <TabsTrigger value="novo">Novo Agendamento</TabsTrigger>
          <TabsTrigger value="itens">Itens do Agendamento</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-3 pt-3">
          <div className="flex justify-end">
            {canManageEstoque && (
              <Button onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo Agendamento</Button>
            )}
          </div>

          <TableSearch
            search={busca}
            onSearch={setBusca}
            placeholder="Pesquisar motorista, NF, transportadora, CD…"
            dataInicio={fData}
            onDataInicio={setFData}
            dataFim={fDataFim}
            onDataFim={setFDataFim}
          />

          <Card className="p-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[160px]">
                <Label className="text-[11px] mb-0.5 block">CD</Label>
                <Select value={fCd} onValueChange={setFCd}>
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {cds.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_cd} — {c.estacoes?.nome ?? "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] mb-0.5 block">Técnico</Label>
                <Select value={fTecnico} onValueChange={setFTecnico}>
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {tecnicos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_completo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] mb-0.5 block">Status</Label>
                <Select value={fStatus} onValueChange={setFStatus}>
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Agendado">Agendado</SelectItem>
                    <SelectItem value="Recebido">Recebido</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <Label className="text-[11px] mb-0.5 block">Motorista</Label>
                <Input className="h-7 text-xs" placeholder="Filtrar motorista"
                  value={fMotorista} onChange={(e) => setFMotorista(e.target.value)} />
              </div>
            </div>
          </Card>

          <TabelaCrud
            data={agendamentosFiltrados}
            colunas={colunas}
            rowKey={(r) => r.id}
            csvFilename="agendamentos-entrega"
            emptyMessage="Nenhum agendamento encontrado"
            acoesHeader="Observação"
            acoes={(r) => (
              <div className="flex items-center gap-1">
                <span className="text-xs mr-1">{r.observacao || "—"}</span>
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
        </TabsContent>

        <TabsContent value="novo" className="pt-3">{formAgendamento}</TabsContent>

        <TabsContent value="itens" className="space-y-3 pt-3">
          <div className="flex items-end gap-2 p-2 rounded border bg-muted/40">
            <div className="w-[180px]">
              <Label className="text-[11px] mb-0.5 block">🔎 Data/Hora</Label>
              <Input type="date" className="h-8 text-sm" value={fItemDataHora}
                onChange={(e) => setFItemDataHora(e.target.value)} />
            </div>
          </div>
          <TabelaCrud
            data={itensFlatFiltrados}
            colunas={colunasItens}
            rowKey={(i) => i.id}
            csvFilename="itens-agendamento"
            emptyMessage="Nenhum item encontrado"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

