import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Upload, CheckCircle2, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { parseCSV } from "@/lib/csv";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { TabelaCrud, type Coluna } from "@/components/tabela-crud";

export const Route = createFileRoute("/_authenticated/importar-dados")({
  head: () => ({
    meta: [
      { title: "Importar Dados | Bobi Control" },
      { name: "description", content: "Importe planilhas e arquivos de dados para as tabelas do Bobi Control." },
      { property: "og:title", content: "Importar Dados | Bobi Control" },
      { property: "og:description", content: "Importe planilhas e arquivos de dados para as tabelas do Bobi Control." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/importar-dados" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/importar-dados" }],
  }),
  component: ImportarDadosPage,
});

type EntityKey = "linhas" | "fornecedores" | "atms" | "cds" | "estacoes" | "itens" | "estoque" | "usuarios";

type MapResult = { row: Record<string, any>; error?: string; lineNumber: number };

type EntitySpec = {
  key: EntityKey;
  label: string;
  table: string;
  /** Headers accepted (canonical -> aliases). Values are lowercased on match. */
  fields: { header: string; description: string }[];
  /** Map a parsed CSV row (headers normalized) to a DB row; may throw or return { error }. */
  map: (row: Record<string, string>, ctx: ImportCtx) => Record<string, any> | { __error: string };
  /** Optional per-row validation on the mapped record. */
  validate?: (mapped: Record<string, any>, ctx: ImportCtx) => string | null;
};

type ImportCtx = {
  linhasById: Set<string>;
  linhasByNome: Map<string, string>;
  cdsById: Set<string>;
  cdsByNome: Map<string, string>;
  estacoesById: Set<string>;
  estacoesByNome: Map<string, string>;
  fornecedoresById: Set<string>;
  itensByCodigo: Map<string, string>;
  usuariosByEmail: Map<string, string>;
  atmsByIdAtm: Set<string>;
  usuarioAtual: string;
};


function norm(s: string) { return (s ?? "").trim().toLowerCase(); }
function toBool(v: string, def = true): boolean {
  const s = norm(v);
  if (s === "" || s === "null") return def;
  return ["sim", "s", "true", "1", "ativa", "ativo", "yes", "y"].includes(s);
}
function toInt(v: string, def = 0): number {
  const n = parseInt((v ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : def;
}
function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(row).find((h) => norm(h) === norm(k));
    if (found && row[found] !== undefined && row[found] !== "") return row[found];
  }
  return "";
}
function resolveLinhaId(v: string, ctx: ImportCtx): string | null {
  if (!v) return null;
  const val = v.trim();
  if (ctx.linhasById.has(val)) return val;
  const byNome = ctx.linhasByNome.get(norm(val));
  return byNome ?? null;
}

const SPECS: EntitySpec[] = [
  {
    key: "linhas",
    label: "Linhas",
    table: "linhas",
    fields: [
      { header: "nome", description: "obrigatório" },
      { header: "cor_hex", description: "#RRGGBB, padrão #3b82f6" },
      { header: "linha_ativa_sim_nao", description: "Sim/Não" },
    ],
    map: (r) => {
      const nome = pick(r, "nome");
      if (!nome) return { __error: "Campo 'nome' obrigatório" };
      return {
        nome,
        cor_hex: pick(r, "cor_hex", "cor") || "#3b82f6",
        linha_ativa_sim_nao: toBool(pick(r, "linha_ativa_sim_nao", "ativa"), true),
      };
    },
  },
  {
    key: "fornecedores",
    label: "Fornecedores",
    table: "fornecedores",
    fields: [
      { header: "razao_social", description: "obrigatório" },
      { header: "cnpj", description: "obrigatório" },
      { header: "cidade", description: "" }, { header: "estado", description: "" },
      { header: "contato_principal", description: "" }, { header: "telefone", description: "" },
      { header: "email", description: "" }, { header: "endereco", description: "" },
      { header: "bairro", description: "" }, { header: "cep", description: "" },
      { header: "motorista1", description: "" }, { header: "motorista2", description: "" },
    ],
    map: (r) => {
      const razao = pick(r, "razao_social", "razao");
      const cnpj = pick(r, "cnpj");
      if (!razao || !cnpj) return { __error: "razao_social e cnpj são obrigatórios" };
      return {
        razao_social: razao, cnpj,
        cidade: pick(r, "cidade") || null,
        estado: pick(r, "estado") || null,
        contato_principal: pick(r, "contato_principal") || null,
        telefone: pick(r, "telefone") || null,
        email: pick(r, "email") || null,
        endereco: pick(r, "endereco") || null,
        bairro: pick(r, "bairro") || null,
        cidade_endereco: pick(r, "cidade_endereco") || pick(r, "cidade") || null,
        estado_uf: pick(r, "estado_uf") || pick(r, "estado") || null,
        cep: pick(r, "cep") || null,
        motorista1: pick(r, "motorista1", "motorista_1") || null,
        motorista2: pick(r, "motorista2", "motorista_2") || null,
        fornecedor_ativo_sim_nao: toBool(pick(r, "fornecedor_ativo_sim_nao", "ativo"), true),
      };
    },
  },
  {
    key: "estacoes",
    label: "Estações",
    table: "estacoes",
    fields: [
      { header: "nome", description: "obrigatório" },
      { header: "linha_id", description: "UUID ou nome da linha" },
      { header: "ativa", description: "Sim/Não" },
    ],
    map: (r, ctx) => {
      const nome = pick(r, "nome");
      if (!nome) return { __error: "nome obrigatório" };
      const linhaRaw = pick(r, "linha_id", "linha");
      const linha_id = linhaRaw ? resolveLinhaId(linhaRaw, ctx) : null;
      if (linhaRaw && !linha_id) return { __error: `Linha não encontrada: "${linhaRaw}"` };
      return { nome, linha_id, ativa: toBool(pick(r, "ativa"), true) };
    },
  },
  {
    key: "cds",
    label: "CDs",
    table: "cds",
    fields: [
      { header: "nome_cd", description: "obrigatório" },
      { header: "linha_id", description: "UUID ou nome da linha" },
      { header: "capacidade", description: "" }, { header: "nivel_minimo", description: "" },
      { header: "estoque_minimo", description: "" }, { header: "status", description: "ativo/inativo" },
    ],
    map: (r, ctx) => {
      const nome_cd = pick(r, "nome_cd", "nome");
      if (!nome_cd) return { __error: "nome_cd obrigatório" };
      const linhaRaw = pick(r, "linha_id", "linha");
      const linha_id = linhaRaw ? resolveLinhaId(linhaRaw, ctx) : null;
      if (linhaRaw && !linha_id) return { __error: `Linha não encontrada: "${linhaRaw}"` };
      return {
        nome_cd,
        estacao: pick(r, "estacao") || null,
        linha_id,
        capacidade: toInt(pick(r, "capacidade")),
        nivel_minimo: toInt(pick(r, "nivel_minimo")),
        estoque_minimo: toInt(pick(r, "estoque_minimo")),
        status: (norm(pick(r, "status")) === "inativo" ? "inativo" : "ativo"),
      };
    },
  },
  {
    key: "atms",
    label: "ATMs",
    table: "atms",
    fields: [
      { header: "ID_ATM", description: "obrigatório e único" },
      { header: "MODELO", description: "nome/modelo (MK, MK NEO, TCI...)" },
      { header: "LINHA_ID", description: "UUID ou nome da linha (obrigatório)" },
      { header: "ESTACAO_ID", description: "UUID ou nome da estação" },
      { header: "LOCALIZACAO_DETALHADA", description: "" },
    ],
    map: (r, ctx) => {
      const id_atm = pick(r, "id_atm", "id");
      if (!id_atm) return { __error: "ID_ATM obrigatório" };
      if (ctx.atmsByIdAtm.has(norm(id_atm))) return { __error: `ID_ATM já cadastrado: "${id_atm}"` };
      const linhaRaw = pick(r, "linha_id", "linha");
      if (!linhaRaw) return { __error: "LINHA_ID obrigatório" };
      const linha_id = resolveLinhaId(linhaRaw, ctx);
      if (!linha_id) return { __error: `Linha não encontrada: "${linhaRaw}"` };
      const estRaw = pick(r, "estacao_id", "estacao");
      const estacao_id = estRaw
        ? (ctx.estacoesById.has(estRaw.trim()) ? estRaw.trim() : ctx.estacoesByNome.get(norm(estRaw)) ?? null)
        : null;
      if (estRaw && !estacao_id) return { __error: `Estação não encontrada: "${estRaw}"` };
      return {
        id_atm, linha_id, estacao_id,
        modelo: pick(r, "modelo") || null,
        localizacao_detalhada: pick(r, "localizacao_detalhada") || null,
        usuario_atm: ctx.usuarioAtual || null,
      };
    },
  },

  {
    key: "itens",
    label: "Itens",
    table: "itens",
    fields: [
      { header: "nome", description: "obrigatório" },
      { header: "codigo", description: "obrigatório e único" },
      { header: "unidade", description: "Unidade/Caixa" },
      { header: "qtd_por_unidade", description: ">=1" },
      { header: "estoque_minimo", description: "" }, { header: "medida", description: "" },
      { header: "tipo_bobina", description: "caixa_3 ou avulsa" },
    ],
    map: (r) => {
      const nome = pick(r, "nome");
      const codigo = pick(r, "codigo");
      if (!nome || !codigo) return { __error: "nome e codigo obrigatórios" };
      const tipo = norm(pick(r, "tipo_bobina"));
      return {
        nome, codigo,
        unidade: (pick(r, "unidade") || "Unidade") as any,
        qtd_por_unidade: Math.max(1, toInt(pick(r, "qtd_por_unidade"), 1)),
        estoque_minimo: toInt(pick(r, "estoque_minimo")),
        medida: pick(r, "medida") || null,
        descricao: pick(r, "descricao") || null,
        tipo_bobina: tipo === "caixa_3" || tipo === "avulsa" ? tipo : null,
        qtd_caixas: toInt(pick(r, "qtd_caixas")),
        qtd_avulsas: toInt(pick(r, "qtd_avulsas")),
        ativo: toBool(pick(r, "ativo"), true),
      };
    },
  },
  {
    key: "estoque",
    label: "Estoque (Movimentações)",
    table: "movimentacoes",
    fields: [
      { header: "tipo", description: "Entrada/Saida/Permuta/Ajuste" },
      { header: "item_codigo", description: "código do item" },
      { header: "qtd", description: "obrigatório" },
      { header: "origem_tipo", description: "ATM/CD" }, { header: "origem_id", description: "" },
      { header: "destino_tipo", description: "ATM/CD" }, { header: "destino_id", description: "" },
      { header: "observacao", description: "" }, { header: "data", description: "ISO" },
    ],
    map: (r, ctx) => {
      const tipo = pick(r, "tipo");
      const qtd = toInt(pick(r, "qtd", "quantidade"));
      if (!tipo || !qtd) return { __error: "tipo e qtd obrigatórios" };
      const codigo = pick(r, "item_codigo", "codigo");
      const item_id = codigo ? ctx.itensByCodigo.get(norm(codigo)) : null;
      if (codigo && !item_id) return { __error: `Item não encontrado: "${codigo}"` };
      return {
        tipo: tipo as any, qtd, item_id: item_id ?? null,
        origem_tipo: (pick(r, "origem_tipo") || null) as any,
        origem_id: pick(r, "origem_id") || null,
        destino_tipo: (pick(r, "destino_tipo") || null) as any,
        destino_id: pick(r, "destino_id") || null,
        observacao: pick(r, "observacao") || null,
        data: pick(r, "data") || new Date().toISOString(),
      };
    },
  },
  {
    key: "usuarios",
    label: "Usuários",
    table: "usuarios",
    fields: [
      { header: "email", description: "obrigatório, precisa já ter conta" },
      { header: "nome_completo", description: "" },
      { header: "perfil", description: "admin_geral/supervisor_linha/tecnico_estacao/dispatcher" },
      { header: "ativo", description: "Sim/Não" },
    ],
    map: (r, ctx) => {
      const email = norm(pick(r, "email"));
      if (!email) return { __error: "email obrigatório" };
      const id = ctx.usuariosByEmail.get(email);
      if (!id) return { __error: `Usuário não existe (precisa logar antes): ${email}` };
      const perfil = pick(r, "perfil") || "tecnico_estacao";
      const validos = ["admin_geral", "supervisor_linha", "tecnico_estacao", "dispatcher"];
      if (!validos.includes(perfil)) return { __error: `Perfil inválido: ${perfil}` };
      return {
        id, email,
        nome_completo: pick(r, "nome_completo", "nome") || email,
        perfil,
        ativo: toBool(pick(r, "ativo"), true),
      };
    },
  },
];

function ImportarDadosPage() {
  const router = useRouter();
  const { isSuperAdmin, nome, loading } = useCurrentUser();
  const [ctx, setCtx] = useState<ImportCtx | null>(null);
  const [active, setActive] = useState<EntityKey | null>(null);
  const [preview, setPreview] = useState<MapResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);

  useEffect(() => {
    if (!loading && !isSuperAdmin) router.navigate({ to: "/dashboard", replace: true });
  }, [loading, isSuperAdmin, router]);

  useEffect(() => { void loadCtx(); }, [nome]);
  async function loadCtx() {
    const [linhas, cds, estacoes, forn, itens, usu, atms] = await Promise.all([
      supabase.from("linhas").select("id,nome"),
      supabase.from("cds").select("id,nome_cd"),
      supabase.from("estacoes").select("id,nome"),
      supabase.from("fornecedores").select("id"),
      supabase.from("itens").select("id,codigo"),
      supabase.from("usuarios").select("id,email"),
      supabase.from("atms").select("id_atm"),
    ]);
    setCtx({
      linhasById: new Set((linhas.data ?? []).map((x: any) => x.id)),
      linhasByNome: new Map((linhas.data ?? []).map((x: any) => [norm(x.nome), x.id])),
      cdsById: new Set((cds.data ?? []).map((x: any) => x.id)),
      cdsByNome: new Map((cds.data ?? []).map((x: any) => [norm(x.nome_cd), x.id])),
      estacoesById: new Set((estacoes.data ?? []).map((x: any) => x.id)),
      estacoesByNome: new Map((estacoes.data ?? []).map((x: any) => [norm(x.nome), x.id])),
      fornecedoresById: new Set((forn.data ?? []).map((x: any) => x.id)),
      itensByCodigo: new Map((itens.data ?? []).map((x: any) => [norm(x.codigo), x.id])),
      usuariosByEmail: new Map((usu.data ?? []).map((x: any) => [norm(x.email), x.id])),
      atmsByIdAtm: new Set((atms.data ?? []).map((x: any) => norm(x.id_atm))),
      usuarioAtual: nome ?? "",
    });
  }


  const spec = useMemo(() => SPECS.find((s) => s.key === active) ?? null, [active]);

  async function handleFile(file: File, key: EntityKey) {
    if (!ctx) { toast.error("Aguarde carregar contexto"); return; }
    const s = SPECS.find((x) => x.key === key)!;
    setActive(key); setReport(null);
    try {
      let rows: Record<string, string>[];
      if (/\.xlsx?$/i.test(file.name)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: false })
          .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).trim(), String(v ?? "").trim()])));
      } else {
        rows = parseCSV(await file.text(), ";");
      }
      if (rows.length === 0) { toast.error("Arquivo vazio"); setPreview([]); return; }
      const vistos = new Set<string>();
      const mapped: MapResult[] = rows.map((r, i) => {
        const out = s.map(r, ctx);
        if ((out as any).__error) return { row: r, error: (out as any).__error, lineNumber: i + 2 };
        const rec = out as Record<string, any>;
        if (key === "atms") {
          const chave = norm(String(rec.id_atm ?? ""));
          if (vistos.has(chave)) return { row: rec, error: `ID_ATM duplicado no arquivo: "${rec.id_atm}"`, lineNumber: i + 2 };
          vistos.add(chave);
        }
        return { row: rec, lineNumber: i + 2 };
      });
      setPreview(mapped);
      const bad = mapped.filter((m) => m.error).length;
      toast.success(`${mapped.length} linhas lidas${bad ? ` — ${bad} com erro` : ""}`);
      if (bad) toast.error(mapped.find((m) => m.error)!.error!);
    } catch (e: any) {
      toast.error(`Erro ao ler arquivo: ${e.message}`);
    }
  }


  async function importar() {
    if (!spec || !preview.length) return;
    const valid = preview.filter((p) => !p.error);
    if (!valid.length) { toast.error("Nenhuma linha válida"); return; }
    setImporting(true);
    const errors: string[] = [...preview.filter((p) => p.error).map((p) => `Linha ${p.lineNumber}: ${p.error}`)];
    let ok = 0;
    // insert in chunks of 100
    for (let i = 0; i < valid.length; i += 100) {
      const chunk = valid.slice(i, i + 100);
      const { error, data } = await supabase.from(spec.table as any).upsert(chunk.map((c) => c.row)).select("id");
      if (error) {
        errors.push(`Lote linhas ${chunk[0].lineNumber}-${chunk[chunk.length - 1].lineNumber}: ${error.message}`);
      } else {
        ok += data?.length ?? chunk.length;
      }
    }
    setReport({ ok, fail: preview.length - ok, errors });
    setImporting(false);
    if (ok) toast.success(`${ok} registros importados com sucesso`);
    if (errors.length) toast.error(`${errors.length} erro(s) no relatório`);
  }

  const colunas: Coluna<MapResult>[] = useMemo(() => {
    if (!preview.length) return [];
    const keys = preview[0].error
      ? Object.keys(preview[0].row).slice(0, 6)
      : Object.keys(preview[0].row).slice(0, 6);
    return [
      { header: "Linha", cell: (r) => r.lineNumber, className: "w-16" },
      { header: "Status", cell: (r) => r.error
          ? <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" />{r.error}</span>
          : <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" />OK</span> },
      ...keys.map<Coluna<MapResult>>((k) => ({
        header: k,
        cell: (r) => String((r.row as any)[k] ?? ""),
      })),
    ];
  }, [preview]);

  if (loading) return <div className="p-6 text-muted-foreground">Carregando…</div>;
  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold">Importar Dados</h1>
          <p className="text-sm text-muted-foreground">Somente Super Administrador. CSV (separador <code>;</code>) ou XLSX.</p>
        </div>
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SPECS.map((s) => (
          <label
            key={s.key}
            className={`cursor-pointer border rounded-lg p-4 flex flex-col gap-2 items-start bg-card hover:border-primary transition ${active === s.key ? "border-primary ring-2 ring-primary/30" : ""}`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Upload className="h-4 w-4" /> {s.label}
            </div>
            <span className="text-[11px] text-muted-foreground">{s.fields.length} campos aceitos</span>
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f, s.key);
                e.target.value = "";
              }}
            />
          </label>
        ))}
      </div>

      {spec && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4" /> Cabeçalhos aceitos para {spec.label}</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {spec.fields.map((f) => (
              <span key={f.header} className="px-2 py-1 rounded bg-muted">
                <code className="font-mono">{f.header}</code>
                {f.description && <span className="text-muted-foreground"> — {f.description}</span>}
              </span>
            ))}
          </div>
        </Card>
      )}

      {preview.length > 0 && spec && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <strong>{preview.length}</strong> linhas lidas ·{" "}
              <span className="text-emerald-600">{preview.filter((p) => !p.error).length} válidas</span> ·{" "}
              <span className="text-destructive">{preview.filter((p) => p.error).length} com erro</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setPreview([]); setActive(null); setReport(null); }}>
                Cancelar
              </Button>
              <Button onClick={importar} disabled={importing || !preview.some((p) => !p.error)}>
                {importing ? "Importando…" : `Importar ${preview.filter((p) => !p.error).length} para ${spec.label}`}
              </Button>
            </div>
          </div>
          <TabelaCrud
            titulo={`Pré-visualização — ${spec.label}`}
            data={preview.slice(0, 200)}
            colunas={colunas}
            rowKey={(r) => String(r.lineNumber)}
            emptyMessage="Sem dados"
          />
          {preview.length > 200 && (
            <p className="text-xs text-muted-foreground">Mostrando as 200 primeiras linhas. Todas serão importadas.</p>
          )}
        </div>
      )}

      {report && (
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold">Relatório de Importação</h2>
          <p className="text-sm">
            <span className="text-emerald-600 font-medium">{report.ok} registros importados com sucesso</span>
            {report.fail > 0 && <> · <span className="text-destructive font-medium">{report.fail} falharam</span></>}
          </p>
          {report.errors.length > 0 && (
            <div className="max-h-64 overflow-auto border rounded p-2 text-xs bg-muted/40 space-y-1">
              {report.errors.map((e, i) => <div key={i} className="font-mono text-destructive">{e}</div>)}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
