import { aprovarPermuta } from "@/lib/permissoes.functions";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";
import { useCurrentUser } from "@/lib/use-current-user";
import { LinhaBadge } from "@/lib/use-accessible-linhas";
import { confirmar } from "@/components/confirm-dialog";
import { nowLocal } from "@/components/movimentacao-form";

export const Route = createFileRoute("/_authenticated/permutas")({
  head: () => ({
    meta: [
      { title: "Permutas entre Linhas | Bobi Control" },
      { name: "description", content: "Solicite e aprove permutas de bobinas entre linhas do Bobi Control." },
      { property: "og:title", content: "Permutas entre Linhas | Bobi Control" },
      { property: "og:description", content: "Solicite e aprove permutas de bobinas entre linhas do Bobi Control." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/permutas" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/permutas" }],
  }),
  component: Permutas,
});

const emptyForm = {
  data: nowLocal(),
  linha_origem_id: "",
  linha_destino_id: "",
  item_id: "",
  qtd: 1,
  observacao: "",
};

function Permutas() {
  const qc = useQueryClient();
  const { user, isAdmin, perfil } = useCurrentUser();
  const podeAprovar = isAdmin || perfil === "Gestor";
  const [form, setForm] = useState({ ...emptyForm });

  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-nome"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome, cor_hex").order("nome")).data ?? [],
  });
  const linhaMap = new Map<string, any>(linhas.map((l: any) => [l.id, l]));

  const { data: itens = [] } = useQuery({
    queryKey: ["itens-sel"],
    queryFn: async () => (await supabase.from("itens").select("id, nome").order("nome")).data ?? [],
  });

  const { data: permutas = [], isLoading } = useQuery({
    queryKey: ["permutas"],
    queryFn: async () =>
      (await supabase
        .from("movimentacoes")
        .select("*, itens(nome), usuarios(nome_completo)")
        .eq("tipo", "Permuta")
        .order("criado_em", { ascending: false })).data ?? [],
  });

  async function criarPermuta() {
    if (!form.linha_origem_id || !form.linha_destino_id) return toast.error("Selecione linha de origem e destino");
    if (form.linha_origem_id === form.linha_destino_id) return toast.error("Origem e destino não podem ser iguais");
    if (!form.item_id) return toast.error("Selecione o item");
    if (form.qtd < 1) return toast.error("Quantidade deve ser ≥ 1");
    const { error } = await supabase.from("movimentacoes").insert({
      tipo: "Permuta",
      data: new Date(form.data).toISOString(),
      item_id: form.item_id,
      qtd: form.qtd,
      linha_origem_id: form.linha_origem_id,
      linha_destino_id: form.linha_destino_id,
      observacao: form.observacao || null,
      motivo_permuta: form.observacao || null,
      tecnico_id: user?.id ?? null,
      status_aprovacao: "pendente",
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Permuta entre linhas registrada");
    setForm({ ...emptyForm, data: nowLocal() });
    qc.invalidateQueries({ queryKey: ["permutas"] });
    qc.invalidateQueries({ queryKey: ["movs-all"] });
  }

  async function decidir(id: string, aprovar: boolean) {
    if (!(await confirmar(aprovar ? "Aprovar esta permuta?" : "Rejeitar esta permuta?", { confirmLabel: aprovar ? "Aprovar" : "Rejeitar" }))) return;
    try {
      await aprovarPermuta({ data: { id, aprovar } });
    } catch (e: any) {
      return toast.error(e?.message ?? "Falha ao processar permuta");
    }

    toast.success(aprovar ? "Permuta aprovada" : "Permuta rejeitada");
    qc.invalidateQueries({ queryKey: ["permutas"] });
    qc.invalidateQueries({ queryKey: ["movs-all"] });
  }

  const pendentes = (permutas as any[]).filter((p) => p.status_aprovacao === "pendente");
  const historico = [...(permutas as any[])].sort(
    (a, b) => new Date(a.data ?? a.criado_em).getTime() - new Date(b.data ?? b.criado_em).getTime(),
  );

  const linhaLabel = (id: string | null) => (id ? linhaMap.get(id)?.nome ?? "—" : "—");
  const linhaBadge = (id: string | null) => {
    if (!id) return <span className="text-muted-foreground">—</span>;
    const l = linhaMap.get(id);
    return <LinhaBadge nome={l?.nome} cor={l?.cor_hex} />;
  };
  const badge = (st: string) => {
    const cls = st === "pendente" ? "bg-yellow-100 text-yellow-800"
      : st === "aprovado" ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{st}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton to="/dashboard" />
          <h1 className="text-2xl font-bold">Permutas entre Linhas</h1>
        </div>
        <CsvExportButton
          rows={permutas}
          columns={[
            { header: "Data/Hora", accessor: (m: any) => new Date(m.data ?? m.criado_em).toLocaleString("pt-BR") },
            { header: "Linha Origem", accessor: (m: any) => linhaLabel(m.linha_origem_id) },
            { header: "Linha Destino", accessor: (m: any) => linhaLabel(m.linha_destino_id) },
            { header: "Item", accessor: (m: any) => m.itens?.nome ?? "" },
            { header: "Quantidade", accessor: (m: any) => m.qtd },
            { header: "Observação", accessor: (m: any) => m.motivo_permuta ?? m.observacao ?? "" },
            { header: "Status", accessor: (m: any) => m.status_aprovacao ?? "" },
          ]}
          filename="permutas-linhas"
        />
      </div>

      <Tabs defaultValue="permutas">
        <TabsList>
          <TabsTrigger value="permutas">Permutas entre Linhas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="permutas" className="space-y-4 pt-3">
          <Card className="p-3 space-y-3">
            <p className="text-sm font-semibold">Nova Permuta entre Linhas</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">Data/Hora *</Label>
                <Input type="datetime-local" className="h-8 text-sm" value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">Linha Origem *</Label>
                <Select value={form.linha_origem_id || undefined}
                  onValueChange={(v) => setForm({ ...form, linha_origem_id: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{linhas.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Linha Destino *</Label>
                <Select value={form.linha_destino_id || undefined}
                  onValueChange={(v) => setForm({ ...form, linha_destino_id: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {linhas.filter((l: any) => l.id !== form.linha_origem_id)
                      .map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Item *</Label>
                <Select value={form.item_id || undefined} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                  <SelectContent>{itens.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Label className="text-[11px]">Quantidade *</Label>
                <Input type="number" min={1} className="h-8 text-sm" value={form.qtd}
                  onChange={(e) => setForm({ ...form, qtd: Math.max(1, +e.target.value || 1) })} />
              </div>
              <div className="md:col-span-3">
                <Label className="text-[11px]">Observação</Label>
                <Textarea rows={2} className="text-sm" value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setForm({ ...emptyForm, data: nowLocal() })}>Cancelar</Button>
              <Button size="sm" onClick={criarPermuta}>Criar</Button>
            </div>
          </Card>

          <section>
            <h2 className="text-lg font-semibold mb-2">Pendentes ({pendentes.length})</h2>
            <Card className="p-0 overflow-hidden">
              <table className="excel-table">
                <thead><tr><th>Data/Hora</th><th>Linha Origem</th><th>Linha Destino</th><th>Item</th><th className="num">Quantidade</th><th>Observação</th><th>Ações</th></tr></thead>
                <tbody>
                  {isLoading && <tr><td colSpan={7} className="text-center py-6">Carregando…</td></tr>}
                  {!isLoading && pendentes.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-6 font-bold text-muted-foreground">Nenhuma permuta pendente</td></tr>
                  )}
                  {pendentes.map((m: any) => (
                    <tr key={m.id}>
                      <td>{new Date(m.data ?? m.criado_em).toLocaleString("pt-BR")}</td>
                      <td>{linhaBadge(m.linha_origem_id)}</td>
                      <td>{linhaBadge(m.linha_destino_id)}</td>
                      <td>{m.itens?.nome ?? "—"}</td>
                      <td className="num">{m.qtd}</td>
                      <td>{m.motivo_permuta ?? m.observacao ?? "—"}</td>
                      <td className="whitespace-nowrap">
                        {podeAprovar ? (
                          <>
                            <Button variant="ghost" size="icon" title="Aprovar" onClick={() => decidir(m.id, true)}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Rejeitar" onClick={() => decidir(m.id, false)}>
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        ) : <span className="text-xs text-muted-foreground">Sem permissão</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="historico" className="pt-3">
          <Card className="p-0 overflow-hidden">
            <table className="excel-table">
              <thead><tr><th>Data/Hora</th><th>Linha Origem</th><th>Linha Destino</th><th>Item</th><th className="num">Quantidade</th><th>Técnico</th><th>Observação</th><th>Status</th></tr></thead>
              <tbody>
                {historico.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-6 font-bold text-muted-foreground">Nenhum histórico</td></tr>
                )}
                {historico.map((m: any) => (
                  <tr key={m.id}>
                    <td>{new Date(m.data ?? m.criado_em).toLocaleString("pt-BR")}</td>
                    <td>{linhaBadge(m.linha_origem_id)}</td>
                    <td>{linhaBadge(m.linha_destino_id)}</td>
                    <td>{m.itens?.nome ?? "—"}</td>
                    <td className="num">{m.qtd}</td>
                    <td>{m.usuarios?.nome_completo ?? "—"}</td>
                    <td>{m.motivo_permuta ?? m.observacao ?? "—"}</td>
                    <td>{badge(m.status_aprovacao ?? "aprovado")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
