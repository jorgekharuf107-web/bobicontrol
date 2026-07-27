import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Retorna se o usuário autenticado é SUPER_ADMIN (verificado no servidor). */
export const souSuperAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("usuarios")
      .select("perfil, ativo")
      .eq("id", context.userId)
      .maybeSingle();
    return { superAdmin: data?.perfil === "SUPER_ADMIN" && data?.ativo === true };
  });

type AprovarInput = { id: string; aprovar: boolean };

/** Aprova ou rejeita uma permuta. Somente admin ou dispatcher. */
export const aprovarPermuta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AprovarInput) => {
    if (!data?.id || typeof data.aprovar !== "boolean") throw new Error("Dados inválidos");
    return data;
  })
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isDispatcher }] = await Promise.all([
      context.supabase.rpc("e_admin", { _user_id: context.userId }),
      context.supabase.rpc("e_dispatcher", { _user_id: context.userId }),
    ]);
    if (!isAdmin && !isDispatcher) throw new Error("Sem permissão para aprovar permutas");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("movimentacoes")
      .update({
        status_aprovacao: data.aprovar ? "aprovado" : "rejeitado",
        aprovado_por: context.userId,
        aprovado_em: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
