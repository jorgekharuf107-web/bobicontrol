import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSaldoReal } from "@/lib/use-estoque-saldo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/lib/use-current-user";
import { enqueue, usePendingMovimentacoes } from "@/lib/offline-queue";
import { useOnlineStatus } from "@/lib/use-online-status";

/** Apenas dois tipos: Permutas têm módulos próprios. */
export const TIPOS = ["Recebimento", "Abastecimento"] as const;
export type Tipo = (typeof TIPOS)[number];
export const LOCAIS_ORIG_DEST = ["CD", "ATM"] as const;
export const LOCAIS_TIPO = ["CD", "ATM"] as const;
export const BOBINAS_POR_CAIXA = 6;

const schema = z.object({
  tipo: z.enum(TIPOS),
  data: z.string().min(1),
  item_id: z.string().uuid("Selecione o item"),
  qtd_caixas: z.number().int().min(0),
  qtd_bobina_100: z.number().int().min(0),
  qtd_bobina_50: z.number().int().min(0),
  origem_id: z.string().optional().or(z.literal("")),
  destino_id: z.string().optional().or(z.literal("")),
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
  origem_id: "", destino_id: "", observacao: "",
};

/** Formulário de Nova Movimentação — Recebimento (Fornecedor → CD) e Abastecimento (CD → ATM). */
export function MovimentacaoForm({ onSaved }: { onSaved?: () => void }) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const online = useOnlineStatus();
  const pendentes = usePendingMovimentacoes();
  const [form, setForm] = useState<Form>(empty);
  const [linhaId, setLinhaId] = useState("");
  const [tCaixa, setTCaixa] = useState(true);
  const [t100, setT100] = useState(false);
  const [t50, setT50] = useState(false);
  const [fornecedorId, setFornecedorId] = useState("");
  const [motorista1Id, setMotorista1Id] = useState("");
  const [motorista2Id, setMotorista2Id] = useState("");

  const { data: itens = [] } = useQuery({
    queryKey: ["itens-mov"],
    queryFn: async () =>
      (await supabase.from("itens").select("id, nome, bobinas_por_caixa").eq("ativo", true).order("nome")).data ?? [],
  });
  const itemSel = (itens as any[]).find((i) => i.id === form.item_id);
  const porCaixa = itemSel?.bobinas_por_caixa ?? BOBINAS_POR_CAIXA;

  const { data: cds = [] } = useQuery({
    queryKey: ["cds-mov"],
    queryFn: async () =>
      (await supabase.from("cds").select("id, nome_cd, linha_id, estacoes(nome)").order("nome_cd")).data ?? [],
  });
  const { data: atms = [] } = useQuery({
    queryKey: ["atms-mov"],
    queryFn: async () =>
      (await supabase.from("atms").select("id, id_atm, linha_id, estacao, estacoes(nome)").order("id_atm")).data ?? [],
  });
  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-mov"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome, cor_hex").order("nome")).data ?? [],
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
  const { porLocal } = useSaldoReal();

  const cdsFiltrados = (cds as any[]).filter((c) => !linhaId || c.linha_id === linhaId);
  const atmsFiltrados = (atms as any[]).filter((a) => !linhaId || a.linha_id === linhaId);
  const cdLabel = (c: any) => `${c.nome_cd}${c.estacoes?.nome ? ` — ${c.estacoes.nome}` : ""}`;
  const atmLabel = (a: any) => `${a.id_atm}${a.estacoes?.nome ?? a.estacao ? ` — ${a.estacoes?.nome ?? a.estacao}` : ""}`;

  const motoristasFiltrados = (motoristas as any[]).filter(
    (m) => !fornecedorId || m.fornecedor_id === fornecedorId,
  );

  const isRecebimento = form.tipo === "Recebimento";

  function onTipo(v: Tipo) {
    setForm((f) => ({ ...f, tipo: v, origem_id: "", destino_id: "" }));
  }

  const qCaixas = tCaixa ? form.qtd_caixas : 0;
  const q100 = t100 ? form.qtd_bobina_100 : 0;
  const q50 = t50 ? form.qtd_bobina_50 : 0;
  const totalBobinas = qCaixas * porCaixa + q100 + q50;

  /** Saldo real do CD de origem — vem da view estoque_saldo (já inclui a fila offline). */
  const saldoOrigem = useMemo(() => {
    if (isRecebimento || !form.origem_id || !form.item_id) return null;
    return porLocal("CD", form.origem_id, form.item_id);
  }, [porLocal, form.origem_id, form.item_id, isRecebimento]);


  function limpar() {
    setForm({ ...empty, data: nowLocal() });
    setLinhaId("");
    setTCaixa(true); setT100(false); setT50(false);
    setFornecedorId(""); setMotorista1Id(""); setMotorista2Id("");
  }

  async function registrar() {
    const payload = { ...form, qtd_caixas: qCaixas, qtd_bobina_100: q100, qtd_bobina_50: q50 };
    const p = schema.safeParse(payload);
    if (!p.success) return toast.error(p.error.issues[0].message);
    if (!tCaixa && !t100 && !t50) return toast.error("Selecione ao menos um tipo de bobina");
    if (totalBobinas < 1) return toast.error("A quantidade deve ser no mínimo 1");
    if (isRecebimento) {
      if (!fornecedorId) return toast.error("Selecione o fornecedor de origem");
      if (!p.data.destino_id) return toast.error("Selecione o CD de destino");
    } else {
      if (!p.data.origem_id) return toast.error("Selecione o CD de origem");
      if (!p.data.destino_id) return toast.error("Selecione o ATM de destino");
      if (saldoOrigem !== null && totalBobinas > saldoOrigem) {
        return toast.error(`Saldo insuficiente no CD de origem (disponível: ${saldoOrigem} bobina(s))`);
      }
    }

    const dbPayload: any = {
      tipo: p.data.tipo,
      data: new Date(p.data.data).toISOString(),
      item_id: p.data.item_id,
      qtd: totalBobinas,
      qtd_caixas: p.data.qtd_caixas,
      qtd_bobina_100: p.data.qtd_bobina_100,
      qtd_bobina_50: p.data.qtd_bobina_50,
      origem_tipo: isRecebimento ? null : "CD",
      origem_id: isRecebimento ? null : p.data.origem_id || null,
      destino_tipo: isRecebimento ? "CD" : "ATM",
      destino_id: p.data.destino_id || null,
      linha_origem_id: linhaId || null,
      linha_destino_id: linhaId || null,
      observacao: (() => {
        if (!isRecebimento) return p.data.observacao || null;
        const forn = (fornecedores as any[]).find((f) => f.id === fornecedorId)?.razao_social;
        const moto = (motoristas as any[]).find((m) => m.id === motoristaId)?.nome_completo;
        const extra = [
          forn && `Fornecedor: ${forn}`,
          transportadora && `Transportadora: ${transportadora}`,
          moto && `Motorista: ${moto}`,
        ].filter(Boolean).join(" | ");
        return [p.data.observacao, extra].filter(Boolean).join(" — ") || null;
      })(),
      tecnico_id: user?.id ?? null,
    };

    if (!online) {
      enqueue({ table: "movimentacoes", payload: dbPayload });
      toast.success("Sem conexão — salvo localmente. Sincronizará ao voltar online.");
    } else {
      const { error } = await supabase.from("movimentacoes").insert(dbPayload);
      if (error) {
        // Falha de rede: guarda offline em vez de perder o lançamento
        enqueue({ table: "movimentacoes", payload: dbPayload });
        toast.warning("Falha ao enviar — salvo localmente para sincronizar depois.");
      } else {
        toast.success(isRecebimento ? "Recebimento registrado — saldo do CD atualizado" : "Abastecimento registrado — saldo do CD baixado");
      }
    }
    limpar();
    ["movs-page", "movs-all", "saldo-itens", "estoque", "estoque-saldo", "dashboard-stats", "permutas", "permutas-atm"]
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    onSaved?.();
  }

  const inputH = "h-8 text-sm";
  const labelC = "text-[11px] mb-0.5 block font-medium";

  return (
    <Card className="p-3 space-y-3 border-blue-200" style={{ background: "#eff6ff" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="w-44">
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
        <div className="flex items-end gap-3 flex-wrap">
          <div className="w-44">
            <Label className={labelC}>Linha</Label>
            <Select value={linhaId || undefined}
              onValueChange={(v) => { setLinhaId(v); setForm((f) => ({ ...f, origem_id: "", destino_id: "" })); }}>
              <SelectTrigger className={inputH}><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                {(linhas as any[]).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: l.cor_hex ?? "#94a3b8" }} />
                      {l.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className={labelC}>Item *</Label>
            <Select value={form.item_id || undefined} onValueChange={(v) => setForm({ ...form, item_id: v })}>
              <SelectTrigger className={inputH}><SelectValue placeholder="Selecione o item" /></SelectTrigger>
              <SelectContent>{(itens as any[]).map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {isRecebimento ? (
          <fieldset className="rounded border bg-white/60 p-2">
            <legend className="text-[11px] font-semibold px-1">Origem — Fornecedor</legend>
            <div className="flex gap-2 flex-wrap">
              <div className="w-52">
                <Label className={labelC}>Fornecedor *</Label>
                <Select value={fornecedorId || undefined}
                  onValueChange={(v) => { setFornecedorId(v); setMotoristaId(""); }}>
                  <SelectTrigger className={inputH}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.length === 0
                      ? <SelectItem value="__none" disabled>Nenhum fornecedor</SelectItem>
                      : (fornecedores as any[]).map((f) => <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44">
                <Label className={labelC}>Transportadora</Label>
                <Select value={transportadora || undefined} onValueChange={setTransportadora}>
                  <SelectTrigger className={inputH}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {transportadoras.length === 0
                      ? <SelectItem value="__none" disabled>Nenhuma transportadora</SelectItem>
                      : (transportadoras as string[]).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44">
                <Label className={labelC}>Motorista</Label>
                <Select value={motoristaId || undefined} onValueChange={setMotoristaId}>
                  <SelectTrigger className={inputH}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {motoristasFiltrados.length === 0
                      ? <SelectItem value="__none" disabled>Nenhum motorista</SelectItem>
                      : motoristasFiltrados.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nome_completo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>
        ) : (
          <fieldset className="rounded border bg-white/60 p-2">
            <legend className="text-[11px] font-semibold px-1">Origem — CD</legend>
            <div className="flex gap-2 flex-wrap items-end">
              <div className="w-64">
                <Label className={labelC}>CD de origem *</Label>
                <Select value={form.origem_id || undefined} onValueChange={(v) => setForm({ ...form, origem_id: v })}>
                  <SelectTrigger className={inputH}><SelectValue placeholder="Selecione o CD" /></SelectTrigger>
                  <SelectContent>
                    {cdsFiltrados.length === 0
                      ? <SelectItem value="__none" disabled>Nenhum CD</SelectItem>
                      : cdsFiltrados.map((c: any) => <SelectItem key={c.id} value={c.id}>{cdLabel(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {saldoOrigem !== null && (
                <p className="text-[11px] font-semibold text-slate-700 pb-1.5">
                  Saldo disponível: {saldoOrigem} bobina(s)
                </p>
              )}
            </div>
          </fieldset>
        )}

        <fieldset className="rounded border bg-white/60 p-2">
          <legend className="text-[11px] font-semibold px-1">
            {isRecebimento ? "Destino — CD" : "Destino — ATM"}
          </legend>
          <div className="flex gap-2 flex-wrap">
            <div className="w-64">
              <Label className={labelC}>{isRecebimento ? "CD de destino *" : "ATM de destino *"}</Label>
              <Select value={form.destino_id || undefined} onValueChange={(v) => setForm({ ...form, destino_id: v })}>
                <SelectTrigger className={inputH}>
                  <SelectValue placeholder={isRecebimento ? "Selecione o CD" : "Selecione o ATM"} />
                </SelectTrigger>
                <SelectContent>
                  {isRecebimento
                    ? (cdsFiltrados.length === 0
                        ? <SelectItem value="__none" disabled>Nenhum CD</SelectItem>
                        : cdsFiltrados.map((c: any) => <SelectItem key={c.id} value={c.id}>{cdLabel(c)}</SelectItem>))
                    : (atmsFiltrados.length === 0
                        ? <SelectItem value="__none" disabled>Nenhum ATM</SelectItem>
                        : atmsFiltrados.map((a: any) => <SelectItem key={a.id} value={a.id}>{atmLabel(a)}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>
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
              <Input type="number" min={1} className={`${inputH} w-20`} value={form.qtd_caixas}
                onChange={(e) => setForm({ ...form, qtd_caixas: Math.max(0, +e.target.value || 0) })} />
            </div>
          )}
          {t100 && (
            <div>
              <Label className={labelC}>Avulsas 100%</Label>
              <Input type="number" min={1} className={`${inputH} w-20`} value={form.qtd_bobina_100}
                onChange={(e) => setForm({ ...form, qtd_bobina_100: Math.max(0, +e.target.value || 0) })} />
            </div>
          )}
          {t50 && (
            <div>
              <Label className={labelC}>Avulsas &lt; 50%</Label>
              <Input type="number" min={1} className={`${inputH} w-20`} value={form.qtd_bobina_50}
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

      {!online && (
        <p className="text-xs font-medium text-orange-600">
          Sem internet — o lançamento será salvo no aparelho e sincronizado automaticamente ao reconectar.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={limpar}>Cancelar</Button>
        <Button size="sm" onClick={registrar}>Registrar</Button>
      </div>
    </Card>
  );
}
