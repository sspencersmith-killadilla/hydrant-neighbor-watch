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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          demo_mode: boolean
          id: number
        }
        Insert: {
          demo_mode?: boolean
          id?: number
        }
        Update: {
          demo_mode?: boolean
          id?: number
        }
        Relationships: []
      }
      assets: {
        Row: {
          address_label: string
          adopted_by: string | null
          asset_code: string
          asset_type: Database["public"]["Enums"]["asset_type"]
          city_id: string
          district_id: string | null
          id: string
          last_updated_at: string
          lat: number
          lng: number
          nickname: string | null
          status: Database["public"]["Enums"]["asset_status"]
        }
        Insert: {
          address_label: string
          adopted_by?: string | null
          asset_code: string
          asset_type: Database["public"]["Enums"]["asset_type"]
          city_id: string
          district_id?: string | null
          id?: string
          last_updated_at?: string
          lat: number
          lng: number
          nickname?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
        }
        Update: {
          address_label?: string
          adopted_by?: string | null
          asset_code?: string
          asset_type?: Database["public"]["Enums"]["asset_type"]
          city_id?: string
          district_id?: string | null
          id?: string
          last_updated_at?: string
          lat?: number
          lng?: number
          nickname?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
        }
        Relationships: [
          {
            foreignKeyName: "assets_adopted_by_fkey"
            columns: ["adopted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          center_lat: number
          center_lng: number
          created_at: string
          created_by: string | null
          district_mode: string
          id: string
          is_demo: boolean
          name: string
          region: string | null
          slug: string
          spotlight_body: string | null
          spotlight_title: string | null
        }
        Insert: {
          center_lat: number
          center_lng: number
          created_at?: string
          created_by?: string | null
          district_mode?: string
          id?: string
          is_demo?: boolean
          name: string
          region?: string | null
          slug: string
          spotlight_body?: string | null
          spotlight_title?: string | null
        }
        Update: {
          center_lat?: number
          center_lng?: number
          created_at?: string
          created_by?: string | null
          district_mode?: string
          id?: string
          is_demo?: boolean
          name?: string
          region?: string | null
          slug?: string
          spotlight_body?: string | null
          spotlight_title?: string | null
        }
        Relationships: []
      }
      city_members: {
        Row: {
          city_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_members_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          boundary: Json | null
          center_lat: number | null
          center_lng: number | null
          city_id: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          boundary?: Json | null
          center_lat?: number | null
          center_lng?: number | null
          city_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          boundary?: Json | null
          center_lat?: number | null
          center_lng?: number | null
          city_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          safety_waiver_accepted: boolean
          waiver_accepted_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          safety_waiver_accepted?: boolean
          waiver_accepted_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          safety_waiver_accepted?: boolean
          waiver_accepted_at?: string | null
        }
        Relationships: []
      }
      status_reports: {
        Row: {
          asset_id: string
          created_at: string
          debris_type: Database["public"]["Enums"]["debris_type"] | null
          id: string
          notes: string | null
          photo_url: string | null
          reporter_id: string | null
          resolved_by_city: boolean
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          asset_id: string
          created_at?: string
          debris_type?: Database["public"]["Enums"]["debris_type"] | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          reporter_id?: string | null
          resolved_by_city?: boolean
          status: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          asset_id?: string
          created_at?: string
          debris_type?: Database["public"]["Enums"]["debris_type"] | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          reporter_id?: string | null
          resolved_by_city?: boolean
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "status_reports_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storm_events: {
        Row: {
          city_id: string
          created_at: string
          id: string
          instructions: string | null
          is_active: boolean
          severity: Database["public"]["Enums"]["storm_severity"]
          title: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          severity?: Database["public"]["Enums"]["storm_severity"]
          title: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          severity?: Database["public"]["Enums"]["storm_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "storm_events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          city_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          name: string
        }
        Insert: {
          city_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          name: string
        }
        Update: {
          city_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "resident" | "city_admin"
      asset_status: "unassigned" | "needs_check" | "cleared" | "needs_city_crew"
      asset_type: "storm_drain" | "fire_hydrant" | "priority_sidewalk"
      debris_type: "leaves" | "trash" | "ice_snow" | "structural_damage"
      report_status: "cleared" | "needs_city_crew"
      storm_severity: "advisory" | "watch" | "warning"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["resident", "city_admin"],
      asset_status: ["unassigned", "needs_check", "cleared", "needs_city_crew"],
      asset_type: ["storm_drain", "fire_hydrant", "priority_sidewalk"],
      debris_type: ["leaves", "trash", "ice_snow", "structural_damage"],
      report_status: ["cleared", "needs_city_crew"],
      storm_severity: ["advisory", "watch", "warning"],
    },
  },
} as const
