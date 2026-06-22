import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/relatorio-gerencial")({
  component: RelatorioGerencial,
});

function StatCard({ label, value, bg, fg }: { label: string; value: number; bg: string; fg: string }) {
  return (
    <Card className="p-5" style={{ backgroundColor: bg, color: fg }}>
      <p className="text-xs uppercase tracking-wide opacity-90">{label}</p>
      <p className="text-4xl font-bold mt-2">{value}</p>
    </Card>
  );
}

function RelatorioGerencial() {
  const [ordenarPor, setOrdenarPor] = useState("criticidade");
  const [direcao, setDirecao] = useState("desc");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
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
            <StatCard label="Total ATMs" value={0} bg="#1e40af" fg="#fff" />
            <StatCard label="ATMs Críticos" value={0} bg="#dc2626" fg="#fff" />
            <StatCard label="ATMs Médio" value={0} bg="#60a5fa" fg="#fff" />
            <StatCard label="ATMs Cheios" value={0} bg="#0d9488" fg="#fff" />
          </div>
          <div className="flex gap-3 items-end flex-wrap">
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
              <tbody><tr><td colSpan={7} className="text-center py-8 font-bold text-muted-foreground">Nenhum registro encontrado</td></tr></tbody>
            </table>
          </Card>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-red-600" /> Crítico (&lt;50%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-amber-400" /> Médio (50-80%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block bg-teal-600" /> Cheio (≥80%)</span>
          </div>
        </TabsContent>

        <TabsContent value="mov">
          <Card className="p-0 overflow-hidden">
            <table className="excel-table">
              <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Item</th><th>Qtde</th><th>Origem</th><th>Destino</th><th>Técnico</th></tr></thead>
              <tbody><tr><td colSpan={7} className="text-center py-8 font-bold text-muted-foreground">Nenhuma movimentação registrada</td></tr></tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card className="p-0 overflow-hidden">
            <table className="excel-table">
              <thead><tr><th>ATM</th><th>Estação</th><th>Linha</th><th>Item</th><th>Qtde</th><th>Nível</th><th>Status</th></tr></thead>
              <tbody><tr><td colSpan={7} className="text-center py-8 font-bold text-muted-foreground">✓ Todos os ATMs estão com estoque adequado</td></tr></tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["Movimentações", 0], ["Alertas Ativos", 0], ["Cobertura", "0%"],
            ["Eventos Rastreados", 0], ["Alertas Baixo Estoque", 0], ["Uso de Filtros", 0],
          ].map(([l, v]) => (
            <Card key={l as string} className="p-5">
              <p className="text-xs uppercase text-muted-foreground">{l}</p>
              <p className="text-3xl font-bold mt-2">{v}</p>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
