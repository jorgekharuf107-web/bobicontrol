import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";

/**
 * Botão Fechar (X): fecha o módulo atual e volta para a tela anterior do histórico.
 * `to` é usado APENAS como fallback quando não existe histórico anterior.
 * Renderizado no canto superior direito da área de conteúdo.
 */
export function BackButton({ to }: { to?: string }) {
  const router = useRouter();

  function fechar() {
    const history = router.history as any;

    const canGoBack =
      typeof history?.canGoBack === "function" ? history.canGoBack() : (history?.length ?? 0) > 1;

    if (canGoBack) {
      history.back();
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    router.navigate({ to: to ?? "/dashboard" });
  }

  return (
    <button
      type="button"
      onClick={fechar}
      aria-label="Fechar módulo"
      title="Fechar"
      className="absolute right-4 top-4 sm:right-6 sm:top-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-md border bg-card text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <X className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
}
