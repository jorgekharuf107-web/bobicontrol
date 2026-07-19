import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard, FileBarChart, PackagePlus, Boxes, Layers,
  Banknote, Truck, Train, Building2, MapPin,
  Bell, ClipboardList, Users, Info, LogOut, Shield, Database, Upload, Cloud, X, CalendarClock, Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/use-sidebar";

type Item = { title: string; to: string; icon: React.ComponentType<{ className?: string }> };

const principal: Item[] = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Relatório Gerencial", to: "/relatorio-gerencial", icon: FileBarChart },
  { title: "Reposição de Bobinas", to: "/reposicao-bobinas", icon: PackagePlus },
];
const estoque: Item[] = [
  { title: "Movimentação", to: "/estoque/movimentacoes", icon: PackagePlus },
  { title: "Controle de Estoque", to: "/controle-estoque", icon: Boxes },
  { title: "Agendamentos de Entrega", to: "/agendamentos-entrega", icon: CalendarClock },
  { title: "Permutas entre Linhas", to: "/permutas", icon: PackagePlus },
  { title: "Itens de Estoque", to: "/itens-estoque", icon: Layers },
  { title: "Auditoria", to: "/auditoria", icon: ClipboardList },
];
const cadastros: Item[] = [
  { title: "Cadastro de ATM", to: "/atms", icon: Banknote },
  { title: "Centros de Distribuição", to: "/cds", icon: Truck },
  { title: "Estações", to: "/estacoes", icon: MapPin },
  { title: "Linhas", to: "/linhas", icon: Train },
  { title: "Fornecedores", to: "/fornecedores", icon: Building2 },
];
const admin: Item[] = [
  { title: "Configuração de Alertas", to: "/admin/alertas", icon: Bell },
  { title: "Auditoria", to: "/admin/auditoria", icon: ClipboardList },
  { title: "Usuários", to: "/admin/usuarios", icon: Users },
  { title: "Importar Dados", to: "/importar-dados", icon: Upload },
  { title: "Importador Corporativo", to: "/importador-corporativo", icon: Cloud },
  { title: "Sobre", to: "/admin/sobre", icon: Info },
];

const adminSuper: Item[] = [
  { title: "Backup", to: "/admin/backup", icon: Database },
];

export function AppSidebar() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, isSuperAdmin, perfil, nome } = useCurrentUser();
  const { isMobile, desktopOpen, mobileOpen, closeMobile } = useSidebar();

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const NavGroup = ({ label, items }: { label: string; items: Item[] }) => (
    <div className="mb-5">
      <p className="px-3 mb-2 text-[11px] uppercase tracking-wider font-semibold text-sidebar-foreground/60">
        {label}
      </p>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = path === item.to || (item.to !== "/" && path.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => isMobile && closeMobile()}
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

  const content = (
    <aside
      className={cn(
        "w-64 shrink-0 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col",
      )}
    >
      <div className="px-4 py-4 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-sidebar-primary-foreground" />
          <div>
            <p className="font-semibold leading-tight text-[13px]">Bobi Control</p>
            <p className="text-[11px] text-sidebar-foreground/60">Sistema Interno</p>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={closeMobile}
            aria-label="Fechar menu"
            className="p-1 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <NavGroup label="Principal" items={principal} />
        <NavGroup label="Estoque" items={estoque} />
        <NavGroup label="Cadastros" items={cadastros} />
        {isAdmin && <NavGroup label="Administração" items={isSuperAdmin ? [...admin, ...adminSuper] : admin} />}
      </div>
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <div className="px-2 mb-2">
          <p className="text-sm font-medium truncate">{nome ?? "Usuário"}</p>
          <p className="text-[11px] text-sidebar-foreground/60 truncate">{perfil === "SUPER_ADMIN" ? "Administrador" : (perfil ?? "")}</p>
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

  if (isMobile) {
    return (
      <>
        <div
          onClick={closeMobile}
          className={cn(
            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden",
            mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        />
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <div
      className={cn(
        "hidden lg:block h-screen sticky top-0 overflow-hidden transition-[width] duration-200",
        desktopOpen ? "w-64" : "w-0",
      )}
    >
      {content}
    </div>
  );
}
