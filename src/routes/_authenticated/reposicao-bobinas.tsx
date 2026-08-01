import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Send, Bot } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reposicao-bobinas")({
  head: () => ({
    meta: [
      { title: "Assistente de Reposição | Bobi Control" },
      { name: "description", content: "Assistente para solicitar reposição de bobinas em ATMs e CDs." },
      { property: "og:title", content: "Assistente de Reposição | Bobi Control" },
      { property: "og:description", content: "Assistente para solicitar reposição de bobinas em ATMs e CDs." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/reposicao-bobinas" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/reposicao-bobinas" }],
  }),
  component: Reposicao,
});

function Reposicao() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-bold">Assistente de Reposição de Bobinas</h1>
      </div>
      <AssistenteReposicao />
    </div>
  );
}
