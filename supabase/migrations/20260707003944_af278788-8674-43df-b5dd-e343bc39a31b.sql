
-- Adicionar coluna linha_id em atms
ALTER TABLE public.atms ADD COLUMN IF NOT EXISTS linha_id uuid REFERENCES public.linhas(id) ON DELETE SET NULL;

-- Reativar administrador (bug: ativo=false bloqueava e_admin)
UPDATE public.usuarios SET ativo = true WHERE perfil = 'Administrador';
