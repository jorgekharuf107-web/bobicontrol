import { createFileRoute } from "@tanstack/react-router";
import { FornecedorForm } from "@/components/fornecedor-form";

export const Route = createFileRoute("/_authenticated/fornecedores/novo")({
  head: () => ({
    meta: [
      { title: "Novo Fornecedor | Bobi Control" },
      { name: "description", content: "Cadastre um novo fornecedor com dados da empresa e motoristas vinculados." },
      { property: "og:title", content: "Novo Fornecedor | Bobi Control" },
      { property: "og:description", content: "Cadastre um novo fornecedor com dados da empresa e motoristas vinculados." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/fornecedores/novo" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/fornecedores/novo" }],
  }),
  component: () => <FornecedorForm />,
});
