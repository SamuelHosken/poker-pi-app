/**
 * Tipos do schema Supabase.
 *
 * ⚠️ ARQUIVO TEMPORARIAMENTE ESCRITO À MÃO.
 *
 * Quando o projeto Supabase estiver linkado, regenere com:
 *   supabase gen types typescript --linked > lib/types/database.types.ts
 *
 * O conteúdo gerado pode diferir em detalhes (formatação, ordering, Relationships
 * preenchidas) mas a forma das tabelas/colunas deve bater com a migration
 * 0001_initial_schema.sql.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          name: string;
          event_date: string;
          buy_in_cents: number;
          rebuy_cents: number | null;
          rebuy_limit_per_player: number;
          rebuy_until_level: number;
          table_size: number;
          number_of_physical_tables: number;
          state: string;
          admin_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          event_date: string;
          buy_in_cents: number;
          rebuy_cents?: number | null;
          rebuy_limit_per_player?: number;
          rebuy_until_level?: number;
          table_size?: number;
          number_of_physical_tables?: number;
          state?: string;
          admin_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          event_date?: string;
          buy_in_cents?: number;
          rebuy_cents?: number | null;
          rebuy_limit_per_player?: number;
          rebuy_until_level?: number;
          table_size?: number;
          number_of_physical_tables?: number;
          state?: string;
          admin_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      blind_levels: {
        Row: {
          id: string;
          event_id: string;
          level_number: number;
          small_blind: number;
          big_blind: number;
          ante: number;
          duration_minutes: number;
          is_final_table: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          level_number: number;
          small_blind: number;
          big_blind: number;
          ante?: number;
          duration_minutes: number;
          is_final_table?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          level_number?: number;
          small_blind?: number;
          big_blind?: number;
          ante?: number;
          duration_minutes?: number;
          is_final_table?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      physical_tables: {
        Row: {
          id: string;
          event_id: string;
          table_number: number;
          state: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          table_number: number;
          state?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          table_number?: number;
          state?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          nickname: string | null;
          phone: string | null;
          player_token: string;
          state: string;
          has_paid_buyin: boolean;
          rebuys_used: number;
          final_position: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          nickname?: string | null;
          phone?: string | null;
          player_token: string;
          state?: string;
          has_paid_buyin?: boolean;
          rebuys_used?: number;
          final_position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          nickname?: string | null;
          phone?: string | null;
          player_token?: string;
          state?: string;
          has_paid_buyin?: boolean;
          rebuys_used?: number;
          final_position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          event_id: string;
          physical_table_id: string;
          match_number: number;
          is_final_table: boolean;
          state: string;
          current_level_id: string | null;
          level_started_at: string | null;
          paused_at: string | null;
          total_paused_ms: number;
          winner_player_id: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          physical_table_id: string;
          match_number: number;
          is_final_table?: boolean;
          state?: string;
          current_level_id?: string | null;
          level_started_at?: string | null;
          paused_at?: string | null;
          total_paused_ms?: number;
          winner_player_id?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          physical_table_id?: string;
          match_number?: number;
          is_final_table?: boolean;
          state?: string;
          current_level_id?: string | null;
          level_started_at?: string | null;
          paused_at?: string | null;
          total_paused_ms?: number;
          winner_player_id?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      participations: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          seat_number: number | null;
          final_position: number | null;
          eliminated_at: string | null;
          rebought: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          seat_number?: number | null;
          final_position?: number | null;
          eliminated_at?: string | null;
          rebought?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_id?: string;
          seat_number?: number | null;
          final_position?: number | null;
          eliminated_at?: string | null;
          rebought?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      action_log: {
        Row: {
          id: string;
          event_id: string;
          action_type: string;
          payload: Json;
          created_at: string;
          reverted_at: string | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          action_type: string;
          payload: Json;
          created_at?: string;
          reverted_at?: string | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          action_type?: string;
          payload?: Json;
          created_at?: string;
          reverted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
