// Mapeamento único de perfis do banco para os papéis de acesso do sistema.
// Não altera dados: apenas traduz o campo `usuarios.perfil` já existente.

export type Papel = "admin" | "responsavel" | "tecnico";

const ADMIN = ["SUPER_ADMIN", "ADMIN_GERAL", "ADMIN", "ADMINISTRADOR"];
const RESPONSAVEL = ["SUPERVISOR_LINHA", "DISPATCHER", "GESTOR", "RESPONSAVEL"];

export function papelDoPerfil(perfil: string | null | undefined): Papel {
  const p = (perfil ?? "").toUpperCase();
  if (ADMIN.includes(p)) return "admin";
  if (RESPONSAVEL.includes(p)) return "responsavel";
  return "tecnico";
}

export function podeGerenciarUsuarios(perfil: string | null | undefined) {
  return papelDoPerfil(perfil) === "admin";
}

export function podeGerenciarCadastros(perfil: string | null | undefined) {
  return papelDoPerfil(perfil) !== "tecnico";
}
