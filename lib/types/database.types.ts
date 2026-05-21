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
      action_log: {
        Row: {
          action_type: string
          created_at: string
          event_id: string
          id: string
          payload: Json
          reverted_at: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          event_id: string
          id?: string
          payload: Json
          reverted_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json
          reverted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      blind_levels: {
        Row: {
          ante: number
          big_blind: number
          created_at: string
          duration_minutes: number
          event_id: string
          id: string
          is_final_table: boolean
          level_number: number
          small_blind: number
        }
        Insert: {
          ante?: number
          big_blind: number
          created_at?: string
          duration_minutes: number
          event_id: string
          id?: string
          is_final_table?: boolean
          level_number: number
          small_blind: number
        }
        Update: {
          ante?: number
          big_blind?: number
          created_at?: string
          duration_minutes?: number
          event_id?: string
          id?: string
          is_final_table?: boolean
          level_number?: number
          small_blind?: number
        }
        Relationships: [
          {
            foreignKeyName: "blind_levels_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          admin_user_id: string
          buy_in_cents: number
          created_at: string
          event_date: string
          id: string
          name: string
          number_of_physical_tables: number
          rebuy_cents: number | null
          rebuy_limit_per_player: number
          rebuy_until_level: number
          state: string
          table_size: number
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          buy_in_cents: number
          created_at?: string
          event_date: string
          id?: string
          name: string
          number_of_physical_tables?: number
          rebuy_cents?: number | null
          rebuy_limit_per_player?: number
          rebuy_until_level?: number
          state?: string
          table_size?: number
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          buy_in_cents?: number
          created_at?: string
          event_date?: string
          id?: string
          name?: string
          number_of_physical_tables?: number
          rebuy_cents?: number | null
          rebuy_limit_per_player?: number
          rebuy_until_level?: number
          state?: string
          table_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          current_level_id: string | null
          event_id: string
          finished_at: string | null
          id: string
          is_final_table: boolean
          level_started_at: string | null
          match_number: number
          paused_at: string | null
          physical_table_id: string
          started_at: string | null
          state: string
          total_paused_ms: number
          updated_at: string
          winner_player_id: string | null
        }
        Insert: {
          created_at?: string
          current_level_id?: string | null
          event_id: string
          finished_at?: string | null
          id?: string
          is_final_table?: boolean
          level_started_at?: string | null
          match_number: number
          paused_at?: string | null
          physical_table_id: string
          started_at?: string | null
          state?: string
          total_paused_ms?: number
          updated_at?: string
          winner_player_id?: string | null
        }
        Update: {
          created_at?: string
          current_level_id?: string | null
          event_id?: string
          finished_at?: string | null
          id?: string
          is_final_table?: boolean
          level_started_at?: string | null
          match_number?: number
          paused_at?: string | null
          physical_table_id?: string
          started_at?: string | null
          state?: string
          total_paused_ms?: number
          updated_at?: string
          winner_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_current_level_id_fkey"
            columns: ["current_level_id"]
            isOneToOne: false
            referencedRelation: "blind_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_physical_table_id_fkey"
            columns: ["physical_table_id"]
            isOneToOne: false
            referencedRelation: "physical_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_player_id_fkey"
            columns: ["winner_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      participations: {
        Row: {
          created_at: string
          eliminated_at: string | null
          final_position: number | null
          id: string
          match_id: string
          player_id: string
          rebought: boolean
          seat_number: number | null
        }
        Insert: {
          created_at?: string
          eliminated_at?: string | null
          final_position?: number | null
          id?: string
          match_id: string
          player_id: string
          rebought?: boolean
          seat_number?: number | null
        }
        Update: {
          created_at?: string
          eliminated_at?: string | null
          final_position?: number | null
          id?: string
          match_id?: string
          player_id?: string
          rebought?: boolean
          seat_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "participations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_tables: {
        Row: {
          created_at: string
          event_id: string
          id: string
          state: string
          table_number: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          state?: string
          table_number: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          state?: string
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "physical_tables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          event_id: string
          final_position: number | null
          has_paid_buyin: boolean
          id: string
          name: string
          nickname: string | null
          phone: string | null
          player_token: string
          rebuys_used: number
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          final_position?: number | null
          has_paid_buyin?: boolean
          id?: string
          name: string
          nickname?: string | null
          phone?: string | null
          player_token: string
          rebuys_used?: number
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          final_position?: number | null
          has_paid_buyin?: boolean
          id?: string
          name?: string
          nickname?: string | null
          phone?: string | null
          player_token?: string
          rebuys_used?: number
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
