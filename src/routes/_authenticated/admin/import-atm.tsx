import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/admin/import-atm")({
  head: () => ({
    meta: [
      { title: "Importar ATMs (XLSX) | Bobi Control" },
      { name: "description", content: "Importe a planilha oficial de ATMs e atualize a base do Bobi Control." },
      { property: "og:title", content: "Importar ATMs (XLSX) | Bobi Control" },
      { property: "og:description", content: "Importe a planilha oficial de ATMs e atualize a base do Bobi Control." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImportAtmPage,
});

const HEADERS = [
  "ID",
  "TOPDESK",
  "EMPRESA",
  "LINHA",
  "ESTACAO",
  "PRODUTOS",
  "MODELO",
  "TRANSACIONA",
  "NUMERO DE SERIE",
  "PATRIMONIO",
  "OBSERVACAO",
] as const;

const CAMPO: Record<string, string> = {
  ID: "id_atm",
  TOPDESK: "topdesk",
  EMPRESA: "empresa",
  LINHA: "linha",
  ESTACAO: "estacao",
  PRODUTOS: "produtos",
  MODELO: "modelo",
  "NUMERO DE SERIE": "numero_de_serie",
  TRANSACIONA: "transaciona",
  PATRIMONIO: "patrimonio",
  OBSERVACAO: "observacao",
};

type Linha = Record<string, string | null>;

function limpar(v: unknown): string {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
}
function chave(v: unknown): string {
  return limpar(v)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ImportAtmPage() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [arquivo, setArquivo] = useState<string>("");
  const [aba, setAba] = useState<string>("");
  const [erroHeaders, setErroHeaders] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [log, setLog] = useState<{ inseridos: number; atualizados: number; erros: string[] } | null>(null);

  async function lerArquivo(file: File) {
    setLog(null);
    setLinhas([]);
    setErroHeaders(null);
    setArquivo(file.name);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });

      let melhor: { nome: string; registros: Linha[] } | null = null;
      let faltandoGlobal: string[] = HEADERS.slice();

      for (const nome of wb.SheetNames) {
        const matriz = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nome], {
          header: 1,
          defval: "",
          raw: false,
          blankrows: false,
        });
        for (let i = 0; i < Math.min(matriz.length, 10); i++) {
          const cabecalho = (matriz[i] ?? []).map(chave);
          if (!cabecalho.includes("ID") || !cabecalho.includes("TOPDESK")) continue;
          const faltando = HEADERS.filter((h) => !cabecalho.includes(chave(h)));
          if (faltando.length) {
            if (faltando.length < faltandoGlobal.length) faltandoGlobal = faltando;
            continue;
          }
          const registros: Linha[] = [];
          for (let j = i + 1; j < matriz.length; j++) {
            const celulas = matriz[j] ?? [];
            const reg: Linha = {};
            cabecalho.forEach((h, idx) => {
              const campo = CAMPO[h];
              if (!campo) return;
              const valor = limpar(celulas[idx]);
              reg[campo] = valor === "" || valor === "-" ? null : valor;
            });
            if (reg.id_atm) registros.push(reg);
          }
          if (registros.length && (!melhor || registros.length > melhor.registros.length)) {
            melhor = { nome, registros };
          }
          break;
        }
      }

      if (!melhor) {
        setErroHeaders(`Cabeçalhos obrigatórios não encontrados. Faltando: ${faltandoGlobal.join(", ")}`);
        toast.error("Planilha sem os cabeçalhos esperados");
        return;
      }

      // remove IDs duplicados dentro do próprio arquivo (mantém o último)
      const mapa = new Map<string, Linha>();
      for (const r of melhor.registros) mapa.set(String(r.id_atm), r);
      const registros = [...mapa.values()];

      setAba(melhor.nome);
      setLinhas(registros);
      // eslint-disable-next-line no-console
      console.log(`[import-atm] aba "${melhor.nome}" — ${registros.length} linhas. Preview 5:`, registros.slice(0, 5));
      toast.success(`${registros.length} ATMs lidas da aba "${melhor.nome}"`);
    } catch (e) {
      toast.error(`Erro ao ler arquivo: ${(e as Error).message}`);
    }
  }

  async function importar() {
    if (!linhas.length) return;
    setImportando(true);
    const erros: string[] = [];
    let inseridos = 0;
    let atualizados = 0;

    const { data: existentesData } = await supabase.from("atms").select("id_atm");
    const existentes = new Set((existentesData ?? []).map((x) => String(x.id_atm)));

    for (let i = 0; i < linhas.length; i += 200) {
      const lote = linhas.slice(i, i + 200);
      const { error } = await supabase.from("atms").upsert(lote as never, { onConflict: "id_atm" });
      if (error) {
        erros.push(`Lote ${i + 1}-${i + lote.length}: ${error.message}`);
        continue;
      }
      for (const r of lote) {
        if (existentes.has(String(r.id_atm))) atualizados++;
        else inseridos++;
      }
    }

    setLog({ inseridos, atualizados, erros });
    setImportando(false);
    // eslint-disable-next-line no-console
    console.log("[import-atm] resultado:", { inseridos, atualizados, erros });
    if (erros.length) toast.error(`${erros.length} erro(s) na importação`);
    else toast.success(`${inseridos} importadas · ${atualizados} atualizadas`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold">Importar ATMs (XLSX)</h1>
          <p className="text-sm text-muted-foreground">
            A coluna <code>ID</code> da planilha corresponde ao <code>ID_ATM</code>: existente é atualizado, novo é criado.
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Cabeçalhos obrigatórios</div>
        <div className="flex flex-wrap gap-2 text-xs">
          {HEADERS.map((h) => (
            <span key={h} className="px-2 py-1 rounded bg-muted font-mono">
              {h}
            </span>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-sm hover:border-primary transition">
          <Upload className="h-4 w-4" /> Selecionar planilha (.xlsx / .xls)
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void lerArquivo(f);
              e.target.value = "";
            }}
          />
        </label>
        {arquivo && <p className="text-xs text-muted-foreground">Arquivo: {arquivo}</p>}
        {erroHeaders && (
          <p className="text-sm text-destructive inline-flex items-center gap-1">
            <XCircle className="h-4 w-4" /> {erroHeaders}
          </p>
        )}
      </Card>

      {linhas.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <strong>{linhas.length}</strong> ATMs válidas — aba <code>{aba}</code>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setLinhas([]); setLog(null); }}>
                Cancelar
              </Button>
              <Button onClick={importar} disabled={importando}>
                {importando ? "Importando…" : `Importar ${linhas.length} ATMs`}
              </Button>
            </div>
          </div>
          <div className="overflow-auto border rounded">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  {HEADERS.map((h) => (
                    <th key={h} className="text-left px-2 py-1 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.slice(0, 20).map((r, i) => (
                  <tr key={String(r.id_atm)} className={i % 2 ? "bg-muted/40" : ""}>
                    {HEADERS.map((h) => (
                      <td key={h} className="px-2 py-1 whitespace-nowrap">{r[CAMPO[chave(h)]] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Mostrando as 20 primeiras linhas. Todas serão importadas.</p>
        </Card>
      )}

      {log && (
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold">Resultado da importação</h2>
          <p className="text-sm">
            <span className="text-emerald-600 font-medium">{log.inseridos} importadas</span> ·{" "}
            <span className="text-primary font-medium">{log.atualizados} atualizadas</span> ·{" "}
            <span className="text-destructive font-medium">{log.erros.length} erro(s)</span>
          </p>
          {log.erros.length > 0 && (
            <div className="max-h-64 overflow-auto border rounded p-2 text-xs bg-muted/40 space-y-1">
              {log.erros.map((e, i) => (
                <div key={i} className="font-mono text-destructive">{e}</div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
