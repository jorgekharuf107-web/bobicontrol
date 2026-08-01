import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackButton } from "@/components/back-button";
import { CsvExportButton } from "@/components/csv-export-button";
import { confirmarExclusao } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_authenticated/estacoes")({
  head: () => ({
    meta: [
      { title: "Estações | Bobi Control" },
      { name: "description", content: "Cadastro e manutenção das estações vinculadas às linhas do Bobi Control." },
      { property: "og:title", content: "Estações | Bobi Control" },
      { property: "og:description", content: "Cadastro e manutenção das estações vinculadas às linhas do Bobi Control." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/estacoes" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/estacoes" }],
  }),
  component: EstacoesPage,
});

const TODOS = "__todos__";

function EstacoesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", linha_id: "" });
  const [salvando, setSalvando] = useState(false);

  // filtros
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"asc" | "desc">("asc");
  const [fNome, setFNome] = useState(TODOS);
  const [fLinha, setFLinha] = useState(TODOS);
  const [fCombo, setFCombo] = useState(TODOS);

  const { data: estacoes = [] } = useQuery({
    queryKey: ["estacoes"],
    queryFn: async () => (await supabase.from("estacoes").select("*, linhas(nome, cor_hex)").order("nome")).data ?? [],
  });
  const { data: linhas = [] } = useQuery({
    queryKey: ["linhas-sel"],
    queryFn: async () => (await supabase.from("linhas").select("id, nome, cor_hex").order("nome")).data ?? [],
  });

  const nomesUnicos = useMemo(
    () => Array.from(new Set(estacoes.map((e: any) => e.nome).filter(Boolean))).sort((a: any, b: any) => a.localeCompare(b)),
    [estacoes],
  );
  const linhasUnicas = useMemo(() => {
    const map = new Map<string, string>();
    estacoes.forEach((e: any) => { if (e.linhas?.nome) map.set(e.linhas.nome, e.linhas.cor_hex || "#1e40af"); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [estacoes]);
  const combosUnicos = useMemo(
    () => Array.from(new Set(estacoes.map((e: any) => `${e.nome} — ${e.linhas?.nome ?? "Sem linha"}`))).sort((a, b) => a.localeCompare(b)),
    [estacoes],
  );

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const out = estacoes.filter((e: any) => {
      const linhaNome = e.linhas?.nome ?? "";
      const combo = `${e.nome} — ${linhaNome || "Sem linha"}`;
      if (q && !`${e.nome} ${linhaNome}`.toLowerCase().includes(q)) return false;
      if (fNome !== TODOS && e.nome !== fNome) return false;
      if (fLinha !== TODOS && linhaNome !== fLinha) return false;
      if (fCombo !== TODOS && combo !== fCombo) return false;
      return true;
    });
    return out.sort((a: any, b: any) => {
      const c = (a.linhas?.nome ?? "").localeCompare(b.linhas?.nome ?? "") || a.nome.localeCompare(b.nome);
      return ordem === "asc" ? c : -c;
    });
  }, [estacoes, busca, fNome, fLinha, fCombo, ordem]);

  function abrirEdicao(e: any) {
    setEditingId(e.id);
    setForm({ nome: e.nome, linha_id: e.linha_id ?? "" });
    setOpen(true);
  }

  async function salvar() {
    const nome = form.nome.trim();
    if (!nome) return toast.error("Informe o nome da estação");
    if (!form.linha_id) return toast.error("Selecione a linha");

    setSalvando(true);
    try {
      // Validação anti-duplicata: Nome da Estação + Linha
      let dup = supabase.from("estacoes").select("id").ilike("nome", nome).eq("linha_id", form.linha_id);
      if (editingId) dup = dup.neq("id", editingId);
      const { data: existentes, error: errDup } = await dup;
      if (errDup) return toast.error(errDup.message);
      if ((existentes ?? []).length > 0) {
        return toast.error("Já existe uma estação com este Nome nesta Linha.");
      }

      const payload = { nome, linha_id: form.linha_id };
      const { error } = editingId
        ? await supabase.from("estacoes").update(payload).eq("id", editingId)
        : await supabase.from("estacoes").insert(payload);
      if (error) return toast.error(error.message);
      toast.success(editingId ? "Estação atualizada" : "Estação criada");
      setOpen(false); setForm({ nome: "", linha_id: "" }); setEditingId(null);
      qc.invalidateQueries({ queryKey: ["estacoes"] });
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!(await confirmarExclusao("estação"))) return;
    const { error } = await supabase.from("estacoes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Estação excluída");
    qc.invalidateQueries({ queryKey: ["estacoes"] });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-2xl font-bold">Estações</h1>
        </div>
        <div className="flex items-center gap-2">
          <CsvExportButton
            rows={filtradas}
            columns={[
              { header: "Nome", accessor: (e: any) => e.nome },
              { header: "Linha", accessor: (e: any) => e.linhas?.nome ?? "" },
            ]}
            filename="estacoes"
          />
          <Button onClick={() => { setEditingId(null); setForm({ nome: "", linha_id: "" }); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      {/* Barra de pesquisa */}
      <div className="flex flex-wrap items-end gap-2 p-2 rounded border bg-muted/40">
        <div className="flex-1 min-w-[160px]">
          <Label className="text-[11px] mb-0.5 block">Pesquisar</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Todas / Nome da Estação / Linha" className="h-8 pl-7 text-sm" />
          </div>
        </div>

        <div className="w-[140px]">
          <Label className="text-[11px] mb-0.5 block">Ordenar</Label>
          <Select value={ordem} onValueChange={(v) => setOrdem(v as "asc" | "desc")}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascendente</SelectItem>
              <SelectItem value="desc">Descendente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Label className="text-[11px] mb-0.5 block">Nome da Estação</Label>
          <Select value={fNome} onValueChange={setFNome}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {nomesUnicos.map((n: any) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Label className="text-[11px] mb-0.5 block">Linha</Label>
          <Select value={fLinha} onValueChange={setFLinha}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {linhasUnicas.map(([nome, cor]) => (
                <SelectItem key={nome} value={nome}>
                  <span className="inline-flex items-center gap-2">
                    {nome}
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: cor }} />
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[220px]">
          <Label className="text-[11px] mb-0.5 block">Nome da Estação + Linha</Label>
          <Select value={fCombo} onValueChange={setFCombo}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {combosUnicos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" className="h-8 text-sm"
          onClick={() => { setBusca(""); setFNome(TODOS); setFLinha(TODOS); setFCombo(TODOS); setOrdem("asc"); }}>
          Limpar
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="excel-table w-full table-fixed text-xs">
          <thead>
            <tr>
              <th className="w-[45%] break-words whitespace-normal">Nome</th>
              <th className="w-[35%] break-words whitespace-normal">Linha</th>
              <th className="w-[20%] break-words whitespace-normal">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 font-bold text-muted-foreground">Nenhuma estação encontrada</td></tr>
            )}
            {filtradas.map((e: any) => (
              <tr key={e.id} className="cursor-pointer" onClick={() => abrirEdicao(e)}>
                <td className="break-words whitespace-normal py-1">{e.nome}</td>
                <td className="break-words whitespace-normal py-1">
                  {e.linhas ? (
                    <span className="inline-flex items-center gap-1.5">
                      {e.linhas.nome}
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ background: e.linhas.cor_hex || "#1e40af" }} />
                    </span>
                  ) : "—"}
                </td>
                <td className="py-1" onClick={(ev) => ev.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEdicao(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluir(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Estação" : "Nova Estação"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div><Label>Linha</Label>
              <Select value={form.linha_id || undefined} onValueChange={(v) => setForm({ ...form, linha_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a linha" /></SelectTrigger>
                <SelectContent>
                  {linhas.map((l: any) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="inline-flex items-center gap-2">
                        {l.nome}
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: l.cor_hex || "#1e40af" }} />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{editingId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
