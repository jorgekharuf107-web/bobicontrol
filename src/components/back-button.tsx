import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Botão Voltar: sempre retorna à tela imediatamente anterior do histórico.
 * `to` é usado APENAS como fallback quando não existe histórico anterior.
 */
export function BackButton({ to }: { to?: string }) {
  const router = useRouter();

  function voltar() {
    const history = router.history as any;

    // 1) Histórico interno do router (funciona em qualquer profundidade)
    const canGoBack =
      typeof history?.canGoBack === "function" ? history.canGoBack() : (history?.length ?? 0) > 1;

    if (canGoBack) {
      history.back();
      return;
    }

    // 2) Histórico do navegador
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    // 3) Fallback final
    router.navigate({ to: to ?? "/dashboard" });
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={voltar}>
      <ArrowLeft className="h-4 w-4" /> Voltar
    </Button>
  );
}
