import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "admin" | "usuario";

export interface CurrentUser {
  user: User | null;
  role: AppRole | null;
  perfil: string | null;
  nome: string | null;
  loading: boolean;
  isAdmin: boolean;
}

// Esconde "SUPER ADMIN" do usuário; apresenta como "Administrador"
function mascararPerfil(perfil: string | null): string | null {
  if (!perfil) return perfil;
  if (perfil.toUpperCase().includes("SUPER")) return "Administrador";
  return perfil;
}

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadProfile(u: User | null) {
      if (!u) { setRole(null); setPerfil(null); setNome(null); return; }
      const [{ data: ur }, { data: usr }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.id).maybeSingle(),
        supabase.from("usuarios").select("perfil, nome_completo").eq("id", u.id).maybeSingle(),
      ]);
      if (!active) return;
      setRole((ur?.role as AppRole) ?? null);
      setPerfil(mascararPerfil(usr?.perfil ?? null));
      setNome(usr?.nome_completo ?? null);
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

  return {
    user, role, perfil, nome, loading,
    isAdmin: role === "admin" || role === "super_admin",
  };
}
