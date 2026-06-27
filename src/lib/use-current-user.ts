import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Papel = "Administrador" | "Gestor" | "Operador";

export interface CurrentUser {
  user: User | null;
  perfil: Papel | null;
  nome: string | null;
  ativo: boolean;
  loading: boolean;
  isAdmin: boolean;
  isGestor: boolean;
  isOperador: boolean;
  canManageCadastros: boolean; // Admin ou Gestor
  canManageEstoque: boolean;   // Admin, Gestor ou Operador
}

function normalizar(p: string | null): Papel | null {
  if (!p) return null;
  const up = p.toUpperCase();
  if (up.includes("SUPER") || up === "ADMINISTRADOR" || up === "ADMIN") return "Administrador";
  if (up === "GESTOR") return "Gestor";
  return "Operador";
}

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Papel | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadProfile(u: User | null) {
      if (!u) { setPerfil(null); setNome(null); setAtivo(true); return; }
      const { data: usr } = await supabase
        .from("usuarios").select("perfil, nome_completo, ativo")
        .eq("id", u.id).maybeSingle();
      if (!active) return;
      setPerfil(normalizar((usr as any)?.perfil ?? null));
      setNome((usr as any)?.nome_completo ?? null);
      setAtivo((usr as any)?.ativo ?? true);
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      loadProfile(data.user).finally(() => active && setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const isAdmin = perfil === "Administrador";
  const isGestor = perfil === "Gestor";
  const isOperador = perfil === "Operador";

  return {
    user, perfil, nome, ativo, loading,
    isAdmin, isGestor, isOperador,
    canManageCadastros: isAdmin || isGestor,
    canManageEstoque: isAdmin || isGestor || isOperador,
  };
}
