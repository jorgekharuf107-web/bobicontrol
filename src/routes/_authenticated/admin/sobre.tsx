import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/sobre")({
  component: SobrePage,
});

function SobrePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3"><BackButton to="/dashboard" /><h1 className="text-2xl font-semibold">Sobre</h1></div>
      <Card className="p-8">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Sistema de Gestão de ATMs</h2>
            <p className="text-sm text-muted-foreground">Versão 1.0.0</p>
            <p className="text-sm">
              Plataforma interna para controle de ATMs, Centros de Distribuição, Linhas de operação,
              Fornecedores e Motoristas. Inclui gestão de usuários por convite, configuração de alertas
              e auditoria de ações.
            </p>
            <ul className="text-sm space-y-1 mt-4">
              <li><span className="text-muted-foreground">Stack:</span> TanStack Start · React 19 · TypeScript · Tailwind v4</li>
              <li><span className="text-muted-foreground">Backend:</span> Lovable Cloud (PostgreSQL + RLS)</li>
              <li><span className="text-muted-foreground">Autenticação:</span> Google OAuth (Microsoft em breve)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
