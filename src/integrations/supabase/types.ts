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
      application_events: {
        Row: {
          application_id: string
          created_at: string
          done: boolean
          event_date: string
          event_type: string
          id: string
          notes: string | null
          title: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          done?: boolean
          event_date: string
          event_type?: string
          id?: string
          notes?: string | null
          title: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          done?: boolean
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string | null
          company: string | null
          created_at: string
          id: string
          job_id: string | null
          match_id: string | null
          next_event_at: string | null
          next_event_type: string | null
          notes: string | null
          position: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          company?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          match_id?: string | null
          next_event_at?: string | null
          next_event_type?: string | null
          notes?: string | null
          position?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          company?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          match_id?: string | null
          next_event_at?: string | null
          next_event_type?: string | null
          notes?: string | null
          position?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_results"
            referencedColumns: ["id"]
          },
        ]
      }
      career_recommendations: {
        Row: {
          category: string
          created_at: string
          description: string | null
          done: boolean
          id: string
          job_id: string | null
          priority: string
          resource_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          done?: boolean
          id?: string
          job_id?: string | null
          priority?: string
          resource_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          done?: boolean
          id?: string
          job_id?: string | null
          priority?: string
          resource_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_recommendations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letters: {
        Row: {
          content: string
          created_at: string
          id: string
          job_id: string | null
          resume_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          job_id?: string | null
          resume_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          job_id?: string | null
          resume_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letters_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string | null
          created_at: string
          desired_skills: string[]
          id: string
          keywords: string[]
          location: string | null
          parsed: Json | null
          raw_text: string
          required_skills: string[]
          responsibilities: string[]
          salary: string | null
          seniority: string | null
          source_url: string | null
          status: string
          title: string | null
          tools: string[]
          updated_at: string
          user_id: string
          work_mode: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          desired_skills?: string[]
          id?: string
          keywords?: string[]
          location?: string | null
          parsed?: Json | null
          raw_text: string
          required_skills?: string[]
          responsibilities?: string[]
          salary?: string | null
          seniority?: string | null
          source_url?: string | null
          status?: string
          title?: string | null
          tools?: string[]
          updated_at?: string
          user_id: string
          work_mode?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          desired_skills?: string[]
          id?: string
          keywords?: string[]
          location?: string | null
          parsed?: Json | null
          raw_text?: string
          required_skills?: string[]
          responsibilities?: string[]
          salary?: string | null
          seniority?: string | null
          source_url?: string | null
          status?: string
          title?: string | null
          tools?: string[]
          updated_at?: string
          user_id?: string
          work_mode?: string | null
        }
        Relationships: []
      }
      match_results: {
        Row: {
          ats_score: number
          created_at: string
          education_score: number
          experience_score: number
          gaps: Json
          id: string
          job_id: string
          keywords_score: number
          match_score: number
          recommendations: Json
          resume_id: string | null
          seniority_score: number
          skills_score: number
          strengths: Json
          summary: string | null
          user_id: string
        }
        Insert: {
          ats_score?: number
          created_at?: string
          education_score?: number
          experience_score?: number
          gaps?: Json
          id?: string
          job_id: string
          keywords_score?: number
          match_score?: number
          recommendations?: Json
          resume_id?: string | null
          seniority_score?: number
          skills_score?: number
          strengths?: Json
          summary?: string | null
          user_id: string
        }
        Update: {
          ats_score?: number
          created_at?: string
          education_score?: number
          experience_score?: number
          gaps?: Json
          id?: string
          job_id?: string
          keywords_score?: number
          match_score?: number
          recommendations?: Json
          resume_id?: string | null
          seniority_score?: number
          skills_score?: number
          strengths?: Json
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_results_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      optimized_resumes: {
        Row: {
          ats_score: number | null
          content: Json
          created_at: string
          id: string
          job_id: string | null
          match_id: string | null
          plain_text: string | null
          resume_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          content?: Json
          created_at?: string
          id?: string
          job_id?: string | null
          match_id?: string | null
          plain_text?: string | null
          resume_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ats_score?: number | null
          content?: Json
          created_at?: string
          id?: string
          job_id?: string | null
          match_id?: string | null
          plain_text?: string | null
          resume_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimized_resumes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimized_resumes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "match_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimized_resumes_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          desired_role: string | null
          email: string | null
          full_name: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          onboarding_completed: boolean
          plan: string
          portfolio_url: string | null
          professional_area: string | null
          salary_expectation: string | null
          seniority: string | null
          skills: string[]
          updated_at: string
          work_mode: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          desired_role?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id: string
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean
          plan?: string
          portfolio_url?: string | null
          professional_area?: string | null
          salary_expectation?: string | null
          seniority?: string | null
          skills?: string[]
          updated_at?: string
          work_mode?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          desired_role?: string | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean
          plan?: string
          portfolio_url?: string | null
          professional_area?: string | null
          salary_expectation?: string | null
          seniority?: string | null
          skills?: string[]
          updated_at?: string
          work_mode?: string | null
        }
        Relationships: []
      }
      resumes: {
        Row: {
          ats_analysis: Json | null
          ats_score: number | null
          created_at: string
          error_message: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_primary: boolean
          parsed: Json | null
          raw_text: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ats_analysis?: Json | null
          ats_score?: number | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_primary?: boolean
          parsed?: Json | null
          raw_text?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ats_analysis?: Json | null
          ats_score?: number | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_primary?: boolean
          parsed?: Json | null
          raw_text?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_tone: string
          created_at: string
          email_notifications: boolean
          interview_reminders: boolean
          language: string
          match_alerts: boolean
          product_updates: boolean
          profile_public: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_tone?: string
          created_at?: string
          email_notifications?: boolean
          interview_reminders?: boolean
          language?: string
          match_alerts?: boolean
          product_updates?: boolean
          profile_public?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_tone?: string
          created_at?: string
          email_notifications?: boolean
          interview_reminders?: boolean
          language?: string
          match_alerts?: boolean
          product_updates?: boolean
          profile_public?: boolean
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
    Enums: {},
  },
} as const
