import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ to }: { to?: string }) {
  const router = useRouter();

  function voltar() {
    if (to) {
      router.navigate({ to });
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    router.navigate({ to: "/dashboard" });
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={voltar}>
      <ArrowLeft className="h-4 w-4" /> Voltar
    </Button>
  );
}
