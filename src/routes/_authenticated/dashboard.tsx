import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Search, AlertTriangle, CalendarClock, CloudOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAccessibleLinhas } from "@/lib/use-accessible-linhas";
import { useCurrentUser } from "@/lib/use-current-user";
import { usePendingMovimentacoes } from "@/lib/offline-queue";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard de Controle | Bobi Control" },
      { name: "description", content: "Painel com indicadores de estoque, movimentações, alertas e permutas de bobinas." },
      { property: "og:title", content: "Dashboard de Controle | Bobi Control" },
      { property: "og:description", content: "Painel com indicadores de estoque, movimentações, alertas e permutas de bobinas." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/dashboard" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/dashboard" }],
  }),
  component: Dashboard,
});

const COLORS = ["#1e40af", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

function StatCard({
  label, value, sublabel, tone,
}: { label: string; value: number | string; sublabel: string; tone: "blue" | "yellow" | "red" | "amber" }) {
  const styles = {
    blue: "bg-blue-600 text-white",
    yellow: "bg-amber-400 text-amber-950",
    amber: "bg-amber-500 text-white",
    red: "bg-red-600 text-white",
  }[tone];
  return (
    <Card className={`p-2.5 ${styles}`}>
      <p className="text-[10px] uppercase tracking-wide opacity-90 leading-tight">{label}</p>
      <p className="text-xl font-bold mt-0.5 leading-none">{value}</p>
      <p className="text-[10px] mt-0.5 opacity-90 leading-tight">{sublabel}</p>
    </Card>
  );
}


function TopList({
  title, items, fg, bg,
}: { title: string; items: string[]; fg: string; bg: string }) {
  return (
    <Card className="p-5" style={{ backgroundColor: bg }}>
      <p className="text-sm font-bold uppercase mb-3" style={{ color: fg }}>{title}</p>
      {items.length === 0 ? (
        <p className="text-sm italic" style={{ color: fg }}>—</p>
      ) : (
        <ul className="space-y-1">
          {items.map((i, idx) => <li key={idx} className="text-sm" style={{ color: fg }}>{i}</li>)}
        </ul>
      )}
    </Card>
  );
}

function Dashboard() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [linhaFiltro, setLinhaFiltro] = useState<string>("todas");
  const { user, isAdmin, isGestor } = useCurrentUser();
  const podeAprovar = isAdmin || isGestor;
  const { data: linhas = [] } = useAccessibleLinhas();

  const hojeIni = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); }, []);
  const hojeFim = useMemo(() => { const d = new Date(); d.setHours(23,59,59,999); return d.toISOString(); }, []);
  const { data: entregasHoje = [] } = useQuery({
    queryKey: ["entregas-hoje", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("agendamentos_entrega")
        .select("id, data_hora_entrega, nome_motorista, status, modo_offline, cds(nome_cd, estacoes(nome))")
        .eq("tecnico_id", user!.id)
        .gte("data_hora_entrega", hojeIni)
        .lte("data_hora_entrega", hojeFim)
        .order("data_hora_entrega");
      return data ?? [];
    },
  });



  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async () => {
      const [atms, movs, tecnicos] = await Promise.all([
        supabase.from("atms").select("id, id_atm, capacidade_bobinas, nivel_minimo, linha_id"),
        supabase.from("movimentacoes")
          .select("id, tipo, qtd, data, linha_origem_id, linha_destino_id, status_aprovacao, tecnico_id, origem_id, destino_id, origem_tipo, destino_tipo")
          .order("data", { ascending: false }).limit(1000),
        supabase.from("usuarios").select("id, nome_completo").eq("ativo", true),
      ]);
      return { atms: atms.data ?? [], movs: movs.data ?? [], tecnicos: tecnicos.data ?? [] };
    },
  });

  const { data: permutasPendentes = 0 } = useQuery({
    queryKey: ["permutas-pendentes-count"],
    enabled: podeAprovar,
    queryFn: async () => {
      const { count } = await supabase
        .from("movimentacoes").select("id", { count: "exact", head: true })
        .eq("tipo", "Permuta").eq("status_aprovacao", "pendente");
      return count ?? 0;
    },
  });

  const atmsFiltradas = useMemo(() => {
    const all = stats?.atms ?? [];
    if (linhaFiltro === "todas") return all;
    return all.filter((a: any) => a.linha_id === linhaFiltro);
  }, [stats, linhaFiltro]);

  const movsFiltradas = useMemo(() => {
    // Inclui movimentações offline pendentes para os cards refletirem lançamentos sem internet
    const all = [...pendentes, ...(stats?.movs ?? [])];
    if (linhaFiltro === "todas") return all;
    return all.filter((m: any) => m.linha_origem_id === linhaFiltro || m.linha_destino_id === linhaFiltro);
  }, [stats, pendentes, linhaFiltro]);

  // Nomes de técnicos
  const nomesTec = useMemo(() => {
    const m: Record<string, string> = {};
    (stats?.tecnicos ?? []).forEach((t: any) => { m[t.id] = t.nome_completo ?? t.id; });
    return m;
  }, [stats]);

  // Nomes de ATMs
  const nomesAtm = useMemo(() => {
    const m: Record<string, string> = {};
    (stats?.atms ?? []).forEach((a: any) => { m[a.id] = a.id_atm ?? a.id; });
    return m;
  }, [stats]);

  // Métricas
  const totalMovs = movsFiltradas.length;
  const totalPermutas = movsFiltradas.filter((m: any) => m.tipo === "Permuta").length;
  const totalAbastecimentos = movsFiltradas.filter((m: any) => m.tipo === "Abastecimento").length;
  const totalEntradas = movsFiltradas.filter((m: any) => m.tipo === "Entrada" || m.tipo === "Recebimento").length;

  // Nível estimado por ATM: soma abastecimentos (destino=ATM) - saídas (origem=ATM) nos últimos 30 dias
  const nivelPorAtm = useMemo(() => {
    const agora = Date.now();
    const cutoff = agora - 30 * 24 * 60 * 60 * 1000;
    const acc: Record<string, number> = {};
    movsFiltradas.forEach((m: any) => {
      if (new Date(m.data).getTime() < cutoff) return;
      if (m.destino_tipo === "ATM" && m.destino_id) acc[m.destino_id] = (acc[m.destino_id] ?? 0) + (m.qtd ?? 0);
      if (m.origem_tipo === "ATM" && m.origem_id) acc[m.origem_id] = (acc[m.origem_id] ?? 0) - (m.qtd ?? 0);
    });
    return acc;
  }, [movsFiltradas]);

  const atmsComNivel = useMemo(() => {
    return atmsFiltradas.map((a: any) => {
      const cap = a.capacidade_bobinas || 1;
      const saldo = Math.max(0, nivelPorAtm[a.id] ?? 0);
      const pct = Math.min(100, Math.round((saldo / cap) * 100));
      return { id: a.id, id_atm: a.id_atm, cap, saldo, pct, min: a.nivel_minimo ?? 20 };
    });
  }, [atmsFiltradas, nivelPorAtm]);

  const altoVolume = atmsComNivel.filter((a) => a.pct >= 80).length;
  const baixoVolume = atmsComNivel.filter((a) => a.pct >= 50 && a.pct < 80).length;
  const critico = atmsComNivel.filter((a) => a.pct < 50).length;
  const totalEstoque = atmsComNivel.reduce((s, a) => s + a.saldo, 0);

  // TOP 10 ATMs com mais atendimento (contagem de movimentações envolvendo o ATM)
  const topAtmsAtendimento = useMemo(() => {
    const acc: Record<string, number> = {};
    movsFiltradas.forEach((m: any) => {
      if (m.origem_tipo === "ATM" && m.origem_id) acc[m.origem_id] = (acc[m.origem_id] ?? 0) + 1;
      if (m.destino_tipo === "ATM" && m.destino_id) acc[m.destino_id] = (acc[m.destino_id] ?? 0) + 1;
    });
    return Object.entries(acc)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([id, n]) => `${nomesAtm[id] ?? id.slice(0, 8)} · ${n} atend.`);
  }, [movsFiltradas, nomesAtm]);

  // Atuações por técnico
  const atuacoesPorTecnico = useMemo(() => {
    const acc: Record<string, number> = {};
    movsFiltradas.forEach((m: any) => {
      if (m.tecnico_id) acc[m.tecnico_id] = (acc[m.tecnico_id] ?? 0) + 1;
    });
    return Object.entries(acc)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([id, n]) => `${nomesTec[id] ?? id.slice(0, 8)} · ${n} mov.`);
  }, [movsFiltradas, nomesTec]);

  const topCriticos = atmsComNivel.filter((a) => a.pct < 50).sort((a, b) => a.pct - b.pct).slice(0, 10)
    .map((a) => `${a.id_atm} · ${a.pct}%`);
  const topBaixos = atmsComNivel.filter((a) => a.pct >= 50 && a.pct < 80).sort((a, b) => a.pct - b.pct).slice(0, 10)
    .map((a) => `${a.id_atm} · ${a.pct}%`);
  const topAltos = atmsComNivel.filter((a) => a.pct >= 80).sort((a, b) => b.pct - a.pct).slice(0, 10)
    .map((a) => `${a.id_atm} · ${a.pct}%`);

  const movPorPeriodo = useMemo(() => {
    // Últimos 7 dias
    const dias: Array<{ dia: string; entradas: number; saidas: number; abastecimentos: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const start = d.getTime(); const end = start + 86400000;
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      let e = 0, s = 0, ab = 0;
      movsFiltradas.forEach((m: any) => {
        const t = new Date(m.data).getTime();
        if (t < start || t >= end) return;
        if (m.tipo === "Entrada" || m.tipo === "Recebimento") e += m.qtd ?? 0;
        else if (m.tipo === "Saida" || m.tipo === "Retirada") s += m.qtd ?? 0;
        else if (m.tipo === "Abastecimento") ab += m.qtd ?? 0;
      });
      dias.push({ dia: label, entradas: e, saidas: s, abastecimentos: ab });
    }
    return dias;
  }, [movsFiltradas]);

  const distribuicaoAtm = atmsComNivel.slice(0, 6).map((a) => ({ name: a.id_atm, value: a.saldo || 1 }));
  const evolucaoEstoque = movPorPeriodo.map((d) => ({ dia: d.dia, total: d.entradas + d.abastecimentos - d.saidas }));
  const nivelAtms = atmsComNivel.slice(0, 10).map((a) => ({ atm: a.id_atm, nivel: a.pct }));

  const hojeStart = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); }, []);
  const movsHoje = movsFiltradas.filter((m: any) => new Date(m.data).getTime() >= hojeStart).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard BobiControl</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do sistema de bobinas <span className="ml-2 inline-block rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">v2.1.4</span>
            {linhaFiltro !== "todas" && linhas.find((l) => l.id === linhaFiltro) &&
              ` · Filtrado por: ${linhas.find((l) => l.id === linhaFiltro)?.nome}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {linhas.length > 1 && (
            <Select value={linhaFiltro} onValueChange={setLinhaFiltro}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por linha" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as linhas</SelectItem>
                {linhas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.cor_hex ?? "#94a3b8" }} />
                      {l.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogTrigger asChild>
              <Button><Search className="h-4 w-4" /> Pesquisa Avançada</Button>
            </DialogTrigger>
            <PesquisaAvancada />
          </Dialog>
        </div>
      </div>

      {podeAprovar && permutasPendentes > 0 && (
        <Card className="p-4 border-amber-400 bg-amber-50 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              {permutasPendentes} permuta{permutasPendentes > 1 ? "s" : ""} aguardando aprovação
            </p>
            <p className="text-xs text-amber-800">Aprovar ou rejeitar em /permutas</p>
          </div>
          <a href="/permutas" className="text-sm font-medium text-amber-900 underline">Abrir</a>
        </Card>
      )}

      {entregasHoje.length > 0 && (
        <Card className="p-4 border-blue-300 bg-blue-50">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-5 w-5 text-blue-800" />
            <p className="font-semibold text-blue-900">Entregas de Hoje ({entregasHoje.length})</p>
            <a href="/agendamentos-entrega" className="ml-auto text-sm font-medium text-blue-900 underline">Ver todos</a>
          </div>
          <ul className="text-sm text-blue-900 space-y-1">
            {entregasHoje.map((e: any) => (
              <li key={e.id} className="flex justify-between gap-2 items-center">
                <span className="flex items-center gap-1">
                  {e.modo_offline && <CloudOff className="h-4 w-4 text-slate-500" aria-label="Técnico offline" />}
                  <b>{new Date(e.data_hora_entrega).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b>
                  {" — "}{e.cds?.nome_cd ?? "—"} / {e.cds?.estacoes?.nome ?? "—"} · {e.nome_motorista}
                </span>
                <span className="text-xs opacity-80">{e.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatCard tone="blue" label="Estoque Total" value={totalEstoque} sublabel="bobinas (30d)" />
        <StatCard tone="red" label="Alertas Nível Baixo" value={critico} sublabel="ATMs <50%" />
        <StatCard tone="amber" label="Nível Alto" value={altoVolume} sublabel="ATMs ≥80%" />
        <StatCard tone="blue" label="Movimentações do Dia" value={movsHoje} sublabel="hoje" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard tone="blue" label="Movimentações" value={totalMovs} sublabel="últimas 1000" />
        <StatCard tone="amber" label="Permutas" value={totalPermutas} sublabel="do período" />
        <StatCard tone="yellow" label="Baixo Volume" value={baixoVolume} sublabel="ATMs 50–80%" />
        <StatCard tone="blue" label="Abastecimentos" value={totalAbastecimentos} sublabel="do período" />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-sm font-semibold mb-3">Distribuição por ATM</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={distribuicaoAtm.length ? distribuicaoAtm : [{ name: "Sem dados", value: 1 }]}
                dataKey="value" nameKey="name" outerRadius={80} label>
                {distribuicaoAtm.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold mb-3">Movimentações por Período</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={movPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" /><YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="entradas" stroke="#10b981" name="Entradas" />
              <Line type="monotone" dataKey="saidas" stroke="#dc2626" name="Saídas" />
              <Line type="monotone" dataKey="abastecimentos" stroke="#1e40af" name="Abastecimentos" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-green-500" />Entradas</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-red-600" />Saídas</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-blue-700" />Abastecimentos</span>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold mb-1">Evolução do Estoque (Últimos 7 dias)</p>
          <p className="text-xs text-muted-foreground mb-3">Total em Estoque</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evolucaoEstoque}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" /><YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#1e40af" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold mb-3">Nível de Volume nas ATMs (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={nivelAtms}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="atm" /><YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="nivel" stroke="#1e40af" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <TopList title="TOP 10 ATMs Críticos" items={topCriticos} fg="#b91c1c" bg="#fee2e2" />
        <TopList title="TOP 10 ATMs Baixo Volume" items={topBaixos} fg="#c2410c" bg="#ffedd5" />
        <TopList title="TOP 10 ATMs Alto Volume" items={topAltos} fg="#1e3a8a" bg="#dbeafe" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopList title="TOP 10 ATMs com mais atendimento" items={topAtmsAtendimento} fg="#0f172a" bg="#f1f5f9" />
        <TopList title="Atuações por Técnico" items={atuacoesPorTecnico} fg="#0f172a" bg="#f8fafc" />
      </div>


      <p className="text-center text-xs text-muted-foreground">
        {critico === 0 ? "Nenhum ATM crítico" : `${critico} ATM(s) crítico(s)`}
        {" · "}{baixoVolume === 0 ? "Nenhum ATM com baixo volume" : `${baixoVolume} baixo volume`}
        {" · "}{altoVolume === 0 ? "Nenhum ATM com alto volume" : `${altoVolume} alto volume`}
        {" · "}{totalAbastecimentos} abastecimento(s) · {totalEntradas} entrada(s)
      </p>
    </div>
  );
}

function PesquisaAvancada() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [local, setLocal] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [tecnicoId, setTecnicoId] = useState("todos");
  const [linhaId, setLinhaId] = useState("todas");
  const [estacaoId, setEstacaoId] = useState("todas");
  const [buscar, setBuscar] = useState(false);

  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnicos-select"],
    queryFn: async () =>
      (await supabase.from("usuarios").select("id, nome_completo").eq("perfil", "tecnico_estacao").eq("ativo", true).order("nome_completo")).data ?? [],
  });
  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-select"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome, cor_hex").order("nome")).data ?? [],
  });
  const { data: estacoes = [] } = useQuery({
    queryKey: ["estacoes-select"],
    queryFn: async () => (await supabase.from("estacoes").select("id, nome").order("nome")).data ?? [],
  });

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ["pesquisa-mov", dataInicio, dataFim, local, tipo, tecnicoId, linhaId, estacaoId, buscar],
    enabled: buscar,
    queryFn: async () => {
      let q = supabase.from("movimentacoes").select("id, data, tipo, qtd, origem_tipo, destino_tipo, origem_id, destino_id, linha_origem_id, linha_destino_id, tecnico_id").order("data", { ascending: false }).limit(200);
      if (dataInicio) q = q.gte("data", dataInicio);
      if (dataFim) q = q.lte("data", `${dataFim}T23:59:59`);
      if (tipo !== "todos") q = q.eq("tipo", tipo as any);
      if (local === "cd") q = q.or("origem_tipo.eq.CD,destino_tipo.eq.CD");
      if (local === "atm") q = q.or("origem_tipo.eq.ATM,destino_tipo.eq.ATM");
      if (tecnicoId !== "todos") q = q.eq("tecnico_id", tecnicoId);
      if (linhaId !== "todas") q = q.or(`linha_origem_id.eq.${linhaId},linha_destino_id.eq.${linhaId}`);
      if (estacaoId !== "todas") {
        const [atmsRes, cdsRes] = await Promise.all([
          supabase.from("atms").select("id").eq("estacao_id", estacaoId),
          supabase.from("cds").select("id").eq("estacao_id", estacaoId),
        ]);
        const ids = [...(atmsRes.data ?? []), ...(cdsRes.data ?? [])].map((r: any) => r.id);
        if (ids.length === 0) return [];
        q = q.or(`origem_id.in.(${ids.join(",")}),destino_id.in.(${ids.join(",")})`);
      }
      const { data } = await q;
      return data ?? [];
    },
  });

  function limpar() {
    setDataInicio(""); setDataFim(""); setLocal("todos"); setTipo("todos");
    setTecnicoId("todos"); setLinhaId("todas"); setEstacaoId("todas"); setBuscar(false);
  }

  return (
    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Pesquisa Avançada de Movimentações</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div><Label>Data Início</Label><Input type="date" className="h-9" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
        <div><Label>Data Fim</Label><Input type="date" className="h-9" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
        <div><Label>Local</Label>
          <Select value={local} onValueChange={setLocal}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="cd">CD</SelectItem>
              <SelectItem value="atm">ATM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Entrada">Entrada</SelectItem>
              <SelectItem value="Saida">Saída</SelectItem>
              <SelectItem value="Permuta">Permuta</SelectItem>
              <SelectItem value="Ajuste">Ajuste</SelectItem>
              <SelectItem value="Abastecimento">Abastecimento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Técnico</Label>
          <Select value={tecnicoId} onValueChange={setTecnicoId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {tecnicos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nome_completo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Linha</Label>
          <Select value={linhaId} onValueChange={setLinhaId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {linhas.map((l: any) => (
                <SelectItem key={l.id} value={l.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.cor_hex ?? "#94a3b8" }} />
                    {l.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Estação</Label>
          <Select value={estacaoId} onValueChange={setEstacaoId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {estacoes.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={limpar}>Limpar Filtros</Button>
        <Button onClick={() => setBuscar(true)}>Pesquisar</Button>
      </div>
      {buscar && (
        <div className="mt-3 border-t pt-3">
          <p className="text-xs text-muted-foreground mb-2">
            {isFetching ? "Buscando..." : `${resultados.length} resultado(s)`}
          </p>
          <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
            <table className="excel-table">
              <thead><tr><th>Data</th><th>Tipo</th><th>Qtd</th><th>Origem</th><th>Destino</th></tr></thead>
              <tbody>
                {resultados.map((r: any) => (
                  <tr key={r.id}>
                    <td>{new Date(r.data).toLocaleString("pt-BR")}</td>
                    <td>{r.tipo}</td>
                    <td>{r.qtd}</td>
                    <td>{r.origem_tipo ?? "—"}</td>
                    <td>{r.destino_tipo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DialogContent>
  );
}
