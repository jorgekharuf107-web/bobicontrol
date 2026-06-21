import { createFileRoute } from "@tanstack/react-router";
import { FornecedorForm } from "@/components/fornecedor-form";

export const Route = createFileRoute("/_authenticated/fornecedores/novo")({
  component: () => <FornecedorForm />,
});
