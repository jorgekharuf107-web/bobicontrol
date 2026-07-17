export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendamento_itens: {
        Row: {
          agendamento_id: string
          id: string
          quantidade: number
          tipo_bobina: string
        }
        Insert: {
          agendamento_id: string
          id?: string
          quantidade: number
          tipo_bobina: string
        }
        Update: {
          agendamento_id?: string
          id?: string
          quantidade?: number
          tipo_bobina?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_itens_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos_entrega"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos_entrega: {
        Row: {
          celular_motorista: string | null
          created_at: string
          data_hora_entrega: string
          estacao_cd_id: string
          id: string
          nome_motorista: string
          numero_nf: string | null
          observacao: string | null
          status: string
          tecnico_id: string | null
          transportadora: string | null
        }
        Insert: {
          celular_motorista?: string | null
          created_at?: string
          data_hora_entrega: string
          estacao_cd_id: string
          id?: string
          nome_motorista: string
          numero_nf?: string | null
          observacao?: string | null
          status?: string
          tecnico_id?: string | null
          transportadora?: string | null
        }
        Update: {
          celular_motorista?: string | null
          created_at?: string
          data_hora_entrega?: string
          estacao_cd_id?: string
          id?: string
          nome_motorista?: string
          numero_nf?: string | null
          observacao?: string | null
          status?: string
          tecnico_id?: string | null
          transportadora?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_entrega_estacao_cd_id_fkey"
            columns: ["estacao_cd_id"]
            isOneToOne: false
            referencedRelation: "cds"
            referencedColumns: ["id"]
          },
        ]
      }
      alerta_destinatarios: {
        Row: {
          alerta_id: string
          criado_em: string
          id: string
          usuario_id: string
        }
        Insert: {
          alerta_id: string
          criado_em?: string
          id?: string
          usuario_id: string
        }
        Update: {
          alerta_id?: string
          criado_em?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerta_destinatarios_alerta_id_fkey"
            columns: ["alerta_id"]
            isOneToOne: false
            referencedRelation: "configuracao_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerta_destinatarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      atms: {
        Row: {
          atm_ativo_sim_nao: boolean
          avulsas: number
          caixas: number
          capacidade_bobinas: number
          cd_id: string | null
          criado_em: string
          estacao: string | null
          estacao_id: string | null
          fabricante: string | null
          id: string
          id_atm: string
          linha_id: string | null
          localizacao_detalhada: string | null
          modelo: string | null
          nivel_minimo: number
          possui_cd: boolean
          status_operacional: Database["public"]["Enums"]["status_operacional"]
        }
        Insert: {
          atm_ativo_sim_nao?: boolean
          avulsas?: number
          caixas?: number
          capacidade_bobinas?: number
          cd_id?: string | null
          criado_em?: string
          estacao?: string | null
          estacao_id?: string | null
          fabricante?: string | null
          id?: string
          id_atm: string
          linha_id?: string | null
          localizacao_detalhada?: string | null
          modelo?: string | null
          nivel_minimo?: number
          possui_cd?: boolean
          status_operacional?: Database["public"]["Enums"]["status_operacional"]
        }
        Update: {
          atm_ativo_sim_nao?: boolean
          avulsas?: number
          caixas?: number
          capacidade_bobinas?: number
          cd_id?: string | null
          criado_em?: string
          estacao?: string | null
          estacao_id?: string | null
          fabricante?: string | null
          id?: string
          id_atm?: string
          linha_id?: string | null
          localizacao_detalhada?: string | null
          modelo?: string | null
          nivel_minimo?: number
          possui_cd?: boolean
          status_operacional?: Database["public"]["Enums"]["status_operacional"]
        }
        Relationships: [
          {
            foreignKeyName: "atms_cd_id_fkey"
            columns: ["cd_id"]
            isOneToOne: false
            referencedRelation: "cds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atms_estacao_id_fkey"
            columns: ["estacao_id"]
            isOneToOne: false
            referencedRelation: "estacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atms_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          acao: string
          criado_em: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          registro_id: string | null
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      cds: {
        Row: {
          capacidade: number
          criado_em: string
          estacao: string | null
          estacao_id: string | null
          estoque_minimo: number
          id: string
          linha_id: string | null
          nivel_minimo: number
          nome_cd: string
          status: Database["public"]["Enums"]["status_geral"]
        }
        Insert: {
          capacidade?: number
          criado_em?: string
          estacao?: string | null
          estacao_id?: string | null
          estoque_minimo?: number
          id?: string
          linha_id?: string | null
          nivel_minimo?: number
          nome_cd: string
          status?: Database["public"]["Enums"]["status_geral"]
        }
        Update: {
          capacidade?: number
          criado_em?: string
          estacao?: string | null
          estacao_id?: string | null
          estoque_minimo?: number
          id?: string
          linha_id?: string | null
          nivel_minimo?: number
          nome_cd?: string
          status?: Database["public"]["Enums"]["status_geral"]
        }
        Relationships: [
          {
            foreignKeyName: "cds_estacao_id_fkey"
            columns: ["estacao_id"]
            isOneToOne: false
            referencedRelation: "estacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cds_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_alertas: {
        Row: {
          configuracao_ativa: boolean
          criado_em: string
          destinatarios_email: string[]
          enviar_por_email: boolean
          frequencia_envio_horas: number
          id: string
          mensagem_personalizada: string | null
          nivel_alerta_percentual: number
          nome_configuracao: string
          tipo_alerta: string
        }
        Insert: {
          configuracao_ativa?: boolean
          criado_em?: string
          destinatarios_email?: string[]
          enviar_por_email?: boolean
          frequencia_envio_horas?: number
          id?: string
          mensagem_personalizada?: string | null
          nivel_alerta_percentual?: number
          nome_configuracao: string
          tipo_alerta: string
        }
        Update: {
          configuracao_ativa?: boolean
          criado_em?: string
          destinatarios_email?: string[]
          enviar_por_email?: boolean
          frequencia_envio_horas?: number
          id?: string
          mensagem_personalizada?: string | null
          nivel_alerta_percentual?: number
          nome_configuracao?: string
          tipo_alerta?: string
        }
        Relationships: []
      }
      convites: {
        Row: {
          convidado_por: string | null
          criado_em: string
          email_convidado: string
          expira_em: string
          id: string
          perfil_convidado: string
          status: Database["public"]["Enums"]["convite_status"]
          token: string
        }
        Insert: {
          convidado_por?: string | null
          criado_em?: string
          email_convidado: string
          expira_em?: string
          id?: string
          perfil_convidado?: string
          status?: Database["public"]["Enums"]["convite_status"]
          token?: string
        }
        Update: {
          convidado_por?: string | null
          criado_em?: string
          email_convidado?: string
          expira_em?: string
          id?: string
          perfil_convidado?: string
          status?: Database["public"]["Enums"]["convite_status"]
          token?: string
        }
        Relationships: []
      }
      estacoes: {
        Row: {
          ativa: boolean
          criado_em: string
          id: string
          linha_id: string | null
          nome: string
        }
        Insert: {
          ativa?: boolean
          criado_em?: string
          id?: string
          linha_id?: string | null
          nome: string
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          id?: string
          linha_id?: string | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "estacoes_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cidade_endereco: string | null
          cnpj: string
          contato_principal: string | null
          criado_em: string
          email: string | null
          endereco: string | null
          estado: string | null
          estado_uf: string | null
          fornecedor_ativo_sim_nao: boolean
          id: string
          motorista1: string | null
          motorista2: string | null
          razao_social: string
          status: Database["public"]["Enums"]["status_geral"]
          tecnico_responsavel_id: string | null
          telefone: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cidade_endereco?: string | null
          cnpj: string
          contato_principal?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_uf?: string | null
          fornecedor_ativo_sim_nao?: boolean
          id?: string
          motorista1?: string | null
          motorista2?: string | null
          razao_social: string
          status?: Database["public"]["Enums"]["status_geral"]
          tecnico_responsavel_id?: string | null
          telefone?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cidade_endereco?: string | null
          cnpj?: string
          contato_principal?: string | null
          criado_em?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_uf?: string | null
          fornecedor_ativo_sim_nao?: boolean
          id?: string
          motorista1?: string | null
          motorista2?: string | null
          razao_social?: string
          status?: Database["public"]["Enums"]["status_geral"]
          tecnico_responsavel_id?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_tecnico_responsavel_id_fkey"
            columns: ["tecnico_responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_saldos: {
        Row: {
          criado_em: string
          data_snapshot: string
          id: string
          id_item: string
          saldo: number
          tipo: string
        }
        Insert: {
          criado_em?: string
          data_snapshot: string
          id?: string
          id_item: string
          saldo?: number
          tipo: string
        }
        Update: {
          criado_em?: string
          data_snapshot?: string
          id?: string
          id_item?: string
          saldo?: number
          tipo?: string
        }
        Relationships: []
      }
      itens: {
        Row: {
          ativo: boolean
          cd_id: string | null
          codigo: string
          criado_em: string
          descricao: string | null
          estoque_minimo: number
          fornecedor_padrao_id: string | null
          id: string
          medida: string | null
          nome: string
          qtd_avulsas: number
          qtd_caixas: number
          qtd_por_unidade: number
          sku: string | null
          tipo_bobina: string | null
          unidade: Database["public"]["Enums"]["item_unidade"]
        }
        Insert: {
          ativo?: boolean
          cd_id?: string | null
          codigo: string
          criado_em?: string
          descricao?: string | null
          estoque_minimo?: number
          fornecedor_padrao_id?: string | null
          id?: string
          medida?: string | null
          nome: string
          qtd_avulsas?: number
          qtd_caixas?: number
          qtd_por_unidade?: number
          sku?: string | null
          tipo_bobina?: string | null
          unidade?: Database["public"]["Enums"]["item_unidade"]
        }
        Update: {
          ativo?: boolean
          cd_id?: string | null
          codigo?: string
          criado_em?: string
          descricao?: string | null
          estoque_minimo?: number
          fornecedor_padrao_id?: string | null
          id?: string
          medida?: string | null
          nome?: string
          qtd_avulsas?: number
          qtd_caixas?: number
          qtd_por_unidade?: number
          sku?: string | null
          tipo_bobina?: string | null
          unidade?: Database["public"]["Enums"]["item_unidade"]
        }
        Relationships: [
          {
            foreignKeyName: "itens_cd_id_fkey"
            columns: ["cd_id"]
            isOneToOne: false
            referencedRelation: "cds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_fornecedor_padrao_id_fkey"
            columns: ["fornecedor_padrao_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      linhas: {
        Row: {
          cor_hex: string
          criado_em: string
          id: string
          linha_ativa_sim_nao: boolean
          nome: string
        }
        Insert: {
          cor_hex?: string
          criado_em?: string
          id?: string
          linha_ativa_sim_nao?: boolean
          nome: string
        }
        Update: {
          cor_hex?: string
          criado_em?: string
          id?: string
          linha_ativa_sim_nao?: boolean
          nome?: string
        }
        Relationships: []
      }
      motoristas: {
        Row: {
          celular: string | null
          cpf: string | null
          criado_em: string
          email: string | null
          fornecedor_id: string
          id: string
          nome_completo: string
          tipo_contato: Database["public"]["Enums"]["tipo_contato_motorista"]
        }
        Insert: {
          celular?: string | null
          cpf?: string | null
          criado_em?: string
          email?: string | null
          fornecedor_id: string
          id?: string
          nome_completo: string
          tipo_contato: Database["public"]["Enums"]["tipo_contato_motorista"]
        }
        Update: {
          celular?: string | null
          cpf?: string | null
          criado_em?: string
          email?: string | null
          fornecedor_id?: string
          id?: string
          nome_completo?: string
          tipo_contato?: Database["public"]["Enums"]["tipo_contato_motorista"]
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          criado_em: string
          data: string
          destino_id: string | null
          destino_tipo: Database["public"]["Enums"]["local_tipo"] | null
          id: string
          item_id: string | null
          linha_destino_id: string | null
          linha_origem_id: string | null
          motivo_permuta: string | null
          observacao: string | null
          origem_id: string | null
          origem_tipo: Database["public"]["Enums"]["local_tipo"] | null
          qtd: number
          status_aprovacao: string
          tecnico_id: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          criado_em?: string
          data?: string
          destino_id?: string | null
          destino_tipo?: Database["public"]["Enums"]["local_tipo"] | null
          id?: string
          item_id?: string | null
          linha_destino_id?: string | null
          linha_origem_id?: string | null
          motivo_permuta?: string | null
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?: Database["public"]["Enums"]["local_tipo"] | null
          qtd: number
          status_aprovacao?: string
          tecnico_id?: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          criado_em?: string
          data?: string
          destino_id?: string | null
          destino_tipo?: Database["public"]["Enums"]["local_tipo"] | null
          id?: string
          item_id?: string | null
          linha_destino_id?: string | null
          linha_origem_id?: string | null
          motivo_permuta?: string | null
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?: Database["public"]["Enums"]["local_tipo"] | null
          qtd?: number
          status_aprovacao?: string
          tecnico_id?: string | null
          tipo?: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_reposicao: {
        Row: {
          atm_id: string
          criado_em: string
          id: string
          observacao: string | null
          solicitado_por: string | null
          status: string
          tipo_bobina: string
        }
        Insert: {
          atm_id: string
          criado_em?: string
          id?: string
          observacao?: string | null
          solicitado_por?: string | null
          status?: string
          tipo_bobina: string
        }
        Update: {
          atm_id?: string
          criado_em?: string
          id?: string
          observacao?: string | null
          solicitado_por?: string | null
          status?: string
          tipo_bobina?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          criado_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuario_linhas: {
        Row: {
          criado_em: string
          id: string
          linha_id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          linha_id: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          linha_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_linhas_linha_id_fkey"
            columns: ["linha_id"]
            isOneToOne: false
            referencedRelation: "linhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_linhas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          criado_em: string
          data_cadastro: string
          email: string
          google_id: string | null
          id: string
          microsoft_id: string | null
          nome_completo: string
          perfil: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          data_cadastro?: string
          email: string
          google_id?: string | null
          id: string
          microsoft_id?: string | null
          nome_completo: string
          perfil?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          data_cadastro?: string
          email?: string
          google_id?: string | null
          id?: string
          microsoft_id?: string | null
          nome_completo?: string
          perfil?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aprovar_movimentacao: {
        Args: { _aprovar: boolean; _id: string }
        Returns: undefined
      }
      calcular_total_bobinas: {
        Args: { _avulsas: number; _caixas: number }
        Returns: number
      }
      e_admin: { Args: { _user_id: string }; Returns: boolean }
      e_dispatcher: { Args: { _user_id: string }; Returns: boolean }
      e_gestor: { Args: { _user_id: string }; Returns: boolean }
      e_operador: { Args: { _user_id: string }; Returns: boolean }
      e_super_admin: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_super: { Args: { _user_id: string }; Returns: boolean }
      tem_funcao: {
        Args: { _funcao: string; _user_id: string }
        Returns: boolean
      }
      usuario_ve_linha: {
        Args: { _linha_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "usuario"
      convite_status: "pendente" | "aceito" | "expirado"
      item_unidade: "Unidade" | "Caixa" | "Pacote" | "Rolo"
      local_tipo: "CD" | "ATM"
      movimentacao_tipo:
        | "Entrada"
        | "Saida"
        | "Transferencia"
        | "Ajuste"
        | "Abastecimento"
        | "Permuta"
      status_geral: "ativo" | "inativo"
      status_operacional: "operacional" | "manutencao" | "desativado"
      tipo_contato_motorista: "motorista1" | "motorista2"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "usuario"],
      convite_status: ["pendente", "aceito", "expirado"],
      item_unidade: ["Unidade", "Caixa", "Pacote", "Rolo"],
      local_tipo: ["CD", "ATM"],
      movimentacao_tipo: [
        "Entrada",
        "Saida",
        "Transferencia",
        "Ajuste",
        "Abastecimento",
        "Permuta",
      ],
      status_geral: ["ativo", "inativo"],
      status_operacional: ["operacional", "manutencao", "desativado"],
      tipo_contato_motorista: ["motorista1", "motorista2"],
    },
  },
} as const
