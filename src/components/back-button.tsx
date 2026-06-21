import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ to }: { to?: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => (to ? router.navigate({ to }) : router.history.back())}
    >
      <ArrowLeft className="h-4 w-4" /> Voltar
    </Button>
  );
}
