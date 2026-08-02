import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { nowLocal } from "@/components/movimentacao-form";
import { enqueue } from "@/lib/offline-queue";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/_authenticated/permutas-atm")({
  head: () => ({
    meta: [
      { title: "Permutas entre ATM | Bobi Control" },
      { name: "description", content: "Registre permutas de bobinas entre ATMs com baixa e entrada automáticas." },
      { property: "og:title", content: "Permutas entre ATM | Bobi Control" },
      { property: "og:description", content: "Registre permutas de bobinas entre ATMs com baixa e entrada automáticas." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/permutas-atm" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/permutas-atm" }],
  }),
  component: PermutasAtm,
});

function PermutasAtm() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [dIni, setDIni] = useState("");
  const [dFim, setDFim] = useState("");
  const { user } = useCurrentUser();
  const [form, setForm] = useState({
    origem_id: "", destino_id: "", item_id: "", qtd: 1, motivo: "",
    data_criacao: nowLocal(), tecnico_id: "",
  });

  const { data: atms = [] } = useQuery({
    queryKey: ["atms-sel"],
    queryFn: async () => (await supabase.from("atms").select("id, id_atm").order("id_atm")).data ?? [],
  });
  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnicos-permuta-atm"],
    queryFn: async () =>
      (await supabase.from("usuarios").select("id, nome_completo").eq("ativo", true).order("nome_completo")).data ?? [],
  });
  const { data: itens = [] } = useQuery({
    queryKey: ["itens-sel"],
    queryFn: async () => (await supabase.from("itens").select("id, nome").order("nome")).data ?? [],
  });

  const { data: movs = [] } = useQuery({
    queryKey: ["permutas-atm"],
    queryFn: async () =>
      (await supabase
        .from("movimentacoes")
        .select("*, itens(nome), usuarios(nome_completo)")
        .eq("tipo", "Permuta")
        .eq("origem_tipo", "ATM")
        .eq("destino_tipo", "ATM")
        .order("data", { ascending: false })).data ?? [],
  });

  const atmLabel = (id: string | null) => atms.find((a: any) => a.id === id)?.id_atm ?? "—";

  async function registrar() {
    if (!form.origem_id || !form.destino_id) return toast.error("Selecione origem e destino");
    if (form.origem_id === form.destino_id) return toast.error("Origem e destino não podem ser iguais");
    if (!form.item_id) return toast.error("Selecione o item");
    if (form.qtd < 1) return toast.error("Quantidade deve ser ≥ 1");
    if (!form.tecnico_id) return toast.error("Selecione o técnico");
    const payload: any = {
      tipo: "Permuta", item_id: form.item_id, qtd: form.qtd,
      origem_tipo: "ATM", origem_id: form.origem_id,
      destino_tipo: "ATM", destino_id: form.destino_id,
      observacao: form.motivo || null,
      motivo_permuta: form.motivo || null,
      tecnico_id: form.tecnico_id || user?.id || null,
      data: new Date(form.data_criacao).toISOString(),
    };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueue({ table: "movimentacoes", payload });
      toast.success("Sem conexão — permuta salva localmente e sincronizará ao reconectar");
    } else {
      const { error: e1 } = await supabase.from("movimentacoes").insert(payload);
      if (e1) {
        enqueue({ table: "movimentacoes", payload });
        toast.warning("Falha ao enviar — permuta salva localmente para sincronizar depois");
      } else {
        toast.success("Permuta ATM x ATM registrada — baixa/entrada automáticas");
      }
    }
    setOpen(false);
    setForm({ origem_id: "", destino_id: "", item_id: "", qtd: 1, motivo: "", data_criacao: nowLocal(), tecnico_id: "" });
    ["permutas-atm", "movs-all", "movs-page", "estoque", "dashboard-stats"]
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }

  const filtradas = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (movs as any[]).filter((m) => {
      if (dIni && new Date(m.data) < new Date(dIni)) return false;
      if (dFim) { const f = new Date(dFim); f.setHours(23,59,59,999); if (new Date(m.data) > f) return false; }
      if (s) {
        const hay = [m.itens?.nome, atmLabel(m.origem_id), atmLabel(m.destino_id), m.usuarios?.nome_completo, m.observacao].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [movs, q, dIni, dFim, atms]);

  const historicoAsc = [...filtradas].sort(
    (a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Permutas entre ATM</h1>
            <p className="text-xs text-muted-foreground">Movimentação de bobinas de uma ATM para outra — baixa e entrada automáticas.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CsvExportButton
            rows={filtradas}
            columns={[
              { header: "Data", accessor: (m: any) => new Date(m.data).toLocaleString("pt-BR") },
              { header: "Item", accessor: (m: any) => m.itens?.nome ?? "" },
              { header: "Qtd", accessor: (m: any) => m.qtd },
              { header: "ATM Origem", accessor: (m: any) => atmLabel(m.origem_id) },
              { header: "ATM Destino", accessor: (m: any) => atmLabel(m.destino_id) },
              { header: "Técnico", accessor: (m: any) => m.usuarios?.nome_completo ?? "" },
              { header: "Observações", accessor: (m: any) => m.motivo_permuta ?? m.observacao ?? "" },
            ]}
            filename="permutas-atm"
          />
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova Permuta ATM</Button>
        </div>
      </div>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">Permutas entre ATM</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-3 pt-3">
          <TableSearch
            search={q} onSearch={setQ}
            placeholder="Pesquisar item, ATM, técnico, observações…"
            dataInicio={dIni} onDataInicio={setDIni}
            dataFim={dFim} onDataFim={setDFim}
          />

          <Card className="p-0 overflow-hidden">
            <table className="excel-table">
              <thead><tr><th>Data da Criação</th><th>Item</th><th className="num">Qtd</th><th>ATM Origem</th><th>ATM Destino</th><th>Técnico</th><th>Observações</th></tr></thead>
              <tbody>
                {filtradas.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-6 font-bold text-muted-foreground">Nenhuma permuta ATM registrada</td></tr>
                )}
                {filtradas.map((m: any) => (
                  <tr key={m.id}>
                    <td>{new Date(m.data).toLocaleString("pt-BR")}</td>
                    <td>{m.itens?.nome ?? "—"}</td>
                    <td className="num">{m.qtd}</td>
                    <td className="font-medium">{atmLabel(m.origem_id)}</td>
                    <td className="font-medium">{atmLabel(m.destino_id)}</td>
                    <td>{m.usuarios?.nome_completo ?? "—"}</td>
                    <td>{m.motivo_permuta ?? m.observacao ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="pt-3">
          <Card className="p-0 overflow-hidden">
            <table className="excel-table">
              <thead><tr><th>Data da Criação</th><th>Item</th><th className="num">Qtd</th><th>ATM Origem</th><th>ATM Destino</th><th>Técnico</th><th>Observações</th></tr></thead>
              <tbody>
                {historicoAsc.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-6 font-bold text-muted-foreground">Nenhum histórico</td></tr>
                )}
                {historicoAsc.map((m: any) => (
                  <tr key={m.id}>
                    <td>{new Date(m.data).toLocaleString("pt-BR")}</td>
                    <td>{m.itens?.nome ?? "—"}</td>
                    <td className="num">{m.qtd}</td>
                    <td className="font-medium">{atmLabel(m.origem_id)}</td>
                    <td className="font-medium">{atmLabel(m.destino_id)}</td>
                    <td>{m.usuarios?.nome_completo ?? "—"}</td>
                    <td>{m.motivo_permuta ?? m.observacao ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nova Permuta ATM x ATM</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ATM Origem</Label>
              <Select value={form.origem_id || undefined} onValueChange={(v) => setForm({ ...form, origem_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{atms.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.id_atm}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ATM Destino</Label>
              <Select value={form.destino_id || undefined} onValueChange={(v) => setForm({ ...form, destino_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{atms.filter((a: any) => a.id !== form.origem_id).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.id_atm}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data da Criação</Label>
              <Input type="datetime-local" className="h-9" value={form.data_criacao}
                onChange={(e) => setForm({ ...form, data_criacao: e.target.value })} />
            </div>
            <div>
              <Label>Técnico</Label>
              <Select value={form.tecnico_id || undefined} onValueChange={(v) => setForm({ ...form, tecnico_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                <SelectContent>{tecnicos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_completo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item</Label>
              <Select value={form.item_id || undefined} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                <SelectContent>{itens.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min={1} className="h-9" value={form.qtd}
                onChange={(e) => setForm({ ...form, qtd: Math.max(1, +e.target.value || 1) })} />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Descreva o motivo da permuta" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={registrar}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
