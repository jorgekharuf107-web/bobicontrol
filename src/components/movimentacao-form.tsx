import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/lib/use-current-user";
import { enqueue } from "@/lib/offline-queue";
import { useOnlineStatus } from "@/lib/use-online-status";

export const TIPOS = ["Recebimento", "Retirada", "Abastecimento", "Permuta"] as const;
export type Tipo = (typeof TIPOS)[number];
export const LOCAIS_ORIG_DEST = ["CD", "ATM"] as const;
export const LOCAIS_TIPO = ["CD", "ATM", "Linha"] as const;
type LocalTipo = (typeof LOCAIS_TIPO)[number];
export const BOBINAS_POR_CAIXA = 6;

const schema = z.object({
  tipo: z.enum(TIPOS),
  data: z.string().min(1),
  item_id: z.string().uuid("Selecione o item"),
  qtd_caixas: z.number().int().min(0),
  qtd_bobina_100: z.number().int().min(0),
  qtd_bobina_50: z.number().int().min(0),
  origem_tipo: z.enum(LOCAIS_TIPO).optional().or(z.literal("")),
  origem_id: z.string().uuid().optional().or(z.literal("")),
  destino_tipo: z.enum(LOCAIS_TIPO).optional().or(z.literal("")),
  destino_id: z.string().uuid().optional().or(z.literal("")),
  observacao: z.string().max(500).optional().or(z.literal("")),
});
type Form = z.infer<typeof schema>;

export function nowLocal() {
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

/** Formulário de Nova Movimentação — reutilizado em Estoque > Nova Movimentação e Controle de Estoque. */
export function MovimentacaoForm({ onSaved }: { onSaved?: () => void }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const online = useOnlineStatus();
  const [form, setForm] = useState<Form>(empty);
  const [tCaixa, setTCaixa] = useState(true);
  const [t100, setT100] = useState(false);
  const [t50, setT50] = useState(false);
  const [fornecedorId, setFornecedorId] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [motoristaId, setMotoristaId] = useState("");

  const { data: itens = [] } = useQuery({
    queryKey: ["itens-mov"],
    queryFn: async () =>
      (await supabase.from("itens").select("id, nome, bobinas_por_caixa").eq("ativo", true).order("nome")).data ?? [],
  });
  const itemSel = (itens as any[]).find((i) => i.id === form.item_id);
  const porCaixa = itemSel?.bobinas_por_caixa ?? BOBINAS_POR_CAIXA;
  const { data: cds = [] } = useQuery({
    queryKey: ["cds-mov"],
    queryFn: async () => (await supabase.from("cds").select("id, nome").order("nome")).data ?? [],
  });
  const { data: atms = [] } = useQuery({
    queryKey: ["atms-mov"],
    queryFn: async () => (await supabase.from("atms").select("id, id_atm").order("id_atm")).data ?? [],
  });
  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-mov"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome").order("nome")).data ?? [],
  });
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-mov"],
    queryFn: async () =>
      (await supabase.from("fornecedores").select("id, razao_social").order("razao_social")).data ?? [],
  });
  const { data: motoristas = [] } = useQuery({
    queryKey: ["motoristas-mov"],
    queryFn: async () =>
      (await supabase.from("motoristas").select("id, nome_completo, fornecedor_id").order("nome_completo")).data ?? [],
  });
  const { data: transportadoras = [] } = useQuery({
    queryKey: ["transportadoras-mov"],
    queryFn: async () => {
      const { data } = await supabase.from("agendamentos_entrega").select("transportadora");
      return Array.from(new Set((data ?? []).map((r: any) => r.transportadora).filter(Boolean))).sort() as string[];
    },
  });

  const locOptions = (t?: string) =>
    t === "CD" ? cds.map((c: any) => ({ id: c.id, label: c.nome }))
    : t === "ATM" ? atms.map((a: any) => ({ id: a.id, label: a.id_atm }))
    : t === "Linha" ? linhas.map((l: any) => ({ id: l.id, label: l.nome }))
    : [];


  const bloqueiaOrigem = form.tipo === "Recebimento";
  const bloqueiaDestino = form.tipo === "Retirada";

  function onTipo(v: Tipo) {
    setForm((f) => {
      const next = { ...f, tipo: v };
      if (v === "Recebimento") { next.origem_tipo = ""; next.origem_id = ""; next.destino_tipo = "CD"; }
      if (v === "Retirada") { next.destino_tipo = ""; next.destino_id = ""; next.origem_tipo = "CD"; }
      if (v === "Abastecimento") { next.origem_tipo = "CD"; next.destino_tipo = "ATM"; }
      if (v === "Permuta") { next.origem_tipo = "ATM"; next.destino_tipo = "ATM"; }
      return next;
    });
  }

  const qCaixas = tCaixa ? form.qtd_caixas : 0;
  const q100 = t100 ? form.qtd_bobina_100 : 0;
  const q50 = t50 ? form.qtd_bobina_50 : 0;
  const totalBobinas = qCaixas * porCaixa + q100 + q50;

  function limpar() {
    setForm({ ...empty, data: nowLocal() });
    setTCaixa(true); setT100(false); setT50(false);
    setFornecedorId(""); setTransportadora(""); setMotoristaId("");
  }

  async function registrar() {
    const payload = { ...form, qtd_caixas: qCaixas, qtd_bobina_100: q100, qtd_bobina_50: q50 };
    const p = schema.safeParse(payload);
    if (!p.success) return toast.error(p.error.issues[0].message);
    if (totalBobinas <= 0) return toast.error("Informe alguma quantidade");
    if (!tCaixa && !t100 && !t50) return toast.error("Selecione ao menos um tipo de bobina");
    if (!bloqueiaOrigem && !p.data.origem_id) return toast.error("Selecione a origem");
    if (!bloqueiaDestino && !p.data.destino_id) return toast.error("Selecione o destino");

    const destinoLinha = p.data.destino_tipo === "Linha";
    const origemLinha = p.data.origem_tipo === "Linha";
    const dbPayload: any = {
      tipo: p.data.tipo,
      data: new Date(p.data.data).toISOString(),
      item_id: p.data.item_id,
      qtd: totalBobinas,
      qtd_caixas: p.data.qtd_caixas,
      qtd_bobina_100: p.data.qtd_bobina_100,
      qtd_bobina_50: p.data.qtd_bobina_50,
      origem_tipo: bloqueiaOrigem || origemLinha ? null : p.data.origem_tipo || null,
      origem_id: bloqueiaOrigem || origemLinha ? null : p.data.origem_id || null,
      destino_tipo: bloqueiaDestino || destinoLinha ? null : p.data.destino_tipo || null,
      destino_id: bloqueiaDestino || destinoLinha ? null : p.data.destino_id || null,
      linha_origem_id: origemLinha ? p.data.origem_id || null : null,
      linha_destino_id: destinoLinha ? p.data.destino_id || null : null,
      observacao: p.data.observacao || null,
      tecnico_id: user?.id ?? null,
    };
    if (!online) {
      enqueue({ table: "movimentacoes", payload: dbPayload });
      toast.success("Sem conexão — salvo localmente. Sincronizará ao voltar online.");
    } else {
      const { error } = await supabase.from("movimentacoes").insert(dbPayload);
      if (error) return toast.error(error.message);
      toast.success("Movimentação registrada");
    }
    limpar();
    qc.invalidateQueries({ queryKey: ["movs-page"] });
    qc.invalidateQueries({ queryKey: ["movs-all"] });
    qc.invalidateQueries({ queryKey: ["saldo-itens"] });
    qc.invalidateQueries({ queryKey: ["estoque"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    onSaved?.();
  }

  const inputH = "h-8 text-sm";
  const labelC = "text-[11px] mb-0.5 block font-medium";

  return (
    <Card className="p-3 space-y-3 border-blue-200" style={{ background: "#eff6ff" }}>
      {/* 2 colunas, campos com largura exata do dado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="w-40">
            <Label className={labelC}>Tipo *</Label>
            <Select value={form.tipo} onValueChange={(v) => onTipo(v as Tipo)}>
              <SelectTrigger className={inputH}><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label className={labelC}>Data/Hora *</Label>
            <Input type="datetime-local" className={inputH} value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className={labelC}>Item *</Label>
          <Select value={form.item_id || undefined} onValueChange={(v) => setForm({ ...form, item_id: v })}>
            <SelectTrigger className={`${inputH} max-w-xs`}><SelectValue placeholder="Selecione o item" /></SelectTrigger>
            <SelectContent>{itens.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {!bloqueiaOrigem && (
        <fieldset className="rounded border bg-white/60 p-2">
          <legend className="text-[11px] font-semibold px-1">Origem</legend>
          <div className="flex gap-2 flex-wrap">
            <div className="w-24">
              <Label className={labelC}>Tipo</Label>
              <Select value={form.origem_tipo || undefined}
                onValueChange={(v) => setForm({ ...form, origem_tipo: v as LocalTipo, origem_id: "" })}>
                <SelectTrigger className={inputH}><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{LOCAIS_ORIG_DEST.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-52">
              <Label className={labelC}>Local</Label>
              <Select value={form.origem_id || undefined}
                onValueChange={(v) => setForm({ ...form, origem_id: v })}
                disabled={!form.origem_tipo}>
                <SelectTrigger className={inputH}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{locOptions(form.origem_tipo).map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>
        )}

        {!bloqueiaDestino && (
        <fieldset className="rounded border bg-white/60 p-2">
          <legend className="text-[11px] font-semibold px-1">Destino</legend>
          <div className="flex gap-2 flex-wrap">
            <div className="w-24">
              <Label className={labelC}>Tipo</Label>
              <Select value={form.destino_tipo || undefined}
                onValueChange={(v) => setForm({ ...form, destino_tipo: v as LocalTipo, destino_id: "" })}>
                <SelectTrigger className={inputH}><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{LOCAIS_TIPO.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-52">
              <Label className={labelC}>Local</Label>
              <Select value={form.destino_id || undefined}
                onValueChange={(v) => setForm({ ...form, destino_id: v })}
                disabled={!form.destino_tipo}>
                <SelectTrigger className={inputH}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{locOptions(form.destino_tipo).map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>
        )}

      </div>

      <div className="rounded-xl border-2 border-sky-300 p-3 space-y-2 [&_input]:bg-white [&_[role=combobox]]:bg-white" style={{ background: "#87CEEB" }}>
        <p className="text-sm font-bold text-slate-900">Quantidade a Movimentar</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="flex items-center justify-between gap-2 rounded bg-white/90 p-2">
            <div>
              <p className="text-xs font-medium">Bobina Caixa</p>
              <p className="text-[10px] text-muted-foreground">{porCaixa} bobinas / caixa</p>
            </div>
            <Switch checked={tCaixa} onCheckedChange={setTCaixa} />
          </div>
          <div className="flex items-center justify-between gap-2 rounded bg-white/90 p-2">
            <div>
              <p className="text-xs font-medium">Bobina Avulsa 100%</p>
              <p className="text-[10px] text-muted-foreground">unidade cheia</p>
            </div>
            <Switch checked={t100} onCheckedChange={setT100} />
          </div>
          <div className="flex items-center justify-between gap-2 rounded bg-white/90 p-2">
            <div>
              <p className="text-xs font-medium">Bobina Avulsa &lt; 50%</p>
              <p className="text-[10px] text-muted-foreground">parcial</p>
            </div>
            <Switch checked={t50} onCheckedChange={setT50} />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {tCaixa && (
            <div>
              <Label className={labelC}>Caixas</Label>
              <Input type="number" min={0} className={`${inputH} w-20`} value={form.qtd_caixas}
                onChange={(e) => setForm({ ...form, qtd_caixas: Math.max(0, +e.target.value || 0) })} />
            </div>
          )}
          {t100 && (
            <div>
              <Label className={labelC}>Avulsas 100%</Label>
              <Input type="number" min={0} className={`${inputH} w-20`} value={form.qtd_bobina_100}
                onChange={(e) => setForm({ ...form, qtd_bobina_100: Math.max(0, +e.target.value || 0) })} />
            </div>
          )}
          {t50 && (
            <div>
              <Label className={labelC}>Avulsas &lt; 50%</Label>
              <Input type="number" min={0} className={`${inputH} w-20`} value={form.qtd_bobina_50}
                onChange={(e) => setForm({ ...form, qtd_bobina_50: Math.max(0, +e.target.value || 0) })} />
            </div>
          )}
        </div>
        <div className="rounded bg-blue-700 text-white p-2 text-sm">
          <p className="font-bold">Total a movimentar: {totalBobinas} bobina(s)</p>
          <ul className="text-xs mt-1 space-y-0.5 opacity-95">
            {tCaixa && <li>{qCaixas} caixa(s) = {qCaixas * porCaixa} bobinas</li>}
            {t100 && <li>+ {q100} bobina(s) avulsa(s) 100%</li>}
            {t50 && <li>+ {q50} bobina(s) avulsa(s) &lt; 50%</li>}
          </ul>
        </div>
      </div>

      <div className="max-w-2xl">
        <Label className={labelC}>Observações</Label>
        <Textarea rows={2} className="text-sm bg-white" value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={limpar}>Cancelar</Button>
        <Button size="sm" onClick={registrar}>Registrar</Button>
      </div>
    </Card>
  );
}
