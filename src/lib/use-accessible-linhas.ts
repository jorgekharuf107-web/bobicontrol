import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";

export type LinhaLite = { id: string; nome: string; cor_hex: string | null };

/**
 * Retorna as linhas visíveis ao usuário atual.
 * Admin / Gestor / Dispatcher veem todas. Operador vê apenas as vinculadas em usuario_linhas.
 * A RLS já restringe os dados no banco; esta lista alimenta os filtros da UI.
 */
export function useAccessibleLinhas() {
  const { user, isAdmin, isGestor, loading } = useCurrentUser();
  const veTudo = isAdmin || isGestor;

  return useQuery({
    queryKey: ["accessible-linhas", user?.id, veTudo],
    enabled: !!user && !loading,
    queryFn: async (): Promise<LinhaLite[]> => {
      if (veTudo) {
        const { data } = await supabase.from("linhas").select("id, nome, cor_hex").order("nome");
        return (data ?? []) as LinhaLite[];
      }
      const { data: vinc } = await supabase
        .from("usuario_linhas").select("linha_id").eq("usuario_id", user!.id);
      const ids = (vinc ?? []).map((v: any) => v.linha_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("linhas").select("id, nome, cor_hex").in("id", ids).order("nome");
      return (data ?? []) as LinhaLite[];
    },
  });
}

export function LinhaBadge({ nome, cor }: { nome?: string | null; cor?: string | null }) {
  if (!nome) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-muted">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full border border-black/10"
        style={{ backgroundColor: cor ?? "#94a3b8" }}
      />
      {nome}
    </span>
  );
}
