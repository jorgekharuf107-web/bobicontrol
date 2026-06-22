
-- Enums
CREATE TYPE public.item_unidade AS ENUM ('Unidade','Caixa','Pacote','Rolo');
CREATE TYPE public.movimentacao_tipo AS ENUM ('Entrada','Saida','Transferencia','Ajuste','Abastecimento');
CREATE TYPE public.local_tipo AS ENUM ('CD','ATM');

-- Estações
CREATE TABLE public.estacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  linha_id uuid REFERENCES public.linhas(id) ON DELETE SET NULL,
  ativa boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estacoes TO authenticated;
GRANT ALL ON public.estacoes TO service_role;
ALTER TABLE public.estacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estacoes select" ON public.estacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "estacoes mod admin" ON public.estacoes FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Itens
CREATE TABLE public.itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo text NOT NULL UNIQUE,
  unidade public.item_unidade NOT NULL DEFAULT 'Unidade',
  qtd_por_unidade integer NOT NULL DEFAULT 1 CHECK (qtd_por_unidade >= 1),
  medida text,
  estoque_minimo integer NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  descricao text,
  fornecedor_padrao_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens TO authenticated;
GRANT ALL ON public.itens TO service_role;
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens select" ON public.itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "itens mod admin" ON public.itens FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Movimentações
CREATE TABLE public.movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.movimentacao_tipo NOT NULL,
  item_id uuid REFERENCES public.itens(id) ON DELETE SET NULL,
  qtd integer NOT NULL,
  origem_tipo public.local_tipo,
  origem_id uuid,
  destino_tipo public.local_tipo,
  destino_id uuid,
  tecnico_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  observacao text,
  data timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mov select" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "mov insert" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "mov mod admin" ON public.movimentacoes FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid())) WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "mov del admin" ON public.movimentacoes FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Add estacao_id to atms and cds (keep legacy 'estacao' text for now)
ALTER TABLE public.atms ADD COLUMN estacao_id uuid REFERENCES public.estacoes(id) ON DELETE SET NULL;
ALTER TABLE public.cds ADD COLUMN estacao_id uuid REFERENCES public.estacoes(id) ON DELETE SET NULL;
