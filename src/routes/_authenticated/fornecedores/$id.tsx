import { createFileRoute } from "@tanstack/react-router";
import { FornecedorForm } from "@/components/fornecedor-form";

export const Route = createFileRoute("/_authenticated/fornecedores/$id")({
  component: EditFornecedor,
});

function EditFornecedor() {
  const { id } = Route.useParams();
  return <FornecedorForm fornecedorId={id} />;
}
