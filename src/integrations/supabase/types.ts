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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          client_id: string | null
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
          visible_to_roles: Database["public"]["Enums"]["app_role"][]
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
          visible_to_roles?: Database["public"]["Enums"]["app_role"][]
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
          visible_to_roles?: Database["public"]["Enums"]["app_role"][]
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          application_number: string | null
          application_type: Database["public"]["Enums"]["application_type"]
          assigned_employee_id: string | null
          assigned_payer_id: string | null
          assigned_to_employee_at: string | null
          birth_certificate_url: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string
          email: string | null
          employee_screenshot_url: string | null
          ep_number: string | null
          full_name: string
          gov_id_url: string | null
          ics_payment_confirmed_at: string | null
          ics_payment_pending_at: string | null
          ics_payment_receipt_url: string | null
          id: string
          initial_payment_confirmed_at: string | null
          initial_payment_receipt_url: string | null
          pdf_downloaded_at: string | null
          pdf_printed_at: string | null
          phone: string
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          application_number?: string | null
          application_type?: Database["public"]["Enums"]["application_type"]
          assigned_employee_id?: string | null
          assigned_payer_id?: string | null
          assigned_to_employee_at?: string | null
          birth_certificate_url?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth: string
          email?: string | null
          employee_screenshot_url?: string | null
          ep_number?: string | null
          full_name: string
          gov_id_url?: string | null
          ics_payment_confirmed_at?: string | null
          ics_payment_pending_at?: string | null
          ics_payment_receipt_url?: string | null
          id?: string
          initial_payment_confirmed_at?: string | null
          initial_payment_receipt_url?: string | null
          pdf_downloaded_at?: string | null
          pdf_printed_at?: string | null
          phone: string
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          application_number?: string | null
          application_type?: Database["public"]["Enums"]["application_type"]
          assigned_employee_id?: string | null
          assigned_payer_id?: string | null
          assigned_to_employee_at?: string | null
          birth_certificate_url?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string
          email?: string | null
          employee_screenshot_url?: string | null
          ep_number?: string | null
          full_name?: string
          gov_id_url?: string | null
          ics_payment_confirmed_at?: string | null
          ics_payment_pending_at?: string | null
          ics_payment_receipt_url?: string | null
          id?: string
          initial_payment_confirmed_at?: string | null
          initial_payment_receipt_url?: string | null
          pdf_downloaded_at?: string | null
          pdf_printed_at?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: []
      }
      employee_clients: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          client_id: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id?: string | null
          id?: number
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id?: string | null
          id?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          name: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id: string
          name: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "payer"
      application_type: "new_passport" | "renewal" | "replacement" | "other"
      client_status:
        | "initial_payment_pending"
        | "initial_payment_confirmed"
        | "in_progress"
        | "ics_payment_pending"
        | "ics_payment_confirmed"
        | "pdf_downloaded"
        | "pdf_printed"
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
      app_role: ["admin", "employee", "payer"],
      application_type: ["new_passport", "renewal", "replacement", "other"],
      client_status: [
        "initial_payment_pending",
        "initial_payment_confirmed",
        "in_progress",
        "ics_payment_pending",
        "ics_payment_confirmed",
        "pdf_downloaded",
        "pdf_printed",
      ],
    },
  },
} as const
