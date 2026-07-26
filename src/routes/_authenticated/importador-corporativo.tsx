import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cloud, Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BackButton } from "@/components/back-button";
import { APP_NAME } from "@/lib/app-config";

export const Route = createFileRoute("/_authenticated/importador-corporativo")({
  head: () => ({
    meta: [
      { title: "Importador Corporativo | Bobi Control" },
      { name: "description", content: "Importe dados corporativos de linhas, estações, ATMs, itens e usuários." },
      { property: "og:title", content: "Importador Corporativo | Bobi Control" },
      { property: "og:description", content: "Importe dados corporativos de linhas, estações, ATMs, itens e usuários." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/importador-corporativo" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/importador-corporativo" }],
  }),
  beforeLoad: async () => {
    const { redirect } = await import("@tanstack/react-router");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: usr } = await supabase.from("usuarios").select("perfil").eq("id", data.user.id).maybeSingle();
    const perfil = String((usr as any)?.perfil ?? "").toUpperCase();
    if (perfil !== "SUPER_ADMIN") throw redirect({ to: "/dashboard" });
  },
  component: ImportadorCorporativoPage,
});


type EntidadeKey =
  | "linhas" | "estacoes" | "cds" | "fornecedores" | "atms"
  | "itens" | "estoque" | "usuarios" | "clientes" | "produtos";

const ENTIDADES: { key: EntidadeKey; label: string; tabela: string | null }[] = [
  { key: "linhas",       label: "Linhas",       tabela: "linhas" },
  { key: "estacoes",     label: "Estações",     tabela: "estacoes" },
  { key: "cds",          label: "CDs",          tabela: "cds" },
  { key: "fornecedores", label: "Fornecedores", tabela: "fornecedores" },
  { key: "atms",         label: "ATMs",         tabela: "atms" },
  { key: "itens",        label: "Itens",        tabela: "itens" },
  { key: "estoque",      label: "Estoque",      tabela: "movimentacoes" },
  { key: "usuarios",     label: "Usuários",     tabela: "usuarios" },
  { key: "clientes",     label: "Clientes",     tabela: null },
  { key: "produtos",     label: "Produtos",     tabela: null },
];

const STORAGE_KEY = "bobicontrol.conexao-corporativa";

type Conexao = { nome: string; url: string; token: string };

function mapearCampos(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase();
    if (key === "name") out.nome = v;
    else if (key === "id") out.id = v;
    else out[k] = v;
  }
  return out;
}

function ImportadorCorporativoPage() {
  const router = useRouter();
  const { isAdmin, loading } = useCurrentUser();
  const [conexao, setConexao] = useState<Conexao>({ nome: "", url: "", token: "" });
  const [entidade, setEntidade] = useState<EntidadeKey>("linhas");
  const [testando, setTestando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [total, setTotal] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !isAdmin) router.navigate({ to: "/dashboard", replace: true });
  }, [loading, isAdmin, router]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConexao(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  function salvarConexao(c: Conexao) {
    setConexao(c);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
  }

  function addLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  async function testarConexao() {
    if (!conexao.url) { toast.error("Informe a URL da API"); return; }
    setTestando(true);
    addLog(`Testando conexão com ${conexao.url}…`);
    try {
      const res = await fetch(conexao.url.replace(/\/$/, ""), {
        headers: conexao.token ? { Authorization: `Bearer ${conexao.token}` } : {},
      });
      if (res.ok) {
        toast.success("Conexão OK");
        addLog(`Conexão bem-sucedida (HTTP ${res.status})`);
      } else {
        toast.error(`Falha na conexão (HTTP ${res.status})`);
        addLog(`Falha (HTTP ${res.status})`);
      }
    } catch (e: any) {
      toast.error("Erro de rede", { description: e.message });
      addLog(`Erro de rede: ${e.message}`);
    } finally {
      setTestando(false);
    }
  }

  async function iniciarImportacao() {
    const spec = ENTIDADES.find((e) => e.key === entidade)!;
    if (!spec.tabela) {
      toast.error(`Entidade "${spec.label}" ainda não possui tabela mapeada.`);
      addLog(`Ignorada: ${spec.label} sem tabela local`);
      return;
    }
    if (!conexao.url) { toast.error("Informe a URL da API"); return; }
    setImportando(true);
    setProgresso(0);
    setTotal(0);
    addLog(`Iniciando importação de ${spec.label}…`);
    try {
      const endpoint = `${conexao.url.replace(/\/$/, "")}/api/${spec.key}`;
      addLog(`GET ${endpoint}`);
      const res = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          ...(conexao.token ? { Authorization: `Bearer ${conexao.token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const lista: any[] = Array.isArray(raw) ? raw : (raw.data ?? raw.items ?? []);
      if (!Array.isArray(lista)) throw new Error("Resposta não é uma lista");

      addLog(`Recebidos ${lista.length} registros`);
      const mapeados = lista.map(mapearCampos);

      let ok = 0;
      const lote = 100;
      for (let i = 0; i < mapeados.length; i += lote) {
        const chunk = mapeados.slice(i, i + lote);
        const { error, data } = await supabase
          .from(spec.tabela as any)
          .upsert(chunk)
          .select("id");
        if (error) {
          addLog(`Erro no lote ${i}-${i + chunk.length}: ${error.message}`);
        } else {
          ok += data?.length ?? chunk.length;
        }
        setProgresso(Math.round(((i + chunk.length) / mapeados.length) * 100));
      }
      setTotal(ok);
      addLog(`Importação concluída: ${ok}/${mapeados.length} registros`);
      toast.success(`${ok} registros importados com sucesso`);
    } catch (e: any) {
      addLog(`Falha: ${e.message}`);
      toast.error("Falha na importação", { description: e.message });
    } finally {
      setImportando(false);
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Cloud className="h-6 w-6" /> Importador de Dados Corporativo
          </h1>
          <p className="text-sm text-muted-foreground">
            {APP_NAME} — integração com API externa. Somente Administradores.
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <h2 className="font-medium">Conexão</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome da Conexão</Label>
            <Input
              id="nome"
              placeholder="Ex: ERP Matriz"
              value={conexao.nome}
              onChange={(e) => salvarConexao({ ...conexao, nome: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="url">URL da API</Label>
            <Input
              id="url"
              placeholder="https://api.empresa.com"
              value={conexao.url}
              onChange={(e) => salvarConexao({ ...conexao, url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="token">Token / API Key</Label>
            <Input
              id="token"
              type="password"
              placeholder="Bearer token"
              value={conexao.token}
              onChange={(e) => salvarConexao({ ...conexao, token: e.target.value })}
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          As credenciais ficam armazenadas apenas no seu navegador (localStorage).
        </p>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-medium">Importação</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-end">
          <div className="space-y-1.5">
            <Label>Entidade</Label>
            <Select value={entidade} onValueChange={(v) => setEntidade(v as EntidadeKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTIDADES.map((e) => (
                  <SelectItem key={e.key} value={e.key}>
                    {e.label}{!e.tabela && " (sem tabela local)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={testarConexao} disabled={testando || importando}>
            <Zap className="h-4 w-4 mr-1" /> {testando ? "Testando…" : "Testar Conexão"}
          </Button>
          <Button onClick={iniciarImportacao} disabled={importando || testando}>
            <Play className="h-4 w-4 mr-1" /> {importando ? "Importando…" : "Iniciar Importação"}
          </Button>
        </div>

        {(importando || progresso > 0) && (
          <div className="space-y-1">
            <Progress value={progresso} />
            <p className="text-xs text-muted-foreground">
              {progresso}% concluído {total > 0 && `· ${total} registros importados`}
            </p>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-medium">Log</h2>
        <div className="h-64 overflow-auto border rounded p-2 text-xs bg-muted/40 font-mono space-y-0.5">
          {log.length === 0
            ? <p className="text-muted-foreground">Nenhuma atividade ainda.</p>
            : log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </Card>
    </div>
  );
}
