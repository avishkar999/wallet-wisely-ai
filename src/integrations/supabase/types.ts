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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      budget_alert_settings: {
        Row: {
          alert_email: string | null
          alert_threshold: number | null
          created_at: string
          email_alerts_enabled: boolean | null
          id: string
          last_alert_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_email?: string | null
          alert_threshold?: number | null
          created_at?: string
          email_alerts_enabled?: boolean | null
          id?: string
          last_alert_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_email?: string | null
          alert_threshold?: number | null
          created_at?: string
          email_alerts_enabled?: boolean | null
          id?: string
          last_alert_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          budgeted_amount: number
          category: string
          created_at: string
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budgeted_amount?: number
          category: string
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budgeted_amount?: number
          category?: string
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          amount: number | null
          created_at: string
          event_date: string
          event_type: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          related_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          related_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          related_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          created_at: string
          due_date: number | null
          end_date: string | null
          id: string
          interest_rate: number
          minimum_payment: number
          name: string
          notes: string | null
          outstanding_amount: number
          principal_amount: number
          start_date: string | null
          type: Database["public"]["Enums"]["debt_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: number | null
          end_date?: string | null
          id?: string
          interest_rate?: number
          minimum_payment?: number
          name: string
          notes?: string | null
          outstanding_amount?: number
          principal_amount?: number
          start_date?: string | null
          type: Database["public"]["Enums"]["debt_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: number | null
          end_date?: string | null
          id?: string
          interest_rate?: number
          minimum_payment?: number
          name?: string
          notes?: string | null
          outstanding_amount?: number
          principal_amount?: number
          start_date?: string | null
          type?: Database["public"]["Enums"]["debt_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_fund: {
        Row: {
          created_at: string
          current_amount: number
          goal_amount: number
          id: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          goal_amount?: number
          id?: string
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          goal_amount?: number
          id?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          created_at: string
          current_value: number
          id: string
          invested_amount: number
          name: string
          nav: number | null
          notes: string | null
          purchase_date: string | null
          type: Database["public"]["Enums"]["investment_type"]
          units: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          id?: string
          invested_amount?: number
          name: string
          nav?: number | null
          notes?: string | null
          purchase_date?: string | null
          type: Database["public"]["Enums"]["investment_type"]
          units?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          id?: string
          invested_amount?: number
          name?: string
          nav?: number | null
          notes?: string | null
          purchase_date?: string | null
          type?: Database["public"]["Enums"]["investment_type"]
          units?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          reminder_email: string | null
          subscription_reminders_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_email?: string | null
          subscription_reminders_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_email?: string | null
          subscription_reminders_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_active: boolean | null
          next_due_date: string
          notes: string | null
          reminder_days_before: number | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          next_due_date: string
          notes?: string | null
          reminder_days_before?: number | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          next_due_date?: string
          notes?: string | null
          reminder_days_before?: number | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          category: string | null
          created_at: string
          current_amount: number
          id: string
          is_completed: boolean | null
          name: string
          notes: string | null
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          is_completed?: boolean | null
          name: string
          notes?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          is_completed?: boolean | null
          name?: string
          notes?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_decisions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          id: string
          marked_for_review_at: string | null
          monthly_amount: number
          notes: string | null
          reminder_days: number | null
          reminder_sent_at: string | null
          status: string
          subscription_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          id?: string
          marked_for_review_at?: string | null
          monthly_amount?: number
          notes?: string | null
          reminder_days?: number | null
          reminder_sent_at?: string | null
          status?: string
          subscription_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          id?: string
          marked_for_review_at?: string | null
          monthly_amount?: number
          notes?: string | null
          reminder_days?: number | null
          reminder_sent_at?: string | null
          status?: string
          subscription_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["transaction_category"]
          created_at: string
          description: string | null
          id: string
          name: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          description?: string | null
          id?: string
          name: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      debt_type:
        | "credit_card"
        | "personal_loan"
        | "home_loan"
        | "car_loan"
        | "education_loan"
        | "emi"
        | "other"
      investment_type:
        | "mutual_fund"
        | "stock"
        | "fixed_deposit"
        | "recurring_deposit"
        | "crypto"
        | "gold"
        | "bonds"
        | "other"
      payment_method:
        | "upi"
        | "debit_card"
        | "credit_card"
        | "cash"
        | "neft"
        | "auto_pay"
        | "other"
      transaction_category:
        | "food"
        | "shopping"
        | "transport"
        | "entertainment"
        | "bills"
        | "health"
        | "recharges"
        | "education"
        | "travel"
        | "income"
        | "other"
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
      debt_type: [
        "credit_card",
        "personal_loan",
        "home_loan",
        "car_loan",
        "education_loan",
        "emi",
        "other",
      ],
      investment_type: [
        "mutual_fund",
        "stock",
        "fixed_deposit",
        "recurring_deposit",
        "crypto",
        "gold",
        "bonds",
        "other",
      ],
      payment_method: [
        "upi",
        "debit_card",
        "credit_card",
        "cash",
        "neft",
        "auto_pay",
        "other",
      ],
      transaction_category: [
        "food",
        "shopping",
        "transport",
        "entertainment",
        "bills",
        "health",
        "recharges",
        "education",
        "travel",
        "income",
        "other",
      ],
    },
  },
} as const
