import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/diversos")({
  head: () => ({
    meta: [
      { title: "Diversos | Bobi Control" },
      { name: "description", content: "Módulo Diversos: inventário de equipamentos POS, validadores online, ATMs, CDs, linhas e estações." },
      { property: "og:title", content: "Diversos | Bobi Control" },
      { property: "og:description", content: "Módulo Diversos: inventário de equipamentos POS, validadores online, ATMs, CDs, linhas e estações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DiversosPage,
});

function DiversosPage() {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl bg-[#fde8e8] border border-[#f5c2c2] p-8 text-center">
        <p className="bg-white px-4 py-3 rounded-md uppercase font-semibold text-[#7f1d1d] tracking-wide">
          EM DESENVOLVIMENTO. POR FAVOR, AGUARDE!
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 bg-white"
          onClick={() => router.navigate({ to: "/" })}
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}
