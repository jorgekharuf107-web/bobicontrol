import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

import { ConfirmDialogHost } from "@/components/confirm-dialog";
import { initOfflineSync } from "@/lib/offline-queue";
import { registerServiceWorker } from "@/lib/register-sw";
import { InstallPwaBanner } from "@/components/install-pwa-banner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Página não encontrada.</p>
        <a href="/" className="mt-6 inline-block underline">Voltar ao início</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >Tentar novamente</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#16a34a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Bobi Control" },
      { title: "Bobi Control" },
      { name: "description", content: "Bobi Control - Sistema Interno de gestão de ATMs, CDs, linhas e fornecedores." },
      { property: "og:site_name", content: "Bobi Control" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Bobi Control" },
      { property: "og:description", content: "Bobi Control - Sistema Interno de gestão de ATMs, CDs, linhas e fornecedores." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Bobi Control" },
      { name: "twitter:description", content: "Bobi Control - Sistema Interno de gestão de ATMs, CDs, linhas e fornecedores." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a84c9044-99c1-4894-8e1c-bb5f6c5bef9e/id-preview-06269c04--4e9970f5-60d3-4795-b7ec-e49ec67fe120.lovable.app-1785111643659.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a84c9044-99c1-4894-8e1c-bb5f6c5bef9e/id-preview-06269c04--4e9970f5-60d3-4795-b7ec-e49ec67fe120.lovable.app-1785111643659.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    initOfflineSync();
    registerServiceWorker();
    // Ao sincronizar a fila offline (ou voltar a internet), recarrega saldos/dashboard
    const onQueue = () => queryClient.invalidateQueries();
    window.addEventListener("bobi:queue-change", onQueue);
    window.addEventListener("online", onQueue);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => {
      window.removeEventListener("bobi:queue-change", onQueue);
      window.removeEventListener("online", onQueue);
      sub.subscription.unsubscribe();
    };
  }, [queryClient, router]);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <ConfirmDialogHost />
      <InstallPwaBanner />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
