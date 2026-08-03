import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bot, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaldoReal, corSaldo } from "@/lib/use-estoque-saldo";

type AtmRow = {
  id: string;
  id_atm: string;
  modelo: string | null;
  linha_id: string | null;
  estacao_id: string | null;
  capacidade_bobinas?: number | null;
  nivel_minimo?: number | null;
  cd_id?: string | null;
};

const TIPOS_BOBINA = ["Caixa (6 bobinas)", "Bobina Avulsa 100%", "Bobina Avulsa < 50%"];


export function AssistenteReposicao() {
  const [linhaId, setLinhaId] = useState("");
  const [estacaoId, setEstacaoId] = useState("");
  const [atmId, setAtmId] = useState("");
  const [atmNome, setAtmNome] = useState("");
  const [tipo, setTipo] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: linhas = [] } = useQuery({
    queryKey: ["ar-linhas"],
    queryFn: async () => {
      const { data } = await supabase.from("linhas").select("id, nome").order("nome");
      return data ?? [];
    },
  });

  const { data: estacoes = [] } = useQuery({
    queryKey: ["ar-estacoes"],
    queryFn: async () => {
      const { data } = await supabase.from("estacoes").select("id, nome, linha_id").order("nome");
      return data ?? [];
    },
  });

  const { data: atms = [] } = useQuery({
    queryKey: ["ar-atms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("atms")
        .select("id, id_atm, modelo, linha_id, estacao_id, capacidade_bobinas, nivel_minimo, cd_id")
        .order("id_atm");
      return (data ?? []) as AtmRow[];
    },
  });

  /** Entregas agendadas ainda não recebidas — entram no cálculo da necessidade. */
  const { data: agendamentos = [] } = useQuery({
    queryKey: ["ar-agendamentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agendamentos_entrega")
        .select("id, estacao_cd_id, status, agendamento_itens(qtd_caixas, qtd_bobina_100, qtd_bobina_50)")
        .neq("status", "Recebido");
      return data ?? [];
    },
  });

  const { porLocal } = useSaldoReal();


  const estacoesFiltradas = useMemo(
    () => (linhaId ? estacoes.filter((e: any) => e.linha_id === linhaId) : estacoes),
    [estacoes, linhaId],
  );

  const atmsFiltrados = useMemo(
    () =>
      atms.filter(
        (a) => (!linhaId || a.linha_id === linhaId) && (!estacaoId || a.estacao_id === estacaoId),
      ),
    [atms, linhaId, estacaoId],
  );

  const nomesAtm = useMemo(() => {
    const set = new Set<string>();
    atmsFiltrados.forEach((a) => a.modelo && set.add(a.modelo));
    return Array.from(set).sort();
  }, [atmsFiltrados]);

  /** Necessidade = capacidade do ATM − saldo real do ATM − bobinas já agendadas para o CD que o atende. */
  const analise = useMemo(() => {
    const atm = atms.find((a) => a.id === atmId);
    if (!atm) return null;
    const saldoAtm = porLocal("ATM", atm.id);
    const capacidade = atm.capacidade_bobinas || 0;
    const saldoCd = atm.cd_id ? porLocal("CD", atm.cd_id) : 0;
    const emTransito = (agendamentos as any[])
      .filter((ag) => !atm.cd_id || ag.estacao_cd_id === atm.cd_id)
      .reduce(
        (acc, ag) =>
          acc +
          (ag.agendamento_itens ?? []).reduce(
            (s: number, it: any) => s + (it.qtd_caixas ?? 0) * 6 + (it.qtd_bobina_100 ?? 0) + (it.qtd_bobina_50 ?? 0),
            0,
          ),
        0,
      );
    const necessidade = Math.max(0, capacidade - saldoAtm - emTransito);
    return { saldoAtm, capacidade, saldoCd, emTransito, necessidade, minimo: atm.nivel_minimo ?? 0 };
  }, [atms, atmId, agendamentos, porLocal]);



  async function registrar() {
    if (!atmId || !tipo) {
      toast.error("Selecione o ATM e o tipo de bobina");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const atm = atms.find((a) => a.id === atmId);
    const linha = linhas.find((l: any) => l.id === linhaId)?.nome;
    const estacao = estacoes.find((e: any) => e.id === estacaoId)?.nome;
    const obs = [linha && `Linha: ${linha}`, estacao && `Estação: ${estacao}`, atmNome && `ATM: ${atmNome}`]
      .filter(Boolean)
      .join(" | ");
    const { error } = await supabase.from("solicitacoes_reposicao").insert({
      atm_id: atm?.id_atm ?? atmId,
      tipo_bobina: tipo,
      observacao: obs || null,
      solicitado_por: userData.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitação registrada");
    setAtmId("");
    setAtmNome("");
    setTipo("");
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Assistente de Reposição</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Olá! Diga o identificador do ATM, qual tipo de bobina precisa. Vou registrar sua solicitação.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Linha</Label>
          <Select
            value={linhaId}
            onValueChange={(v) => {
              setLinhaId(v);
              setEstacaoId("");
              setAtmId("");
              setAtmNome("");
            }}
          >
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a linha" /></SelectTrigger>
            <SelectContent>
              {linhas.length === 0 && <SelectItem value="__none" disabled>Nenhum registro</SelectItem>}
              {linhas.map((l: any) => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Estação</Label>
          <Select
            value={estacaoId}
            onValueChange={(v) => {
              setEstacaoId(v);
              setAtmId("");
              setAtmNome("");
            }}
          >
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a estação" /></SelectTrigger>
            <SelectContent>
              {estacoesFiltradas.length === 0 && <SelectItem value="__none" disabled>Nenhum registro</SelectItem>}
              {estacoesFiltradas.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">ID_ATM</Label>
          <Select
            value={atmId}
            onValueChange={(v) => {
              setAtmId(v);
              const a = atms.find((x) => x.id === v);
              if (a?.modelo) setAtmNome(a.modelo);
            }}
          >
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o ATM" /></SelectTrigger>
            <SelectContent>
              {atmsFiltrados.length === 0 && <SelectItem value="__none" disabled>Nenhum registro</SelectItem>}
              {atmsFiltrados.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.id_atm}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">ATM_NOME</Label>
          <Select value={atmNome} onValueChange={setAtmNome}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o nome" /></SelectTrigger>
            <SelectContent>
              {nomesAtm.length === 0 && <SelectItem value="__none" disabled>Nenhum registro</SelectItem>}
              {nomesAtm.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo de bobina</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
            <SelectContent>
              {TIPOS_BOBINA.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {analise && (
        <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40">
          <p className="font-semibold">Cálculo automático (saldo real + agendamentos)</p>
          <p>Saldo real no ATM: <span className={`font-bold ${corSaldo(analise.saldoAtm)}`}>{analise.saldoAtm}</span> bobina(s)</p>
          <p>Saldo real no CD que atende: <span className={`font-bold ${corSaldo(analise.saldoCd)}`}>{analise.saldoCd}</span> bobina(s)</p>
          <p>Entregas agendadas ainda não recebidas: <span className="font-bold">{analise.emTransito}</span> bobina(s)</p>
          <p>Capacidade do ATM: <span className="font-bold">{analise.capacidade}</span> bobina(s)</p>
          <p>Necessidade de reposição: <span className="font-bold text-primary">{analise.necessidade}</span> bobina(s)</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={registrar} disabled={saving} size="sm">
          <Send className="h-4 w-4" /> Registrar Solicitação
        </Button>
      </div>
    </Card>
  );
}
