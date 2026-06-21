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
      atms: {
        Row: {
          atm_ativo_sim_nao: boolean
          capacidade_bobinas: number
          cd_id: string | null
          criado_em: string
          estacao: string | null
          id: string
          id_atm: string
          localizacao_detalhada: string | null
          modelo: string | null
          nivel_minimo: number
          status_operacional: Database["public"]["Enums"]["status_operacional"]
        }
        Insert: {
          atm_ativo_sim_nao?: boolean
          capacidade_bobinas?: number
          cd_id?: string | null
          criado_em?: string
          estacao?: string | null
          id?: string
          id_atm: string
          localizacao_detalhada?: string | null
          modelo?: string | null
          nivel_minimo?: number
          status_operacional?: Database["public"]["Enums"]["status_operacional"]
        }
        Update: {
          atm_ativo_sim_nao?: boolean
          capacidade_bobinas?: number
          cd_id?: string | null
          criado_em?: string
          estacao?: string | null
          id?: string
          id_atm?: string
          localizacao_detalhada?: string | null
          modelo?: string | null
          nivel_minimo?: number
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
          id?: string
          linha_id?: string | null
          nivel_minimo?: number
          nome_cd?: string
          status?: Database["public"]["Enums"]["status_geral"]
        }
        Relationships: [
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
          perfil_convidado: Database["public"]["Enums"]["user_perfil"]
          status: Database["public"]["Enums"]["convite_status"]
          token: string
        }
        Insert: {
          convidado_por?: string | null
          criado_em?: string
          email_convidado: string
          expira_em?: string
          id?: string
          perfil_convidado?: Database["public"]["Enums"]["user_perfil"]
          status?: Database["public"]["Enums"]["convite_status"]
          token?: string
        }
        Update: {
          convidado_por?: string | null
          criado_em?: string
          email_convidado?: string
          expira_em?: string
          id?: string
          perfil_convidado?: Database["public"]["Enums"]["user_perfil"]
          status?: Database["public"]["Enums"]["convite_status"]
          token?: string
        }
        Relationships: []
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
          razao_social: string
          status: Database["public"]["Enums"]["status_geral"]
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
          razao_social: string
          status?: Database["public"]["Enums"]["status_geral"]
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
          razao_social?: string
          status?: Database["public"]["Enums"]["status_geral"]
          telefone?: string | null
        }
        Relationships: []
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
      usuarios: {
        Row: {
          criado_em: string
          data_cadastro: string
          email: string
          google_id: string | null
          id: string
          microsoft_id: string | null
          nome_completo: string
          perfil: Database["public"]["Enums"]["user_perfil"]
        }
        Insert: {
          criado_em?: string
          data_cadastro?: string
          email: string
          google_id?: string | null
          id: string
          microsoft_id?: string | null
          nome_completo: string
          perfil?: Database["public"]["Enums"]["user_perfil"]
        }
        Update: {
          criado_em?: string
          data_cadastro?: string
          email?: string
          google_id?: string | null
          id?: string
          microsoft_id?: string | null
          nome_completo?: string
          perfil?: Database["public"]["Enums"]["user_perfil"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_super: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "usuario"
      convite_status: "pendente" | "aceito" | "expirado"
      status_geral: "ativo" | "inativo"
      status_operacional: "operacional" | "manutencao" | "desativado"
      tipo_contato_motorista: "motorista1" | "motorista2"
      user_perfil: "Usuário" | "Administrador" | "SUPER ADMIN"
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
      status_geral: ["ativo", "inativo"],
      status_operacional: ["operacional", "manutencao", "desativado"],
      tipo_contato_motorista: ["motorista1", "motorista2"],
      user_perfil: ["Usuário", "Administrador", "SUPER ADMIN"],
    },
  },
} as const
