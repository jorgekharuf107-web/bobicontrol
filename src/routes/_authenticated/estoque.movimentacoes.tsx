import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackButton } from "@/components/back-button";
import { TabelaCrud, type Coluna } from "@/components/tabela-crud";
import { MovimentacaoForm, TIPOS, LOCAIS_ORIG_DEST, LOCAIS_TIPO } from "@/components/movimentacao-form";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/_authenticated/estoque/movimentacoes")({
  head: () => ({
    meta: [
      { title: "Nova Movimentação | Bobi Control" },
      { name: "description", content: "Registre recebimentos, retiradas, abastecimentos e permutas de bobinas." },
      { property: "og:title", content: "Nova Movimentação | Bobi Control" },
      { property: "og:description", content: "Registre recebimentos, retiradas, abastecimentos e permutas de bobinas." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/estoque/movimentacoes" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/estoque/movimentacoes" }],
  }),
  component: MovimentacoesPage,
});

function MovimentacoesPage() {
  const { user, isAdmin, isGestor } = useCurrentUser();
  const [fTipo, setFTipo] = useState<string>("todos");
  const [fItem, setFItem] = useState<string>("todos");
  const [fTec, setFTec] = useState<string>("todos");
  const [fData, setFData] = useState<string>("");
  const [fOrig, setFOrig] = useState<string>("todos");
  const [fDest, setFDest] = useState<string>("todos");
  const [fSearch, setFSearch] = useState<string>("");

  const { data: itens = [] } = useQuery({
    queryKey: ["itens-mov"],
    queryFn: async () => (await supabase.from("itens").select("id, nome").order("nome")).data ?? [],
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

  const podeVerTudo = isAdmin || isGestor;
  /** Data local no formato yyyy-mm-dd — filtro por dia, ignorando a hora. */
  const diaLocal = (v: string) => (v ? new Date(v).toLocaleDateString("sv-SE") : "");

  const todas = useMemo(() => [...pendentes, ...(movs as any[])], [pendentes, movs]);

  const filtradas = useMemo(() =>
    todas.filter((m: any) => {
      if (!podeVerTudo && m.tecnico_id !== user?.id) return false;
      if (fTipo !== "todos" && m.tipo !== fTipo) return false;
      if (fItem !== "todos" && m.item_id !== fItem) return false;
      if (fTec !== "todos" && m.tecnico_id !== fTec) return false;
      if (fOrig !== "todos" && m.origem_tipo !== fOrig) return false;
      if (fDest !== "todos" && m.destino_tipo !== fDest) return false;
      if (fData && diaLocal(m.data) !== fData) return false;
      if (fSearch.trim()) {
        const s = fSearch.trim().toLowerCase();
        const hay = [m.tipo, m.itens?.nome, m.origem_tipo, m.destino_tipo, m.usuarios?.nome_completo, m.observacao].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    })
  , [todas, fTipo, fItem, fTec, fData, fOrig, fDest, fSearch, podeVerTudo, user?.id]);

  const center = "text-center align-middle whitespace-normal break-words max-w-[110px]";
  const wrap = "whitespace-normal break-words max-w-[140px]";

  const colunas: Coluna<any>[] = [
    { header: "Data", className: center, cell: (m) => new Date(m.data).toLocaleString("pt-BR"), csv: (m) => new Date(m.data).toLocaleString("pt-BR") },
    { header: "Tipo", className: center, cell: (m) => (
        <span>{m.tipo}{m.__offline && <span className="ml-1 text-[10px] text-orange-600">(offline)</span>}</span>
      ), csv: (m) => m.tipo ?? "" },
    { header: "Origem", className: center, cell: (m) => m.origem_tipo ?? (m.linha_origem_id ? "Linha" : "—"), csv: (m) => m.origem_tipo ?? "" },
    { header: "Destino", className: center, cell: (m) => m.destino_tipo ?? (m.linha_destino_id ? "Linha" : "—"), csv: (m) => m.destino_tipo ?? "" },
    { header: "Item", className: wrap, cell: (m) => m.itens?.nome ?? "—", csv: (m) => m.itens?.nome ?? "" },
    { header: "QTD", className: center, cell: (m) => m.qtd, csv: (m) => m.qtd },
    { header: "Técnico", className: wrap, cell: (m) => m.usuarios?.nome_completo ?? "—", csv: (m) => m.usuarios?.nome_completo ?? "" },
  ];

  const inputH = "h-8 text-sm";
  const labelC = "text-[11px] mb-0.5 block font-medium";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-xl font-bold">Nova Movimentação</h1>
      </div>

      <Tabs defaultValue="nova">
        <TabsList>
          <TabsTrigger value="nova">Nova Movimentação</TabsTrigger>
          <TabsTrigger value="historico">Histórico de Movimentação</TabsTrigger>
        </TabsList>

        <TabsContent value="nova" className="space-y-3 pt-3">
          <MovimentacaoForm />
        </TabsContent>

        <TabsContent value="historico" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="col-span-2">
              <Label className={labelC}>🔎 Pesquisar</Label>
              <Input className={inputH} value={fSearch} onChange={(e) => setFSearch(e.target.value)} placeholder="Tipo, item, origem/destino, técnico…" />
            </div>
            <div>
              <Label className={labelC}>Data</Label>
              <Input type="date" className={inputH} value={fData} onChange={(e) => setFData(e.target.value)} />
            </div>
            <div>
              <Label className={labelC}>Tipo</Label>
              <Select value={fTipo} onValueChange={setFTipo}>
                <SelectTrigger className={inputH}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelC}>Origem</Label>
              <Select value={fOrig} onValueChange={setFOrig}>
                <SelectTrigger className={inputH}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {LOCAIS_ORIG_DEST.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelC}>Destino</Label>
              <Select value={fDest} onValueChange={setFDest}>
                <SelectTrigger className={inputH}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {LOCAIS_TIPO.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelC}>Item</Label>
              <Select value={fItem} onValueChange={setFItem}>
                <SelectTrigger className={inputH}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {itens.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {podeVerTudo && (
              <div>
                <Label className={labelC}>Técnico</Label>
                <Select value={fTec} onValueChange={setFTec}>
                  <SelectTrigger className={inputH}><SelectValue /></SelectTrigger>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
