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
  graphql_public: {
    Tables: {
      invoices: {
        Row: {
          billing_info: Json
          created_at: string
          id: string
          invoice_number: string
          subtotal: number
          tax_amount: number
          tenant_id: string
          total: number
          transaction_id: string | null
        }
        Insert: {
          billing_info: Json
          created_at?: string
          id?: string
          invoice_number: string
          subtotal: number
          tax_amount: number
          tenant_id: string
          total: number
          transaction_id?: string | null
        }
        Update: {
          billing_info?: Json
          created_at?: string
          id?: string
          invoice_number?: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string
          total?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          merchant_oid: string
          metadata: Json | null
          provider: string
          provider_transaction_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          merchant_oid: string
          metadata?: Json | null
          provider: string
          provider_transaction_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          merchant_oid?: string
          metadata?: Json | null
          provider?: string
          provider_transaction_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          payload: Json
          processed: boolean
          provider: string
          status: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload: Json
          processed?: boolean
          provider: string
          status?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          provider?: string
          status?: string | null
        }
        Relationships: []
      }

      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          balance: number | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_sessions: {
        Row: {
          created_at: string | null
          employee_id: string | null
          session_uid: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          session_uid: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          session_uid?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          id: string
          name: string
          password: string
          permissions: Json | null
          phone: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          password: string
          permissions?: Json | null
          phone: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          password?: string
          permissions?: Json | null
          phone?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          date: string | null
          document_id: string | null
          id: string
          product_id: string
          quantity: number
          tenant_id: string
          type: Database["public"]["Enums"]["inventory_movement_type"]
          variant_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          document_id?: string | null
          id?: string
          product_id: string
          quantity: number
          tenant_id: string
          type: Database["public"]["Enums"]["inventory_movement_type"]
          variant_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          document_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string
          type?: Database["public"]["Enums"]["inventory_movement_type"]
          variant_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          buy_price: number | null
          created_at: string | null
          id: string
          product_id: string
          sell_price: number | null
          sku: string | null
          stock_quantity: number | null
          variant_name: string
        }
        Insert: {
          barcode?: string | null
          buy_price?: number | null
          created_at?: string | null
          id?: string
          product_id: string
          sell_price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          variant_name: string
        }
        Update: {
          barcode?: string | null
          buy_price?: number | null
          created_at?: string | null
          id?: string
          product_id?: string
          sell_price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          id: string
          name: string
          price: number
          stock_quantity: number | null
          tenant_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          name: string
          price: number
          stock_quantity?: number | null
          tenant_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
          stock_quantity?: number | null
          tenant_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          customer_id: string | null
          id: string
          message_content: string
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          customer_id?: string | null
          id?: string
          message_content: string
          sent_at?: string | null
          status: string
          tenant_id: string
        }
        Update: {
          customer_id?: string | null
          id?: string
          message_content?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          message_template: string
          tenant_id: string
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template: string
          tenant_id: string
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          tenant_id?: string
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          email: string
          id: string
          name: string | null
        }
        Insert: {
          email: string
          id: string
          name?: string | null
        }
        Update: {
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          auto_sms_enabled: boolean | null
          created_at: string | null
          created_by_admin_id: string | null
          custom_domain: string | null
          id: string
          name: string
          owner_id: string | null
          phone: string | null
          category: string | null
          sms_credits: number | null
          status: string | null
          subdomain: string
          updated_at: string | null
        }
        Insert: {
          auto_sms_enabled?: boolean | null
          created_at?: string | null
          created_by_admin_id?: string | null
          custom_domain?: string | null
          id?: string
          name: string
          owner_id?: string | null
          phone?: string | null
          category?: string | null
          sms_credits?: number | null
          status?: string | null
          subdomain: string
          updated_at?: string | null
        }
        Update: {
          auto_sms_enabled?: boolean | null
          created_at?: string | null
          created_by_admin_id?: string | null
          custom_domain?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
          category?: string | null
          sms_credits?: number | null
          status?: string | null
          subdomain?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          id: string
          product_id: string | null
          quantity: number
          tenant_id: string
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          product_id?: string | null
          quantity: number
          tenant_id: string
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          id?: string
          product_id?: string | null
          quantity?: number
          tenant_id?: string
          total_price?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          cashier_name: string | null
          category_id: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          payment_method: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          cashier_name?: string | null
          category_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          payment_method?: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          cashier_name?: string | null
          category_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          payment_method?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plan_type: string
          status: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plan_type?: string
          status?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          plan_type?: string
          status?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_ids: { Args: never; Returns: string[] }
      get_user_tenant_role: {
        Args: { check_tenant_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      login_employee_session: {
        Args: { p_password: string; p_phone: string }
        Returns: Json
      }
      process_pos_sale: {
        Args: {
          p_cashier_name?: string
          p_customer_id?: string
          p_grand_total?: number
          p_lines?: Json
          p_payment_method?: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_type: "cash" | "bank_account" | "credit_card" | "pos_device"
      app_role: "admin" | "veresiye_yetkilisi" | "kasiyer"
      check_note_direction: "received" | "issued"
      check_note_status: "portfolio" | "collected" | "endorsed" | "bounced"
      check_note_type: "check" | "promissory_note"
      company_type: "individual" | "corporate"
      document_status: "draft" | "pending" | "approved" | "paid" | "cancelled"
      document_type:
        | "sales_invoice"
        | "purchase_invoice"
        | "offer"
        | "proforma"
        | "sales_order"
        | "purchase_order"
        | "return_invoice"
      entity_type: "customer" | "supplier" | "both"
      inventory_movement_type: "in" | "out" | "transfer" | "adjustment"
      transaction_type:
        | "sale"
        | "debt_addition"
        | "payment"
        | "income"
        | "expense"
      transaction_type_new:
        | "income"
        | "expense"
        | "transfer_in"
        | "transfer_out"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: ["cash", "bank_account", "credit_card", "pos_device"],
      app_role: ["admin", "veresiye_yetkilisi", "kasiyer"],
      check_note_direction: ["received", "issued"],
      check_note_status: ["portfolio", "collected", "endorsed", "bounced"],
      check_note_type: ["check", "promissory_note"],
      company_type: ["individual", "corporate"],
      document_status: ["draft", "pending", "approved", "paid", "cancelled"],
      document_type: [
        "sales_invoice",
        "purchase_invoice",
        "offer",
        "proforma",
        "sales_order",
        "purchase_order",
        "return_invoice",
      ],
      entity_type: ["customer", "supplier", "both"],
      inventory_movement_type: ["in", "out", "transfer", "adjustment"],
      transaction_type: [
        "sale",
        "debt_addition",
        "payment",
        "income",
        "expense",
      ],
      transaction_type_new: [
        "income",
        "expense",
        "transfer_in",
        "transfer_out",
      ],
    },
  },
} as const
