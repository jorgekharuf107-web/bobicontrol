import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const COLORS = ["#1e40af", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

function StatCard({
  label, value, sublabel, tone,
}: { label: string; value: number | string; sublabel: string; tone: "blue" | "yellow" | "red" }) {
  const styles = {
    blue: "bg-blue-600 text-white",
    yellow: "bg-amber-400 text-amber-950",
    red: "bg-red-600 text-white",
  }[tone];
  return (
    <Card className={`p-5 ${styles}`}>
      <p className="text-xs uppercase tracking-wide opacity-90">{label}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
      <p className="text-xs mt-1 opacity-90">{sublabel}</p>
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

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [atms, movs] = await Promise.all([
        supabase.from("atms").select("id, id_atm, capacidade_bobinas, nivel_minimo"),
        supabase.from("movimentacoes").select("tipo, qtd, data").order("data", { ascending: false }).limit(500),
      ]);
      return { atms: atms.data ?? [], movs: movs.data ?? [] };
    },
  });

  // Placeholder calculations - in production would aggregate stock per ATM
  const totalEstoque = 0;
  const altoVolume = 0;
  const baixoVolume = 0;
  const critico = 0;

  const movPorPeriodo = (stats?.movs ?? []).slice(0, 7).reverse().map((m, i) => ({
    dia: `D${i + 1}`,
    entradas: m.tipo === "Entrada" ? m.qtd : 0,
    saidas: m.tipo === "Saida" ? m.qtd : 0,
    abastecimentos: m.tipo === "Abastecimento" ? m.qtd : 0,
  }));

  const distribuicaoAtm = (stats?.atms ?? []).slice(0, 6).map((a) => ({
    name: a.id_atm,
    value: a.capacidade_bobinas || 1,
  }));

  const evolucaoEstoque = Array.from({ length: 7 }, (_, i) => ({
    dia: `Dia ${i + 1}`, total: 0,
  }));

  const nivelAtms = (stats?.atms ?? []).slice(0, 10).map((a) => ({
    atm: a.id_atm,
    nivel: 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Controle</h1>
          <p className="text-sm text-muted-foreground">Visão geral do sistema de bobinas</p>
        </div>
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogTrigger asChild>
            <Button><Search className="h-4 w-4" /> Pesquisa Avançada</Button>
          </DialogTrigger>
          <PesquisaAvancada />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard tone="blue" label="Total Estoque" value={totalEstoque} sublabel="bobinas" />
        <StatCard tone="blue" label="Alto Volume" value={altoVolume} sublabel="ATMs ≥80%" />
        <StatCard tone="yellow" label="Baixo Volume" value={baixoVolume} sublabel="ATMs 50-80%" />
        <StatCard tone="red" label="Crítico" value={critico} sublabel="ATMs <50%" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <TopList title="TOP 10 ATMs Críticos" items={[]} fg="#b91c1c" bg="#fee2e2" />
        <TopList title="TOP 10 ATMs Baixo Volume" items={[]} fg="#c2410c" bg="#ffedd5" />
        <TopList title="TOP 10 ATMs Alto Volume" items={[]} fg="#1e3a8a" bg="#dbeafe" />
        <TopList title="Top Usuários que Abasteceram CDs e ATMs" items={[]} fg="#0f172a" bg="#f8fafc" />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Nenhum ATM crítico · Nenhum ATM com baixo volume · Nenhum ATM com alto volume · Nenhum abastecimento registrado
      </p>
    </div>
  );
}

function PesquisaAvancada() {
  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader><DialogTitle>Pesquisa Avançada de Movimentações</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div><Label>Data Início</Label><Input type="date" placeholder="dd/mm/aaaa" /></div>
        <div><Label>Data Fim</Label><Input type="date" placeholder="dd/mm/aaaa" /></div>
        <div><Label>Local</Label>
          <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="cd">CD</SelectItem>
              <SelectItem value="atm">ATM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Selecione o Local</Label>
          <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Técnico</Label>
          <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Tipo</Label>
          <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Entrada">Entrada</SelectItem>
              <SelectItem value="Saida">Saída</SelectItem>
              <SelectItem value="Transferencia">Transferência</SelectItem>
              <SelectItem value="Ajuste">Ajuste</SelectItem>
              <SelectItem value="Abastecimento">Abastecimento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Ordenar Por</Label>
          <Select defaultValue="data"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="data">Data</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Direção</Label>
          <Select defaultValue="desc"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascendente ↑</SelectItem>
              <SelectItem value="desc">Descendente ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border rounded-md overflow-hidden mt-3">
        <table className="excel-table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th>Qtd</th><th>Origem</th><th>Destino</th><th>Técnico</th></tr></thead>
          <tbody>
            <tr><td colSpan={7} className="text-center py-6">
              <p>0 movimentações encontradas</p>
              <p className="font-bold text-muted-foreground">Nenhuma movimentação encontrada</p>
            </td></tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end"><Button variant="outline">Limpar Filtros</Button></div>
    </DialogContent>
  );
}
