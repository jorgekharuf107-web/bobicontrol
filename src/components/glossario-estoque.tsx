import { Card } from "@/components/ui/card";

/** Regras oficiais de movimentação do estoque — tabela fixa, exibida em todos os módulos de Estoque. */
export const GLOSSARIO_ESTOQUE = [
  { tipo: "Recebimento", de: "Fornecedor", para: "CD", exemplo: "Chegou 100 bobinas da fábrica no CD da Lapa" },
  { tipo: "Abastecimento", de: "CD", para: "ATM", exemplo: "Peguei 5 bobinas no CD e abasteci a ATM da Sé" },
  { tipo: "Retirada", de: "CD", para: "Lixo", exemplo: "Bobina veio com defeito de Fábrica. Tirei do CD e descartei" },
  { tipo: "Baixa", de: "ATM", para: "Consumo", exemplo: "A ATM da Paulista usou a última bobina" },
  { tipo: "Permuta", de: "CD/ATM", para: "CD/ATM", exemplo: "Passei 3 bobinas da ATM da Sé para a ATM da Paulista" },
  { tipo: "Permuta entre Linhas", de: "CD/Linha", para: "CD/Linha", exemplo: "Transferi 20 bobinas do CD da Linha 1 para o CD da Linha 2" },
  { tipo: "Permuta entre ATM", de: "ATM", para: "ATM", exemplo: "Troca direta de bobinas entre 2 ATMs" },
] as const;

export function GlossarioEstoque() {
  return (
    <Card className="p-0 overflow-hidden">
      <table className="excel-table text-[13px]">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>De onde sai</th>
            <th>Pra onde vai</th>
            <th>Exemplo</th>
          </tr>
        </thead>
        <tbody>
          {GLOSSARIO_ESTOQUE.map((g) => (
            <tr key={g.tipo}>
              <td className="font-semibold whitespace-normal break-words">{g.tipo}</td>
              <td className="whitespace-normal break-words">{g.de}</td>
              <td className="whitespace-normal break-words">{g.para}</td>
              <td className="whitespace-normal break-words">{g.exemplo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
