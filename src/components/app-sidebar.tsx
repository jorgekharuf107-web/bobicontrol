import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Users,
  Truck,
  Banknote,
  Train,
  Bell,
  ClipboardList,
  Info,
  LogOut,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";

type Item = { title: string; to: string; icon: React.ComponentType<{ className?: string }> };

const operacao: Item[] = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
  { title: "Fornecedores", to: "/fornecedores", icon: Building2 },
  { title: "ATMs", to: "/atms", icon: Banknote },
  { title: "CDs", to: "/cds", icon: Truck },
  { title: "Linhas", to: "/linhas", icon: Train },
];

const admin: Item[] = [
  { title: "Usuários", to: "/admin/usuarios", icon: Users },
  { title: "Configuração de Alertas", to: "/admin/alertas", icon: Bell },
  { title: "Auditoria", to: "/admin/auditoria", icon: ClipboardList },
  { title: "Sobre", to: "/admin/sobre", icon: Info },
];

export function AppSidebar() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, perfil, nome } = useCurrentUser();

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const NavGroup = ({ label, items }: { label: string; items: Item[] }) => (
    <div className="mb-6">
      <p className="px-3 mb-2 text-[11px] uppercase tracking-wider text-sidebar-foreground/60">
        {label}
      </p>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = path === item.to || (item.to !== "/" && path.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-sidebar-primary" />
          <div>
            <p className="font-semibold leading-tight">Gestão ATMs</p>
            <p className="text-[11px] text-sidebar-foreground/60">Sistema interno</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <NavGroup label="Operação" items={operacao} />
        {isAdmin && <NavGroup label="Administração" items={admin} />}
      </div>
      <div className="border-t border-sidebar-border p-3">
        <div className="px-2 mb-2">
          <p className="text-sm font-medium truncate">{nome ?? "Usuário"}</p>
          <p className="text-[11px] text-sidebar-foreground/60 truncate">{perfil ?? ""}</p>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  );
}
