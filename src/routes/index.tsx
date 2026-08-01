import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Boxes } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bobi Control | Gestão de Bobinas para ATMs e CDs" },
      { name: "description", content: "Tela inicial do Bobi Control: acesse o sistema de bobinas, ATMs, CDs, linhas e estações ou o inventário de equipamentos." },
      { property: "og:title", content: "Bobi Control | Gestão de Bobinas para ATMs e CDs" },
      { property: "og:description", content: "Tela inicial do Bobi Control: acesse o sistema de bobinas, ATMs, CDs, linhas e estações ou o inventário de equipamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  ssr: false,
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-primary">
      <div className="w-full max-w-3xl text-center text-primary-foreground">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary-foreground/15 flex items-center justify-center mb-6">
          <Shield className="h-8 w-8" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            to="/auth"
            search={{ destino: "dashboard" }}
            className="rounded-2xl bg-primary-foreground/10 border border-primary-foreground/30 hover:bg-primary-foreground/20 transition-colors p-8 flex flex-col items-center gap-3"
          >
            <Shield className="h-10 w-10" />
            <span className="text-2xl font-semibold">Bobi Control</span>
            <span className="text-sm opacity-90">
              Sistema interno de bobinas, ATM's, CD's, Linhas, Estações e Fornecedores.
            </span>
          </Link>
          <Link
            to="/auth"
            search={{ destino: "diversos" }}
            className="rounded-2xl bg-primary-foreground/10 border border-primary-foreground/30 hover:bg-primary-foreground/20 transition-colors p-8 flex flex-col items-center gap-3"
          >
            <Boxes className="h-10 w-10" />
            <span className="text-2xl font-semibold">Diversos</span>
            <span className="text-sm opacity-90">
              Sistema Inventário de equipamentos: POS, Validadores Online, ATM's, CD's, Linhas e Estações
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
