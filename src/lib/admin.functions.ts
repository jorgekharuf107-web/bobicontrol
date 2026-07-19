import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CreateUserInput = {
  nome: string;
  email: string;
  senha: string;
  perfil: "admin_geral" | "supervisor_linha" | "dispatcher" | "tecnico_estacao";
  ativo: boolean;
};

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateUserInput) => {
    if (!data?.email || !data?.senha || !data?.nome || !data?.perfil) {
      throw new Error("Nome, email, senha e perfil são obrigatórios");
    }
    if (data.senha.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres");
    return data;
  })
  .handler(async ({ data, context }) => {
    // Verificar se caller é admin ou super_admin
    const { data: isAdmin } = await context.supabase.rpc("e_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Somente administradores podem criar usuários");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.senha,
      email_confirm: true,
      user_metadata: { full_name: data.nome },
    });
    if (error) throw new Error(error.message);
    const uid = created.user?.id;
    if (!uid) throw new Error("Falha ao criar usuário");

    // Sobrescrever perfil / ativo (trigger handle_new_user cria como tecnico_estacao por padrão)
    await supabaseAdmin.from("usuarios").upsert({
      id: uid,
      nome_completo: data.nome,
      email: data.email.trim().toLowerCase(),
      perfil: data.perfil,
      ativo: data.ativo,
    });

    return { ok: true as const, id: uid };
  });

type ResetPasswordInput = { user_id: string; nova_senha: string };

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ResetPasswordInput) => {
    if (!data?.user_id || !data?.nova_senha) throw new Error("Dados inválidos");
    if (data.nova_senha.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres");
    return data;
  })
  .handler(async ({ data, context }) => {
    // Somente SUPER_ADMIN pode resetar senhas diretamente
    const { data: isSuper } = await context.supabase.rpc("e_super_admin", { _user_id: context.userId });
    if (!isSuper) throw new Error("Apenas SUPER_ADMIN pode redefinir senhas");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.nova_senha,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
