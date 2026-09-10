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
import { useEstoqueDisponivel } from "@/lib/use-estoque-disponivel";
import { useServerFn } from "@tanstack/react-start";
import { sendEmail } from "@/lib/email.functions";
import { confirmarExclusao } from "@/components/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlossarioEstoque } from "@/components/glossario-estoque";


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
type StatusAgendamento = "Agendado" | "Em Rota" | "Entregue" | "Recebido" | "Cancelado";
type Header = {
  estacao_cd_id: string;
  atm_id: string;
  data_hora_entrega: string;
  nome_motorista: string;
  celular_motorista: string;
  nome_motorista2: string;
  celular_motorista2: string;
  transportadora: string;
  numero_nf: string;
  tecnico_id: string;
  status: StatusAgendamento;
  modo_offline: boolean;
  observacao: string;
};
const emptyHeader: Header = {
  estacao_cd_id: "", atm_id: "", data_hora_entrega: "", nome_motorista: "", celular_motorista: "",
  nome_motorista2: "", celular_motorista2: "",
  transportadora: "", numero_nf: "", tecnico_id: "", status: "Agendado",
  modo_offline: false, observacao: "",
};
const emptyItem: ItemForm = { item_id: "", qtd_caixas: 0, qtd_bobina_100: 0, qtd_bobina_50: 0 };

/** Status que reservam estoque no CD (regra de ouro: item agendado fica bloqueado). */
const STATUS_RESERVA: StatusAgendamento[] = ["Agendado", "Em Rota"];
const STATUS_LISTA: StatusAgendamento[] = ["Agendado", "Em Rota", "Entregue", "Recebido", "Cancelado"];

const STATUS_TONE: Record<string, string> = {
  Agendado: "bg-blue-100 text-blue-900",
  "Em Rota": "bg-amber-100 text-amber-900",
  Entregue: "bg-green-100 text-green-900",
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
      (await supabase.from("usuarios").select("id, nome_completo, email").eq("perfil", "tecnico_estacao").eq("ativo", true).order("nome_completo")).data ?? [],
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

  function aplicarFornecedor(id: string) {
    setFornecedorId(id);
    const f = (fornecedores as any[]).find((x) => x.id === id);
    setHeader((h) => ({ ...h, transportadora: f?.razao_social ?? h.transportadora }));
  }

  const { data: itensCatalogo = [] } = useQuery({
    queryKey: ["itens-agend"],
    queryFn: async () =>
      (await supabase.from("itens").select("id, nome, bobinas_por_caixa, descricao").eq("ativo", true).order("nome")).data ?? [],
  });

  const { data: atms = [] } = useQuery({
    queryKey: ["atms-agend"],
    queryFn: async () =>
      (await supabase.from("atms").select("id, id_atm, modelo, cd_id, estacao_id").order("id_atm")).data ?? [],
  });

  const nomeItem = (id: string) => {
    const i = (itensCatalogo as any[]).find((x) => x.id === id);
    return i?.nome ?? i?.descricao ?? "—";
  };
  const fatorCaixa = (id: string) =>
    Number((itensCatalogo as any[]).find((x) => x.id === id)?.bobinas_por_caixa ?? 1) || 1;
  const totalItemForm = (i: ItemForm) =>
    i.qtd_caixas * fatorCaixa(i.item_id) + i.qtd_bobina_100 + i.qtd_bobina_50;

  const { disponivel, real, reservado } = useEstoqueDisponivel();

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["agendamentos", fCd, fData, fDataFim, fTecnico, fStatus],
    queryFn: async () => {
      let q = supabase
        .from("agendamentos_entrega")
        .select("*, cds(nome_cd, estacoes(nome)), atms(id_atm), agendamento_itens(id, item_id, qtd_caixas, qtd_bobina_100, qtd_bobina_50, tipo_bobina, quantidade, itens(nome))")
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
      atm_id: row.atm_id ?? "",
      data_hora_entrega: row.data_hora_entrega?.slice(0, 16) ?? "",
      nome_motorista: row.nome_motorista ?? "",
      celular_motorista: row.celular_motorista ?? "",
      nome_motorista2: row.nome_motorista2 ?? "",
      celular_motorista2: row.celular_motorista2 ?? "",
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

  /** Reserva já lançada por este agendamento (ao editar não deve contar duas vezes). */
  function reservaPropria(itemId: string) {
    if (!editingId) return 0;
    const orig = (agendamentos as any[]).find((a) => a.id === editingId);
    if (!orig || !STATUS_RESERVA.includes(orig.status)) return 0;
    return (orig.agendamento_itens ?? [])
      .filter((i: any) => i.item_id === itemId)
      .reduce((s: number, i: any) => s + (i.qtd_caixas ?? 0) * fatorCaixa(itemId) + (i.qtd_bobina_100 ?? 0) + (i.qtd_bobina_50 ?? 0), 0);
  }

  /** Saldo disponível do CD para o item, já considerando reservas de outros agendamentos. */
  function disponivelCd(itemId: string) {
    if (!header.estacao_cd_id || !itemId) return 0;
    return disponivel("CD", header.estacao_cd_id, itemId) + reservaPropria(itemId);
  }

  function addItem() {
    if (!novoItem.item_id) return toast.error("Selecione o item");
    const total = totalItemForm(novoItem);
    if (total <= 0) return toast.error("Informe pelo menos uma quantidade");
    if (!header.estacao_cd_id) return toast.error("Selecione primeiro o CD de origem");
    const jaNoForm = itens
      .filter((i) => i.item_id === novoItem.item_id)
      .reduce((s, i) => s + totalItemForm(i), 0);
    const livre = disponivelCd(novoItem.item_id) - jaNoForm;
    if (total > livre) {
      return toast.error(`Saldo disponível insuficiente: ${livre} bobina(s) livres de ${nomeItem(novoItem.item_id)} neste CD`);
    }
    setItens((arr) => [...arr, novoItem]);
    setNovoItem(emptyItem);
  }
  function removeItem(idx: number) { setItens((arr) => arr.filter((_, i) => i !== idx)); }


  /** Recebimento de fornecedor: entrada de bobinas no CD. */
  async function criarMovimentacoesRecebimento(agId: string, cdId: string, itensList: ItemForm[]) {
    const rows = itensList.map((i) => ({
      tipo: "Recebimento" as const,
      item_id: i.item_id,
      qtd: totalItemForm(i),
      qtd_caixas: i.qtd_caixas,
      qtd_bobina_100: i.qtd_bobina_100,
      qtd_bobina_50: i.qtd_bobina_50,
      destino_tipo: "CD" as const,
      destino_id: cdId,
      tecnico_id: user?.id ?? null,
      observacao: `Recebimento agendamento #${agId.slice(0, 8)}`,
      data: new Date().toISOString(),
      status_aprovacao: "aprovado",
    }));
    if (rows.length) {
      const { error } = await supabase.from("movimentacoes").insert(rows as any);
      if (error) throw error;
    }
  }

  /** Entrega concluída: baixa no CD e abastecimento na ATM (quando informada). */
  async function criarMovimentacoesEntrega(agId: string, cdId: string, atmId: string | null, itensList: ItemForm[]) {
    const rows = itensList.filter((i) => i.item_id).map((i) => ({
      tipo: atmId ? "Abastecimento" : "Retirada",
      item_id: i.item_id,
      qtd: totalItemForm(i),
      qtd_caixas: i.qtd_caixas,
      qtd_bobina_100: i.qtd_bobina_100,
      qtd_bobina_50: i.qtd_bobina_50,
      origem_tipo: "CD" as const,
      origem_id: cdId,
      destino_tipo: atmId ? ("ATM" as const) : null,
      destino_id: atmId,
      tecnico_id: user?.id ?? null,
      observacao: `Entrega agendamento #${agId.slice(0, 8)}`,
      data: new Date().toISOString(),
      status_aprovacao: "aprovado",
    }));
    if (rows.length) {
      const { error } = await supabase.from("movimentacoes").insert(rows as any);
      if (error) throw error;
    }
  }

  function invalidarEstoque() {
    qc.invalidateQueries({ queryKey: ["agendamentos"] });
    qc.invalidateQueries({ queryKey: ["estoque-saldo"] });
    qc.invalidateQueries({ queryKey: ["estoque-disponivel"] });
    qc.invalidateQueries({ queryKey: ["movs-page"] });
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
    const atm = (atms as any[]).find((a) => a.id === h.atm_id);
    const totalItens = itens.reduce((s, i) => s + totalItemForm(i), 0);
    return `
      <div style="font-family:Arial,sans-serif">
        <h2>Bobi Control — Agendamento de Entrega ${tituloExtra}</h2>
        <p><b>CD/Estação:</b> ${cd?.nome_cd ?? "—"} / ${cd?.estacoes?.nome ?? "—"}</p>
        <p><b>ATM destino:</b> ${atm?.id_atm ?? "—"}</p>
        <p><b>Data/Hora:</b> ${new Date(h.data_hora_entrega).toLocaleString("pt-BR")}</p>
        <p><b>Motorista:</b> ${h.nome_motorista} ${h.celular_motorista ? "(" + h.celular_motorista + ")" : ""}</p>
        <p><b>Transportadora:</b> ${h.transportadora || "—"} · <b>NF:</b> ${h.numero_nf || "—"}</p>
        <p><b>Status:</b> ${h.status} ${h.modo_offline ? " · Técnico offline em campo" : ""}</p>
        <p><b>Total (bobinas):</b> ${totalItens}</p>
      </div>`;
  }

  async function salvar() {
    if (!header.estacao_cd_id) return toast.error("Selecione o CD de origem/destino");
    if (!header.data_hora_entrega) return toast.error("Informe a data/hora de entrega");
    if (!header.nome_motorista.trim()) return toast.error("Informe o nome do motorista");
    if (itens.length === 0) return toast.error("Adicione ao menos um item");

    // Regra de reserva: a soma por item não pode ultrapassar o saldo disponível do CD
    if (STATUS_RESERVA.includes(header.status)) {
      const porItem = new Map<string, number>();
      itens.forEach((i) => porItem.set(i.item_id, (porItem.get(i.item_id) ?? 0) + totalItemForm(i)));
      for (const [itemId, qtd] of porItem) {
        const livre = disponivelCd(itemId);
        if (qtd > livre) return toast.error(`Saldo disponível insuficiente de ${nomeItem(itemId)}: ${livre} bobina(s) livres no CD`);
      }
    }

    const payload = {
      estacao_cd_id: header.estacao_cd_id,
      atm_id: header.atm_id || null,
      data_hora_entrega: new Date(header.data_hora_entrega).toISOString(),
      nome_motorista: header.nome_motorista.trim(),
      celular_motorista: header.celular_motorista || null,
      nome_motorista2: header.nome_motorista2 || null,
      celular_motorista2: header.celular_motorista2 || null,
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
      const { error } = await supabase.from("agendamentos_entrega").update(payload as any).eq("id", editingId);
      if (error) return toast.error(error.message);
      await supabase.from("agendamento_itens").delete().eq("agendamento_id", editingId);
      const itRows = itens.map((i) => ({ agendamento_id: editingId, ...i }));
      if (itRows.length) await supabase.from("agendamento_itens").insert(itRows);
    } else {
      const { data: ins, error } = await supabase.from("agendamentos_entrega").insert(payload as any).select("id").maybeSingle();
      if (error || !ins) return toast.error(error?.message ?? "Erro ao criar");
      currentId = ins.id;
      const itRows = itens.map((i) => ({ agendamento_id: ins.id, ...i }));
      if (itRows.length) await supabase.from("agendamento_itens").insert(itRows);
      previous = { status: null };
      enviarEmailSeguro(emailTecnico(header.tecnico_id), "Novo agendamento de entrega", htmlAgendamento(header, "— Novo"));
    }

    // Baixa no CD + abastecimento na ATM quando a entrega é concluída
    const virouEntregue = previous?.status !== "Entregue" && header.status === "Entregue";
    if (virouEntregue && currentId) {
      try { await criarMovimentacoesEntrega(currentId, header.estacao_cd_id, header.atm_id || null, itens); }
      catch (e: any) { toast.error("Falha ao gerar movimentação: " + e.message); }
      enviarEmailSeguro(emailTecnico(header.tecnico_id), "Entrega concluída", htmlAgendamento(header, "— Entregue"));
    }

    // Recebimento de carga no CD (entrada de fornecedor)
    const virouRecebido = previous?.status !== "Recebido" && header.status === "Recebido";
    if (virouRecebido && currentId) {
      try { await criarMovimentacoesRecebimento(currentId, header.estacao_cd_id, itens); }
      catch (e: any) { toast.error("Falha ao gerar entrada: " + e.message); }
      enviarEmailSeguro(emailTecnico(header.tecnico_id), "Entrega confirmada como recebida", htmlAgendamento(header, "— Recebido"));
    }

    if (previous?.status !== "Cancelado" && header.status === "Cancelado") {
      toast.info("Agendamento cancelado — reserva liberada no CD");
    }

    toast.success(editingId ? "Agendamento atualizado" : "Agendamento criado");
    invalidarEstoque();
    resetForm();
    setAba("lista");
  }

  function itensDaLinha(row: any): ItemForm[] {
    return (row.agendamento_itens ?? []).map((i: any) => ({
      item_id: i.item_id,
      qtd_caixas: i.qtd_caixas ?? 0,
      qtd_bobina_100: i.qtd_bobina_100 ?? 0,
      qtd_bobina_50: i.qtd_bobina_50 ?? 0,
    })).filter((i: ItemForm) => i.item_id);
  }

  /** Conclui a entrega: baixa no CD e abastecimento na ATM. */
  async function marcarEntregue(row: any) {
    const { error } = await supabase.from("agendamentos_entrega").update({ status: "Entregue" }).eq("id", row.id);
    if (error) return toast.error(error.message);
    try { await criarMovimentacoesEntrega(row.id, row.estacao_cd_id, row.atm_id ?? null, itensDaLinha(row)); }
    catch (e: any) { toast.error("Falha ao gerar movimentação: " + e.message); }
    enviarEmailSeguro(emailTecnico(row.tecnico_id), "Entrega concluída",
      `<p>Agendamento <b>#${row.id.slice(0, 8)}</b> marcado como <b>Entregue</b>.</p>`);
    toast.success("Entrega concluída — baixa no CD e abastecimento gerados");
    invalidarEstoque();
  }

  async function cancelarAgendamento(row: any) {
    const { error } = await supabase.from("agendamentos_entrega").update({ status: "Cancelado" }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Agendamento cancelado — reserva liberada");
    invalidarEstoque();
  }

  async function marcarRecebido(row: any) {
    const { error } = await supabase.from("agendamentos_entrega").update({ status: "Recebido" }).eq("id", row.id);
    if (error) return toast.error(error.message);
    try { await criarMovimentacoesRecebimento(row.id, row.estacao_cd_id, itensDaLinha(row)); }
    catch (e: any) { toast.error("Falha ao gerar entrada: " + e.message); }
    enviarEmailSeguro(emailTecnico(row.tecnico_id), "Entrega confirmada como recebida",
      `<p>Agendamento <b>#${row.id.slice(0,8)}</b> marcado como <b>Recebido</b>.</p>`);
    toast.success("Marcado como Recebido e entrada gerada no CD");
    invalidarEstoque();
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
      return s + (i.qtd_caixas ?? 0) * fatorCaixa(i.item_id) + (i.qtd_bobina_100 ?? 0) + (i.qtd_bobina_50 ?? 0) + legado;
    }, 0);
  }

  const colunas: Coluna<any>[] = [
    { header: "Data/Hora", cell: (r) => new Date(r.data_hora_entrega).toLocaleString("pt-BR"),
      csv: (r) => new Date(r.data_hora_entrega).toLocaleString("pt-BR") },
    { header: "CD / Estação", cell: (r) => `${r.cds?.nome_cd ?? "—"} / ${r.cds?.estacoes?.nome ?? "—"}`,
      csv: (r) => `${r.cds?.nome_cd ?? ""} / ${r.cds?.estacoes?.nome ?? ""}` },
    { header: "ATM", cell: (r) => r.atms?.id_atm ?? "—", csv: (r) => r.atms?.id_atm ?? "" },
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
      item: i.itens?.nome ?? nomeItem(i.item_id),
      qtd_caixas: i.qtd_caixas ?? 0,
      qtd_bobina_100: i.qtd_bobina_100 ?? 0,
      qtd_bobina_50: i.qtd_bobina_50 ?? 0,
      total: (i.qtd_caixas ?? 0) * fatorCaixa(i.item_id) + (i.qtd_bobina_100 ?? 0) + (i.qtd_bobina_50 ?? 0) + (i.quantidade ?? 0),
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

  const atmsDoCd = (atms as any[]).filter((a) => !header.estacao_cd_id || !a.cd_id || a.cd_id === header.estacao_cd_id);
  const bloqueado = editingId != null && (header.status === "Entregue" || header.status === "Recebido" || header.status === "Cancelado");

  const formAgendamento = (
    <Card className="p-3 space-y-3 text-[13px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2 items-start">
        <div className="min-w-0">
          <Label className="text-[11px]">CD de origem / recebimento *</Label>
          <Select value={header.estacao_cd_id} onValueChange={(v) => setHeader({ ...header, estacao_cd_id: v, atm_id: "" })}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Selecione o CD" /></SelectTrigger>
            <SelectContent className="max-w-[min(92vw,420px)]">
              {cds.map((c: any) => (
                <SelectItem key={c.id} value={c.id} className="whitespace-normal break-words">
                  {c.nome_cd} — {c.estacoes?.nome ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <Label className="text-[11px]">ATM de destino (abastecimento)</Label>
          <Select value={header.atm_id || undefined} onValueChange={(v) => setHeader({ ...header, atm_id: v })}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Opcional" /></SelectTrigger>
            <SelectContent className="max-w-[min(92vw,420px)]">
              {atmsDoCd.map((a: any) => (
                <SelectItem key={a.id} value={a.id} className="whitespace-normal break-words">
                  {a.id_atm}{a.modelo ? ` — ${a.modelo}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 rounded border bg-muted/40 p-2 space-y-2">
          <Label className="text-[11px]">Fornecedor / Transportadora (auto-preenche motorista)</Label>
          <Select value={fornecedorId || undefined} onValueChange={aplicarFornecedor}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
            <SelectContent className="max-w-[min(92vw,480px)]">
              {fornecedores.map((f: any) => (
                <SelectItem key={f.id} value={f.id} className="whitespace-normal break-words">
                  {f.razao_social}{f.fornecedor_padrao ? " (padrão)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <Label className="text-[11px]">Data/Hora *</Label>
          <Input type="datetime-local" className="h-9 w-auto min-w-[190px]"
            value={header.data_hora_entrega}
            onChange={(e) => setHeader({ ...header, data_hora_entrega: e.target.value })} />
        </div>
        <div className="min-w-0">
          <Label className="text-[11px]">Status</Label>
          <Select value={header.status} onValueChange={(v: any) => setHeader({ ...header, status: v })}>
            <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_LISTA.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 md:col-span-2 grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <Label className="text-[11px]">Motorista 1 / Celular *</Label>
            <Select
              value={(motoristas as any[]).find((m) => m.nome_completo === header.nome_motorista)?.id ?? undefined}
              onValueChange={(v) => {
                const m = (motoristas as any[]).find((x) => x.id === v);
                setHeader((h) => ({ ...h, nome_motorista: m?.nome_completo ?? "", celular_motorista: m?.celular ?? "" }));
              }}
            >
              <SelectTrigger className="h-9 w-full min-w-0">
                <SelectValue placeholder={fornecedorId ? "Selecione" : "Escolha o fornecedor"} />
              </SelectTrigger>
              <SelectContent className="max-w-[min(92vw,420px)]">
                {(motoristas as any[]).map((m) => (
                  <SelectItem key={m.id} value={m.id} className="whitespace-normal break-words">
                    {m.nome_completo}{m.celular ? ` · ${m.celular}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <Label className="text-[11px]">Motorista 2 / Celular</Label>
            <Select
              value={(motoristas as any[]).find((m) => m.nome_completo === header.nome_motorista2)?.id ?? undefined}
              onValueChange={(v) => {
                const m = (motoristas as any[]).find((x) => x.id === v);
                setHeader((h) => ({ ...h, nome_motorista2: m?.nome_completo ?? "", celular_motorista2: m?.celular ?? "" }));
              }}
            >
              <SelectTrigger className="h-9 w-full min-w-0">
                <SelectValue placeholder={fornecedorId ? "Selecione" : "Escolha o fornecedor"} />
              </SelectTrigger>
              <SelectContent className="max-w-[min(92vw,420px)]">
                {(motoristas as any[]).map((m) => (
                  <SelectItem key={m.id} value={m.id} className="whitespace-normal break-words">
                    {m.nome_completo}{m.celular ? ` · ${m.celular}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="min-w-0">
          <Label className="text-[11px]">Transportadora</Label>
          <Input className="h-9" maxLength={50} value={header.transportadora}
            onChange={(e) => setHeader({ ...header, transportadora: e.target.value })} />
        </div>
        <div className="min-w-0">
          <Label className="text-[11px]">Nº NF</Label>
          <Input className="h-9" maxLength={50} value={header.numero_nf}
            onChange={(e) => setHeader({ ...header, numero_nf: e.target.value })} />
        </div>
        <div className="min-w-0">
          <Label className="text-[11px]">Técnico Responsável</Label>
          <Select value={header.tecnico_id} onValueChange={(v) => setHeader({ ...header, tecnico_id: v })}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="max-w-[min(92vw,420px)]">
              {tecnicos.map((t: any) => (
                <SelectItem key={t.id} value={t.id} className="whitespace-normal break-words">{t.nome_completo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 flex items-center gap-2 md:pt-5">
          <Checkbox id="offline" checked={header.modo_offline}
            onCheckedChange={(c) => setHeader({ ...header, modo_offline: !!c })} />
          <Label htmlFor="offline" className="cursor-pointer flex items-center gap-1 text-[12px]">
            <CloudOff className="h-4 w-4" /> Técnico estará Offline em campo
          </Label>
        </div>
        <div className="md:col-span-2">
          <Label className="text-[11px]">Observação</Label>
          <Textarea rows={2} maxLength={200} value={header.observacao}
            onChange={(e) => setHeader({ ...header, observacao: e.target.value })} />
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <p className="text-sm font-semibold">Itens do Agendamento</p>
        <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_84px_84px_84px_auto] gap-2 items-end">
          <div className="col-span-2 md:col-span-1 min-w-0">
            <Label className="text-[11px]">Item</Label>
            <Select value={novoItem.item_id} onValueChange={(v) => setNovoItem({ ...novoItem, item_id: v })}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="max-w-[min(92vw,420px)]">
                {itensCatalogo.map((t: any) => (
                  <SelectItem key={t.id} value={t.id} className="whitespace-normal break-words">{t.nome ?? t.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Caixas</Label>
            <Input type="number" min={0} className="h-9" value={novoItem.qtd_caixas}
              onChange={(e) => setNovoItem({ ...novoItem, qtd_caixas: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-[11px]">Bob. 100%</Label>
            <Input type="number" min={0} className="h-9" value={novoItem.qtd_bobina_100}
              onChange={(e) => setNovoItem({ ...novoItem, qtd_bobina_100: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-[11px]">Bob. &lt;50%</Label>
            <Input type="number" min={0} className="h-9" value={novoItem.qtd_bobina_50}
              onChange={(e) => setNovoItem({ ...novoItem, qtd_bobina_50: Number(e.target.value) || 0 })} />
          </div>
          <Button type="button" className="h-9" onClick={addItem}><Plus className="h-4 w-4" /></Button>
        </div>

        {novoItem.item_id && header.estacao_cd_id && (
          <p className="text-[11px] text-muted-foreground">
            No CD: QTD real <b>{real("CD", header.estacao_cd_id, novoItem.item_id)}</b> ·
            reservado <b>{reservado("CD", header.estacao_cd_id, novoItem.item_id)}</b> ·
            <span className="text-primary"> disponível <b>{disponivelCd(novoItem.item_id)}</b></span>
          </p>
        )}

        <Card className="p-0 overflow-hidden">
          <table className="excel-table">
            <thead>
              <tr><th>Item</th><th className="num">Caixas</th><th className="num">Bob. 100%</th><th className="num">Bob. &lt;50%</th><th className="num">Total</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {itens.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-muted-foreground">Nenhum item</td></tr>
              )}
              {itens.map((i, idx) => (
                <tr key={idx}>
                  <td className="whitespace-normal break-words">{nomeItem(i.item_id)}</td>
                  <td className="num">{i.qtd_caixas}</td>
                  <td className="num">{i.qtd_bobina_100}</td>
                  <td className="num">{i.qtd_bobina_50}</td>
                  <td className="num"><b>{totalItemForm(i)}</b></td>
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

        {STATUS_RESERVA.includes(header.status) && (
          <p className="text-xs text-blue-800 bg-blue-50 rounded p-2">
            Status <b>{header.status}</b>: os itens ficam <b>reservados</b> no CD e saem do saldo disponível até a entrega ou o cancelamento.
          </p>
        )}
        {header.status === "Entregue" && (
          <p className="text-xs text-green-800 bg-green-50 rounded p-2">
            Ao salvar como "Entregue", será gerada a <b>baixa no CD</b>{header.atm_id ? " e o abastecimento na ATM" : ""} em Nova Movimentação.
          </p>
        )}
        {header.status === "Cancelado" && (
          <p className="text-xs text-red-800 bg-red-50 rounded p-2">
            Ao salvar como "Cancelado", a <b>reserva é liberada</b> e o saldo volta a ficar disponível no CD.
          </p>
        )}
        {header.status === "Recebido" && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
            Ao salvar como "Recebido", será gerada uma Movimentação de <b>Recebimento</b> no CD para cada item.
          </p>
        )}
      </div>


      <div className="flex flex-wrap justify-end items-center gap-2">
        {bloqueado && (
          <span className="text-[11px] text-muted-foreground mr-auto">
            Agendamento finalizado — alterações não geram novas reservas.
          </span>
        )}
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
          <TabsTrigger value="glossario">Glossário do Estoque</TabsTrigger>
        </TabsList>

        <TabsContent value="glossario" className="pt-3">
          <GlossarioEstoque />
        </TabsContent>


        <TabsContent value="lista" className="space-y-3 pt-3">

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
                    {STATUS_LISTA.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                {STATUS_RESERVA.includes(r.status) && canManageEstoque && (
                  <>
                    <Button size="sm" variant="outline" title="Marcar Entregue (baixa no CD)" onClick={() => marcarEntregue(r)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" title="Cancelar (libera reserva)" onClick={() => cancelarAgendamento(r)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
                {r.status === "Agendado" && canManageEstoque && (
                  <Button size="sm" variant="outline" title="Recebimento no CD" onClick={() => marcarRecebido(r)}>
                    <CloudOff className="h-4 w-4 rotate-180" />
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

