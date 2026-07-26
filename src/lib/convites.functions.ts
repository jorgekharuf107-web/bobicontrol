import { createServerFn } from "@tanstack/react-start";

type TokenInput = { token: string };

/**
 * Consulta pública de convite por token.
 * O token funciona como segredo: só retorna o convite correspondente
 * e apenas os campos estritamente necessários para a tela de aceite.
 */
export const buscarConvitePorToken = createServerFn({ method: "POST" })
  .inputValidator((data: TokenInput) => {
    const token = typeof data?.token === "string" ? data.token.trim() : "";
    if (!token || token.length < 8 || token.length > 256) {
      throw new Error("Token inválido");
    }
    return { token };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: convite } = await supabaseAdmin
      .from("convites")
      .select("email_convidado, perfil_convidado, status, expira_em")
      .eq("token", data.token)
      .maybeSingle();

    if (!convite) return { status: "invalid" as const, convite: null };
    if (convite.status !== "pendente") return { status: "invalid" as const, convite: null };
    if (new Date(convite.expira_em) < new Date()) return { status: "expired" as const, convite: null };

    return {
      status: "valid" as const,
      convite: {
        email_convidado: convite.email_convidado,
        perfil_convidado: convite.perfil_convidado,
      },
    };
  });
