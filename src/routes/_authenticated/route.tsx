import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/app-sidebar";
import { useCurrentUser } from "@/lib/use-current-user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "@/lib/use-theme";
import { APP_FOOTER } from "@/lib/app-config";
import { SidebarProvider, useSidebar } from "@/lib/use-sidebar";
import { ConnectionIndicator } from "@/components/connection-indicator";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { destino: "dashboard" } });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function papelBadge(p: string | null) {
  if (p === "Administrador") return "bg-red-100 text-red-800 border-red-200";
  if (p === "Gestor") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-green-100 text-green-800 border-green-200";
}

function TopHeader({ showMenu = true }: { showMenu?: boolean }) {
  const { nome, perfil, user } = useCurrentUser();
  const display = nome ?? user?.email ?? "Usuário";
  const initials = (display.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase();

  async function signOut() {
    try { await supabase.auth.signOut(); } catch { /* noop */ }
    try { await supabase.auth.signOut({ scope: "local" }); } catch { /* noop */ }
    window.location.replace("/");
  }

  const { theme, toggle } = useTheme();

  const { isMobile, desktopOpen, toggleDesktop, toggleMobile } = useSidebar();

  return (
    <header className="h-14 border-b bg-card flex items-center px-4 sm:px-6 gap-3">
      {showMenu && (
        <button
          type="button"
          onClick={isMobile ? toggleMobile : toggleDesktop}
          aria-label={isMobile ? "Abrir menu" : desktopOpen ? "Recolher menu" : "Expandir menu"}
          className="h-10 w-10 flex items-center justify-center rounded-md border hover:bg-accent hover:text-accent-foreground"
        >
          <Menu className="h-7 w-7 text-green-600" strokeWidth={2.75} />
        </button>
      )}
      <div className="flex-1" />
      <span className="text-sm text-muted-foreground hidden sm:inline">Olá, <span className="font-medium text-foreground">{display}</span></span>

      <ConnectionIndicator />
      {perfil && <Badge variant="outline" className={papelBadge(perfil === "SUPER_ADMIN" ? "Administrador" : perfil)}>{perfil === "SUPER_ADMIN" ? "Administrador" : perfil}</Badge>}
      <button
        type="button"
        onClick={toggle}
        aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        className="h-9 w-9 flex items-center justify-center rounded-md border hover:bg-accent hover:text-accent-foreground"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary">
            <Avatar className="h-9 w-9"><AvatarFallback>{initials || "U"}</AvatarFallback></Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut} className="text-red-600">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const emDiversos = pathname.startsWith("/diversos");
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {!emDiversos && <AppSidebar />}
        <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
          <TopHeader showMenu={!emDiversos} />
          <div className="relative max-w-7xl mx-auto p-4 pt-16 sm:p-6 sm:pt-16 w-full flex-1">
            <Outlet />
          </div>
          <footer className="border-t bg-card py-3 px-6 text-center text-xs text-muted-foreground">
            {APP_FOOTER}
          </footer>
        </main>
      </div>
    </SidebarProvider>
  );
}

