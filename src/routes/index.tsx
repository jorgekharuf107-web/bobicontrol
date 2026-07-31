import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bobi Control | Gestão de Bobinas para ATMs e CDs" },
      { name: "description", content: "Entre ou cadastre-se no Bobi Control para gerenciar estoque de bobinas, ATMs, CDs, linhas e fornecedores." },
      { property: "og:title", content: "Bobi Control | Gestão de Bobinas para ATMs e CDs" },
      { property: "og:description", content: "Entre ou cadastre-se no Bobi Control para gerenciar estoque de bobinas, ATMs, CDs, linhas e fornecedores." },
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
      <div className="w-full max-w-md text-center text-primary-foreground">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary-foreground/15 flex items-center justify-center mb-5">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-semibold">Bobi Control</h1>
        <p className="mt-2 text-sm opacity-90">
          Sistema interno de gestão de bobinas, ATMs, CDs, linhas e fornecedores.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="secondary" className="h-11 px-8">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-8 bg-transparent border-primary-foreground/60 text-primary-foreground hover:bg-primary-foreground/10">
            <Link to="/auth" search={{ modo: "cadastro" }}>Cadastrar</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
