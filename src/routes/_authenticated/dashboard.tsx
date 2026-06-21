import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Banknote, Truck, Train, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/lib/use-current-user";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function StatCard({ to, label, value, icon: Icon }: {
  to: string; label: string; value: number | string; icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link to={to}>
      <Card className="p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold mt-1">{value}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Dashboard() {
  const { nome, perfil, isAdmin } = useCurrentUser();
  const { data } = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [forn, atm, cd, linha, usr] = await Promise.all([
        supabase.from("fornecedores").select("id", { count: "exact", head: true }),
        supabase.from("atms").select("id", { count: "exact", head: true }),
        supabase.from("cds").select("id", { count: "exact", head: true }),
        supabase.from("linhas").select("id", { count: "exact", head: true }),
        supabase.from("usuarios").select("id", { count: "exact", head: true }),
      ]);
      return {
        fornecedores: forn.count ?? 0,
        atms: atm.count ?? 0,
        cds: cd.count ?? 0,
        linhas: linha.count ?? 0,
        usuarios: usr.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {nome ?? "—"}</h1>
        <p className="text-sm text-muted-foreground">Perfil: {perfil ?? "—"}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard to="/fornecedores" label="Fornecedores" value={data?.fornecedores ?? "—"} icon={Building2} />
        <StatCard to="/atms" label="ATMs" value={data?.atms ?? "—"} icon={Banknote} />
        <StatCard to="/cds" label="CDs" value={data?.cds ?? "—"} icon={Truck} />
        <StatCard to="/linhas" label="Linhas" value={data?.linhas ?? "—"} icon={Train} />
        {isAdmin && <StatCard to="/admin/usuarios" label="Usuários" value={data?.usuarios ?? "—"} icon={Users} />}
      </div>
    </div>
  );
}
