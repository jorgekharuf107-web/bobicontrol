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
      const corte = `${anoCorrente}-01-01`;
      const { error, count } = await supabase
        .from("movimentacoes")
        .delete({ count: "exact" })
        .lt("data", corte);
      if (error) throw error;
      toast.success(`${count ?? 0} movimentações anteriores a ${corte} removidas`);
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
          <p className="mt-1">Mantenha o Supabase apenas com dados do ano corrente para não estourar o limite do plano gratuito.</p>
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
              max={anoCorrente}
              onChange={(e) => setAno(Math.min(anoCorrente, Math.max(2000, +e.target.value || anoCorrente - 1)))}
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
          <h2 className="text-lg font-semibold">Zerar Ano Anterior</h2>
          <p className="text-sm text-muted-foreground">
            Remove todas as movimentações com data anterior a <b>01/01/{anoCorrente}</b>.
            Cadastros de ATM, CD e Usuário são mantidos.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setConfirmar(true)} disabled={zerando}>
          <Trash2 className="h-4 w-4" /> Zerar Ano Anterior
        </Button>
      </Card>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as movimentações anteriores a 01/01/{anoCorrente} serão removidas permanentemente.
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
