import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackButton } from "@/components/back-button";
import { TabelaCrud, type Coluna } from "@/components/tabela-crud";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/_authenticated/estoque/movimentacoes")({
  component: MovimentacoesPage,
});

const TIPOS = ["Recebimento", "Retirada", "Abastecimento", "Permuta"] as const;
type Tipo = (typeof TIPOS)[number];
const LOCAIS = ["CD", "ATM"] as const;

const schema = z.object({
  tipo: z.enum(TIPOS),
  data: z.string().min(1),
  item_id: z.string().uuid("Selecione o item"),
  qtd_caixas: z.number().int().min(0),
  qtd_bobina_100: z.number().int().min(0),
  qtd_bobina_50: z.number().int().min(0),
  origem_tipo: z.enum(LOCAIS).optional().or(z.literal("")),
  origem_id: z.string().uuid().optional().or(z.literal("")),
  destino_tipo: z.enum(LOCAIS).optional().or(z.literal("")),
  destino_id: z.string().uuid().optional().or(z.literal("")),
  observacao: z.string().max(500).optional().or(z.literal("")),
});
type Form = z.infer<typeof schema>;

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const empty: Form = {
  tipo: "Recebimento", data: nowLocal(), item_id: "",
  qtd_caixas: 0, qtd_bobina_100: 0, qtd_bobina_50: 0,
  origem_tipo: "", origem_id: "", destino_tipo: "CD", destino_id: "",
  observacao: "",
};

function MovimentacoesPage() {
  const qc = useQueryClient();
  const { user, isAdmin, isGestor } = useCurrentUser();
  const [form, setForm] = useState<Form>(empty);
  const [fTipo, setFTipo] = useState<string>("todos");
  const [fItem, setFItem] = useState<string>("todos");
  const [fTec, setFTec] = useState<string>("todos");
  const [fData, setFData] = useState<string>("");

  const { data: itens = [] } = useQuery({
    queryKey: ["itens-mov"],
    queryFn: async () => (await supabase.from("itens").select("id, nome").order("nome")).data ?? [],
  });
  const { data: cds = [] } = useQuery({
    queryKey: ["cds-mov"],
    queryFn: async () => (await supabase.from("cds").select("id, nome").order("nome")).data ?? [],
  });
  const { data: atms = [] } = useQuery({
    queryKey: ["atms-mov"],
    queryFn: async () => (await supabase.from("atms").select("id, id_atm").order("id_atm")).data ?? [],
  });
  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecs-mov"],
    queryFn: async () => (await supabase.from("usuarios").select("id, nome_completo").order("nome_completo")).data ?? [],
  });
  const { data: movs = [] } = useQuery({
    queryKey: ["movs-page"],
    queryFn: async () =>
      (await supabase
        .from("movimentacoes")
        .select("*, itens(nome), usuarios(nome_completo)")
        .order("data", { ascending: false })).data ?? [],
  });

  const locOptions = (t?: string) =>
    t === "CD" ? cds.map((c: any) => ({ id: c.id, label: c.nome }))
    : t === "ATM" ? atms.map((a: any) => ({ id: a.id, label: a.id_atm }))
    : [];

  const bloqueiaOrigem = form.tipo === "Recebimento" || form.tipo === "Abastecimento";
  const bloqueiaDestino = form.tipo === "Retirada";
  const permutaAtm = form.tipo === "Permuta";

  function onTipo(v: Tipo) {
    setForm((f) => {
      const next = { ...f, tipo: v };
      if (v === "Recebimento") { next.origem_tipo = ""; next.origem_id = ""; next.destino_tipo = "CD"; }
      if (v === "Retirada") { next.destino_tipo = ""; next.destino_id = ""; next.origem_tipo = "CD"; }
      if (v === "Abastecimento") { next.origem_tipo = ""; next.origem_id = ""; next.destino_tipo = "ATM"; }
      if (v === "Permuta") { next.origem_tipo = "ATM"; next.destino_tipo = "ATM"; }
      return next;
    });
  }

  async function registrar() {
    const p = schema.safeParse(form);
    if (!p.success) return toast.error(p.error.issues[0].message);
    const total = p.data.qtd_caixas * 3 + p.data.qtd_bobina_100 + p.data.qtd_bobina_50;
    if (total <= 0) return toast.error("Informe alguma quantidade");
    if (!bloqueiaOrigem && !p.data.origem_id) return toast.error("Selecione a origem");
    if (!bloqueiaDestino && !p.data.destino_id) return toast.error("Selecione o destino");

    const payload: any = {
      tipo: p.data.tipo,
      data: new Date(p.data.data).toISOString(),
      item_id: p.data.item_id,
      qtd: total,
      qtd_caixas: p.data.qtd_caixas,
      qtd_bobina_100: p.data.qtd_bobina_100,
      qtd_bobina_50: p.data.qtd_bobina_50,
      origem_tipo: bloqueiaOrigem ? null : p.data.origem_tipo || null,
      origem_id: bloqueiaOrigem ? null : p.data.origem_id || null,
      destino_tipo: bloqueiaDestino ? null : p.data.destino_tipo || null,
      destino_id: bloqueiaDestino ? null : p.data.destino_id || null,
      observacao: p.data.observacao || null,
      tecnico_id: user?.id ?? null,
    };
    const { error } = await supabase.from("movimentacoes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Movimentação registrada");
    setForm({ ...empty, data: nowLocal() });
    qc.invalidateQueries({ queryKey: ["movs-page"] });
  }

  const podeVerTudo = isAdmin || isGestor;
  const filtradas = useMemo(() =>
    movs.filter((m: any) => {
      if (!podeVerTudo && m.tecnico_id !== user?.id) return false;
      if (fTipo !== "todos" && m.tipo !== fTipo) return false;
      if (fItem !== "todos" && m.item_id !== fItem) return false;
      if (fTec !== "todos" && m.tecnico_id !== fTec) return false;
      if (fData && !m.data?.startsWith(fData)) return false;
      return true;
    })
  , [movs, fTipo, fItem, fTec, fData, podeVerTudo, user?.id]);

  const colunas: Coluna<any>[] = [
    { header: "Data", cell: (m) => new Date(m.data).toLocaleString("pt-BR"), csv: (m) => new Date(m.data).toLocaleString("pt-BR") },
    { header: "Tipo", cell: (m) => m.tipo, csv: (m) => m.tipo },
    { header: "Item", cell: (m) => m.itens?.nome ?? "—", csv: (m) => m.itens?.nome ?? "" },
    { header: "Caixas", cell: (m) => m.qtd_caixas ?? 0, csv: (m) => m.qtd_caixas ?? 0 },
    { header: "Bob. 100%", cell: (m) => m.qtd_bobina_100 ?? 0, csv: (m) => m.qtd_bobina_100 ?? 0 },
    { header: "Bob. <50%", cell: (m) => m.qtd_bobina_50 ?? 0, csv: (m) => m.qtd_bobina_50 ?? 0 },
    { header: "Total", cell: (m) => m.qtd, csv: (m) => m.qtd },
    { header: "Origem", cell: (m) => m.origem_tipo ?? "—", csv: (m) => m.origem_tipo ?? "" },
    { header: "Destino", cell: (m) => m.destino_tipo ?? "—", csv: (m) => m.destino_tipo ?? "" },
    { header: "Técnico", cell: (m) => m.usuarios?.nome_completo ?? "—", csv: (m) => m.usuarios?.nome_completo ?? "" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-bold">Movimentação de Estoque</h1>
      </div>

      <Card className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Nova Movimentação</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Tipo de Movimentação *</Label>
            <Select value={form.tipo} onValueChange={(v) => onTipo(v as Tipo)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data e Hora *</Label>
            <Input type="datetime-local" className="h-9" value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Item *</Label>
            <Select value={form.item_id || undefined} onValueChange={(v) => setForm({ ...form, item_id: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o item" /></SelectTrigger>
              <SelectContent>{itens.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Quantidade a Movimentar</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label className="text-xs">Caixas</Label>
              <Input type="number" min={0} className="h-9" value={form.qtd_caixas}
                onChange={(e) => setForm({ ...form, qtd_caixas: Math.max(0, +e.target.value || 0) })} />
            </div>
            <div><Label className="text-xs">Bobina Avulsa a 100%</Label>
              <Input type="number" min={0} className="h-9" value={form.qtd_bobina_100}
                onChange={(e) => setForm({ ...form, qtd_bobina_100: Math.max(0, +e.target.value || 0) })} />
            </div>
            <div><Label className="text-xs">Bobina Avulsa &lt; 50%</Label>
              <Input type="number" min={0} className="h-9" value={form.qtd_bobina_50}
                onChange={(e) => setForm({ ...form, qtd_bobina_50: Math.max(0, +e.target.value || 0) })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total: {form.qtd_caixas * 3 + form.qtd_bobina_100 + form.qtd_bobina_50} bobinas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <fieldset disabled={bloqueiaOrigem} className={bloqueiaOrigem ? "opacity-50" : ""}>
            <legend className="text-sm font-medium mb-2">Origem</legend>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Tipo</Label>
                <Select value={form.origem_tipo || undefined}
                  onValueChange={(v) => setForm({ ...form, origem_tipo: v as any, origem_id: "" })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {(permutaAtm ? ["ATM"] : LOCAIS).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Local</Label>
                <Select value={form.origem_id || undefined}
                  onValueChange={(v) => setForm({ ...form, origem_id: v })}
                  disabled={!form.origem_tipo}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{locOptions(form.origem_tipo).map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>
          <fieldset disabled={bloqueiaDestino} className={bloqueiaDestino ? "opacity-50" : ""}>
            <legend className="text-sm font-medium mb-2">Destino</legend>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Tipo</Label>
                <Select value={form.destino_tipo || undefined}
                  onValueChange={(v) => setForm({ ...form, destino_tipo: v as any, destino_id: "" })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {(permutaAtm ? ["ATM"] : LOCAIS).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Local</Label>
                <Select value={form.destino_id || undefined}
                  onValueChange={(v) => setForm({ ...form, destino_id: v })}
                  disabled={!form.destino_tipo}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{locOptions(form.destino_tipo).map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setForm({ ...empty, data: nowLocal() })}>Cancelar</Button>
          <Button onClick={registrar}>Registrar Movimentação</Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <Label className="text-xs">Data</Label>
          <Input type="date" className="h-9" value={fData} onChange={(e) => setFData(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={fTipo} onValueChange={setFTipo}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Item</Label>
          <Select value={fItem} onValueChange={setFItem}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {itens.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {podeVerTudo && (
          <div>
            <Label className="text-xs">Técnico</Label>
            <Select value={fTec} onValueChange={setFTec}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tecnicos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <TabelaCrud
        titulo="Movimentações"
        data={filtradas}
        colunas={colunas}
        csvFilename="movimentacoes"
        rowKey={(m: any) => m.id}
      />
    </div>
  );
}
