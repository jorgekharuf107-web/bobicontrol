import { createFileRoute } from "@tanstack/react-router";
import { FornecedorForm } from "@/components/fornecedor-form";

export const Route = createFileRoute("/_authenticated/fornecedores/$id")({
  head: () => ({
    meta: [
      { title: "Editar Fornecedor | Bobi Control" },
      { name: "description", content: "Edite dados cadastrais, contatos e motoristas do fornecedor selecionado." },
      { property: "og:title", content: "Editar Fornecedor | Bobi Control" },
      { property: "og:description", content: "Edite dados cadastrais, contatos e motoristas do fornecedor selecionado." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/fornecedores/detalhe" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "/fornecedores/detalhe" }],
  }),
  component: EditFornecedor,
});

function EditFornecedor() {
  const { id } = Route.useParams();
  return <FornecedorForm fornecedorId={id} />;
}
