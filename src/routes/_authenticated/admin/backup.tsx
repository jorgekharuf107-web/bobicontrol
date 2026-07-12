import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BackButton } from "@/components/back-button";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: isSuper } = await supabase.rpc("e_super_admin" as any, { _user_id: data.user.id });
    if (!isSuper) throw redirect({ to: "/dashboard" });
  },
  component: BackupPage,
});

const TABELAS = ["atms", "cds", "movimentacoes", "usuarios"] as const;

function BackupPage() {
  const anoCorrente = new Date().getFullYear();
  const [ano, setAno] = useState(anoCorrente - 1);
  const [exportando, setExportando] = useState(false);
  const [zerando, setZerando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      const inicio = `${ano}-01-01`;
      const fim = `${ano + 1}-01-01`;
      const bundle: Record<string, unknown> = {
        gerado_em: new Date().toISOString(),
        ano_referencia: ano,
        periodo: { inicio, fim },
      };

      for (const t of TABELAS) {
        let q = supabase.from(t as any).select("*");
        if (t === "movimentacoes") {
          q = q.gte("data", inicio).lt("data", fim);
        } else {
          q = q.gte("criado_em", inicio).lt("criado_em", fim);
        }
        const { data, error } = await q;
        if (error) throw error;
        bundle[t] = data ?? [];
      }

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-bobicontrol-${ano}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Backup de ${ano} gerado`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao exportar");
    } finally {
      setExportando(false);
    }
  }

  async function zerar() {
    setZerando(true);
    try {
      const anoAnterior = anoCorrente - 1;
      const anoCorte = anoAnterior - 1;
      const dataCorte = `${anoCorte + 1}-01-01`;
      const snapshotData = `${anoCorte}-12-31`;


      const [{ data: atms, error: eA }, { data: cdsList, error: eC }] = await Promise.all([
        supabase.from("atms").select("id"),
        supabase.from("cds").select("id"),
      ]);
      if (eA) throw eA;
      if (eC) throw eC;

      const { data: movs, error: eM } = await supabase
        .from("movimentacoes")
        .select("qtd, origem_tipo, origem_id, destino_tipo, destino_id, data")
        .lt("data", dataCorte);
      if (eM) throw eM;

      const saldos = new Map<string, number>();
      const key = (tipo: string, id: string) => `${tipo}:${id}`;
      for (const a of atms ?? []) saldos.set(key("atm", a.id), 0);
      for (const c of cdsList ?? []) saldos.set(key("cd", c.id), 0);

      for (const m of (movs ?? []) as any[]) {
        if (m.destino_tipo && m.destino_id) {
          const k = key(m.destino_tipo, m.destino_id);
          if (saldos.has(k)) saldos.set(k, (saldos.get(k) ?? 0) + (m.qtd ?? 0));
        }
        if (m.origem_tipo && m.origem_id) {
          const k = key(m.origem_tipo, m.origem_id);
          if (saldos.has(k)) saldos.set(k, (saldos.get(k) ?? 0) - (m.qtd ?? 0));
        }
      }

      const snapshot = Array.from(saldos.entries()).map(([k, saldo]) => {
        const [tipo, id_item] = k.split(":");
        return { tipo, id_item, saldo, data_snapshot: snapshotData };
      });

      if (snapshot.length > 0) {
        await supabase.from("historico_saldos" as any).delete().eq("data_snapshot", snapshotData);
        const { error: eIns } = await supabase.from("historico_saldos" as any).insert(snapshot);
        if (eIns) throw eIns;
      }

      const { error: eDel, count } = await supabase
        .from("movimentacoes")
        .delete({ count: "exact" })
        .lt("data", dataCorte);
      if (eDel) throw eDel;

      toast.success(`Fechamento ${anoCorte}: ${snapshot.length} saldos salvos, ${count ?? 0} movimentações removidas`);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao zerar");
    } finally {
      setZerando(false);
      setConfirmar(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <BackButton to="/dashboard" />
        <h1 className="text-2xl font-semibold">Backup</h1>
      </div>

      <div
        className="flex items-start gap-3 rounded-md border p-4"
        style={{ background: "#fef3c7", borderColor: "#f59e0b", color: "#78350f" }}
      >
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold">Esta ação não pode ser desfeita. Faça o backup primeiro.</p>
          <p className="mt-1">Mantém o BobControl apenas com dados do ano corrente para não estourar o limite de Armazenamento.</p>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Exportar Ano Anterior</h2>
          <p className="text-sm text-muted-foreground">
            Gera um arquivo <code>.json</code> com registros do ano selecionado das tabelas: {TABELAS.join(", ")}.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Ano</Label>
            <Input
              type="number"
              value={ano}
              min={2000}
              max={anoCorrente - 1}
              onChange={(e) => setAno(Math.min(anoCorrente - 1, Math.max(2000, +e.target.value || anoCorrente - 1)))}
              className="w-32"
            />
          </div>
          <Button onClick={exportar} disabled={exportando}>
            <Download className="h-4 w-4" /> {exportando ? "Exportando..." : "Exportar Ano Anterior"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Fechamento do Ano {anoCorrente - 2}</h2>
          <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
            <li>Salva o saldo de fechamento de 31/12/{anoCorrente - 2}</li>
            <li>Apaga todas as movimentações até {anoCorrente - 2}</li>
            <li>Mantém os anos {anoCorrente - 1} e {anoCorrente} ativos</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-2">
            Importante: BobControl trabalha com bobinas. O saldo é de estoque de papel.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setConfirmar(true)} disabled={zerando}>
          <Trash2 className="h-4 w-4" /> Fechar e Zerar até {anoCorrente - 2}
        </Button>
      </Card>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar fechamento até {anoCorrente - 2}</AlertDialogTitle>
            <AlertDialogDescription>
              O saldo de 31/12/{anoCorrente - 2} será salvo no histórico e todas as movimentações
              até {anoCorrente - 2} serão removidas permanentemente. Os anos {anoCorrente - 1} e {anoCorrente} permanecem ativos.
              Esta ação não pode ser desfeita. Faça o backup primeiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={zerar} disabled={zerando}>
              {zerando ? "Zerando..." : "Confirmar exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
