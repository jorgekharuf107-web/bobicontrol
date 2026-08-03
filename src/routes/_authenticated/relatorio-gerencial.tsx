import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/relatorio-gerencial")({
  head: () => ({
    meta: [
      { title: "Relatório Gerencial | Bobi Control" },
      { name: "description", content: "Relatórios de status, movimentações, alertas e analytics do estoque." },
      { property: "og:title", content: "Relatório Gerencial | Bobi Control" },
      { property: "og:description", content: "Relatórios de status, movimentações, alertas e analytics do estoque." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/relatorio-gerencial" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/relatorio-gerencial" }],
  }),
  component: RelatorioGerencial,
});

const BOBINAS_POR_CAIXA = 6;

type Linha = { id: string; nome: string };
type Estacao = { id: string; nome: string };

type AtmStatus = {
  id: string;
  id_atm: string;
  modelo: string | null;
  estacao: string;
  linha: string;
  total: number;
  capacidade: number;
  nivel: number;
  status: "Crítico" | "Médio" | "Cheio";
  criado_em: string;
};

function StatCard({ label, value, bg, fg }: { label: string; value: number; bg: string; fg: string }) {
  return (
    <Card className="p-5" style={{ backgroundColor: bg, color: fg }}>
      <p className="text-xs uppercase tracking-wide opacity-90">{label}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
    </Card>
  );
}

function statusCor(s: AtmStatus["status"]) {
  if (s === "Crítico") return "#dc2626";
  if (s === "Médio") return "#f59e0b";
  return "#0d9488";
}

function RelatorioGerencial() {
  const [ordenarPor, setOrdenarPor] = useState("criticidade");
  const [direcao, setDirecao] = useState("desc");
  const [fLinha, setFLinha] = useState("todas");
  const [fEstacao, setFEstacao] = useState("todas");
  const [fAtm, setFAtm] = useState("todos");
  const [fItem, setFItem] = useState("todos");

  const { porLocal } = useSaldoReal();

  const { data: atmsRaw = [], isLoading } = useQuery({
    queryKey: ["rel-atms-status"],
    queryFn: async () => {
      const [{ data: rows }, { data: linhas }, { data: estacoes }] = await Promise.all([
        supabase
          .from("atms")
          .select("id, id_atm, modelo, caixas, avulsas, capacidade_bobinas, linha_id, estacao_id, estacao, criado_em"),
        supabase.from("linhas").select("id, nome"),
        supabase.from("estacoes").select("id, nome"),
      ]);
      const mapL = new Map((linhas ?? []).map((l: Linha) => [l.id, l.nome]));
      const mapE = new Map((estacoes ?? []).map((e: Estacao) => [e.id, e.nome]));
      return (rows ?? []).map((a: any) => ({
        id: a.id,
        id_atm: a.id_atm,
        modelo: a.modelo,
        estacao: mapE.get(a.estacao_id) ?? a.estacao ?? "—",
        linha: mapL.get(a.linha_id) ?? "—",
        capacidade: Math.max(1, (a.capacidade_bobinas ?? 1) * BOBINAS_POR_CAIXA),
        criado_em: a.criado_em,
      }));
    },
  });

  /** Nível sempre calculado pelo saldo real (estoque_saldo) — nunca por valores fixos. */
  const atms: AtmStatus[] = useMemo(
    () =>
      atmsRaw.map((a: any) => {
        const total = Math.max(0, porLocal("ATM", a.id));
        const nivel = Math.min(100, Math.round((total / a.capacidade) * 100));
        const status: AtmStatus["status"] = nivel < 50 ? "Crítico" : nivel < 80 ? "Médio" : "Cheio";
        return { ...a, total, nivel, status };
      }),
    [atmsRaw, porLocal],
  );

  const { data: movs = [] } = useQuery({
    queryKey: ["rel-movs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("movimentacoes")
        .select("id, data, criado_em, tipo, qtd, qtd_caixas, qtd_bobina_100, qtd_bobina_50, origem_tipo, destino_tipo, observacao")
        .order("criado_em", { ascending: false })
        .limit(1000);
      return data ?? [];
    },

  });

  const linhasOpts = useMemo(
    () => Array.from(new Set(atms.map((a) => a.linha).filter((v) => v && v !== "—"))).sort(),
    [atms],
  );
  const estacoesOpts = useMemo(
    () =>
      Array.from(
        new Set(
          atms
            .filter((a) => fLinha === "todas" || a.linha === fLinha)
            .map((a) => a.estacao)
            .filter((v) => v && v !== "—"),
        ),
      ).sort(),
    [atms, fLinha],
  );
  const atmsOpts = useMemo(
    () =>
      Array.from(
        new Set(
          atms
            .filter((a) => (fLinha === "todas" || a.linha === fLinha) && (fEstacao === "todas" || a.estacao === fEstacao))
            .map((a) => a.id_atm),
        ),
      ).sort(),
    [atms, fLinha, fEstacao],
  );
  const itensOpts = useMemo(
    () =>
      Array.from(
        new Set(
          atms
            .filter(
              (a) =>
                (fLinha === "todas" || a.linha === fLinha) &&
                (fEstacao === "todas" || a.estacao === fEstacao) &&
                (fAtm === "todos" || a.id_atm === fAtm),
            )
            .map((a) => a.modelo ?? "Bobina"),
        ),
      ).sort(),
    [atms, fLinha, fEstacao, fAtm],
  );

  const filtrados = useMemo(
    () =>
      atms.filter(
        (a) =>
          (fLinha === "todas" || a.linha === fLinha) &&
          (fEstacao === "todas" || a.estacao === fEstacao) &&
          (fAtm === "todos" || a.id_atm === fAtm) &&
          (fItem === "todos" || (a.modelo ?? "Bobina") === fItem),
      ),
    [atms, fLinha, fEstacao, fAtm, fItem],
  );

  const ordenados = useMemo(() => {
    const dir = direcao === "asc" ? 1 : -1;
    const arr = [...filtrados];
    arr.sort((a, b) => {
      switch (ordenarPor) {
        case "estacao":
          return a.estacao.localeCompare(b.estacao) * dir;
        case "linha":
          return a.linha.localeCompare(b.linha) * dir;
        case "atm":
          return a.id_atm.localeCompare(b.id_atm) * dir;
        case "data":
        case "hora":
          return (a.criado_em > b.criado_em ? 1 : -1) * dir;
        default:
          // criticidade: desc = mais crítico primeiro (menor nível)
          return (a.nivel - b.nivel) * (direcao === "desc" ? 1 : -1);
      }
    });
    return arr;
  }, [filtrados, ordenarPor, direcao]);

  const criticos = filtrados.filter((a) => a.status === "Crítico");
  const medios = filtrados.filter((a) => a.status === "Médio");
  const cheios = filtrados.filter((a) => a.status === "Cheio");

  const maisCriticos = [...filtrados].sort((a, b) => a.nivel - b.nivel).slice(0, 10);
  const menosCriticos = [...filtrados].sort((a, b) => b.nivel - a.nivel).slice(0, 10);

  const cobertura = filtrados.length ? Math.round((cheios.length / filtrados.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">Relatório Gerencial - Status dos ATMs</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento crítico do estoque de bobinas</p>
        </div>
      </div>

      <Tabs defaultValue="status">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="status">Status ATMs</TabsTrigger>
          <TabsTrigger value="mov">Movimentações</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total ATMs" value={filtrados.length} bg="#1e40af" fg="#fff" />
            <StatCard label="ATMs Críticos" value={criticos.length} bg="#dc2626" fg="#fff" />
            <StatCard label="ATMs Médio" value={medios.length} bg="#60a5fa" fg="#fff" />
            <StatCard label="ATMs Cheios" value={cheios.length} bg="#0d9488" fg="#fff" />
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div><Label>Linha</Label>
              <Select value={fLinha} onValueChange={(v) => { setFLinha(v); setFEstacao("todas"); setFAtm("todos"); setFItem("todos"); }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as linhas</SelectItem>
                  {linhasOpts.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Estação</Label>
              <Select value={fEstacao} onValueChange={(v) => { setFEstacao(v); setFAtm("todos"); setFItem("todos"); }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as estações</SelectItem>
                  {estacoesOpts.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>ATM</Label>
              <Select value={fAtm} onValueChange={(v) => { setFAtm(v); setFItem("todos"); }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os ATMs</SelectItem>
                  {atmsOpts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Item</Label>
              <Select value={fItem} onValueChange={setFItem}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os itens</SelectItem>
                  {itensOpts.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => { setFLinha("todas"); setFEstacao("todas"); setFAtm("todos"); setFItem("todos"); }}>Limpar</Button>
            <div><Label>Ordenar por</Label>
              <Select value={ordenarPor} onValueChange={setOrdenarPor}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="criticidade">Criticidade</SelectItem>
                  <SelectItem value="estacao">Estação</SelectItem>
                  <SelectItem value="linha">Linha</SelectItem>
                  <SelectItem value="atm">ATM</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="hora">Hora</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Direção</Label>
              <Select value={direcao} onValueChange={setDirecao}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Mais Crítico Primeiro</SelectItem>
                  <SelectItem value="asc">Menos Crítico Primeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Card className="p-0 overflow-hidden">
            <table className="excel-table">
              <thead><tr><th>ATM</th><th>Estação</th><th>Linha</th><th>Item</th><th>Qtde</th><th>Nível</th><th>Status</th></tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>}
                {!isLoading && ordenados.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 font-bold text-muted-foreground">Nenhum registro encontrado</td></tr>
                )}
                {ordenados.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id_atm}</td>
                    <td>{a.estacao}</td>
                    <td>{a.linha}</td>
                    <td>{a.modelo ?? "Bobina"}</td>
                    <td className="text-center">{a.total}</td>
                    <td className="text-center">{a.nivel}%</td>
                    <td className="text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ backgroundColor: statusCor(a.status) }}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-0 overflow-hidden">
              <p className="px-3 py-2 text-sm font-semibold bg-muted">ATMs Mais Críticos</p>
              <table className="excel-table">
                <thead><tr><th>ATM</th><th>Estação</th><th>Linha</th><th>Nível</th></tr></thead>
                <tbody>
                  {maisCriticos.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Sem dados</td></tr>}
                  {maisCriticos.map((a) => (
                    <tr key={a.id}><td>{a.id_atm}</td><td>{a.estacao}</td><td>{a.linha}</td><td className="text-center">{a.nivel}%</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card className="p-0 overflow-hidden">
              <p className="px-3 py-2 text-sm font-semibold bg-muted">ATMs Menos Críticos</p>
              <table className="excel-table">
                <thead><tr><th>ATM</th><th>Estação</th><th>Linha</th><th>Nível</th></tr></thead>
                <tbody>
                  {menosCriticos.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Sem dados</td></tr>}
                  {menosCriticos.map((a) => (
                    <tr key={a.id}><td>{a.id_atm}</td><td>{a.estacao}</td><td>{a.linha}</td><td className="text-center">{a.nivel}%</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-red-600" /> Crítico (&lt;50%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-amber-400" /> Médio (50-80%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-teal-600" /> Cheio (≥80%)</span>
          </div>
        </TabsContent>

        <TabsContent value="mov">
          <Card className="p-0 overflow-hidden">
            <table className="excel-table">
              <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Caixas</th><th>Avulsa 100%</th><th>Avulsa 50%</th><th>Origem</th><th>Destino</th></tr></thead>
              <tbody>
                {movs.length === 0 && <tr><td colSpan={7} className="text-center py-8 font-bold text-muted-foreground">Nenhuma movimentação registrada</td></tr>}
                {movs.map((m: any) => (
                  <tr key={m.id}>
                    <td>{new Date(m.criado_em ?? m.data).toLocaleString("pt-BR")}</td>
                    <td>{m.tipo}</td>
                    <td className="text-center">{m.qtd_caixas ?? 0}</td>
                    <td className="text-center">{m.qtd_bobina_100 ?? 0}</td>
                    <td className="text-center">{m.qtd_bobina_50 ?? 0}</td>
                    <td>{m.origem_tipo ?? "—"}</td>
                    <td>{m.destino_tipo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card className="p-0 overflow-hidden">
            <table className="excel-table">
              <thead><tr><th>ATM</th><th>Estação</th><th>Linha</th><th>Item</th><th>Qtde</th><th>Nível</th><th>Status</th></tr></thead>
              <tbody>
                {criticos.length === 0 && <tr><td colSpan={7} className="text-center py-8 font-bold text-muted-foreground">✓ Todos os ATMs estão com estoque adequado</td></tr>}
                {criticos.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id_atm}</td><td>{a.estacao}</td><td>{a.linha}</td><td>{a.modelo ?? "Bobina"}</td>
                    <td className="text-center">{a.total}</td><td className="text-center">{a.nivel}%</td>
                    <td className="text-center"><span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ backgroundColor: "#dc2626" }}>Crítico</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            ["Movimentações", movs.length],
            ["Alertas Ativos", criticos.length],
            ["Cobertura", `${cobertura}%`],
            ["ATMs Rastreados", filtrados.length],
            ["Alertas Baixo Estoque", criticos.length + medios.length],
            ["Nível Médio", `${filtrados.length ? Math.round(filtrados.reduce((s, a) => s + a.nivel, 0) / filtrados.length) : 0}%`],
          ] as [string, string | number][]).map(([l, v]) => (
            <Card key={l} className="p-5">
              <p className="text-xs uppercase text-muted-foreground">{l}</p>
              <p className="text-3xl font-bold mt-2">{v}</p>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
