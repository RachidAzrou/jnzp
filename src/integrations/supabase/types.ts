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
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_role: string | null
          created_at: string
          description: string | null
          dossier_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
          payload_diff: Json | null
          reason: string | null
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          actor_role?: string | null
          created_at?: string
          description?: string | null
          dossier_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payload_diff?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          actor_role?: string | null
          created_at?: string
          description?: string | null
          dossier_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payload_diff?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      captcha_verifications: {
        Row: {
          endpoint: string
          expires_at: string
          id: string
          identifier: string
          token: string
          used: boolean
          verified_at: string
        }
        Insert: {
          endpoint: string
          expires_at?: string
          id?: string
          identifier: string
          token: string
          used?: boolean
          verified_at?: string
        }
        Update: {
          endpoint?: string
          expires_at?: string
          id?: string
          identifier?: string
          token?: string
          used?: boolean
          verified_at?: string
        }
        Relationships: []
      }
      case_events: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          dossier_id: string
          event_type: string
          id: string
          location: string | null
          location_text: string | null
          metadata: Json | null
          notes: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dossier_id: string
          event_type: string
          id?: string
          location?: string | null
          location_text?: string | null
          metadata?: Json | null
          notes?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          dossier_id?: string
          event_type?: string
          id?: string
          location?: string | null
          location_text?: string | null
          metadata?: Json | null
          notes?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "case_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          code: string
          created_at: string
          default_price: number
          default_vat_rate: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          type: string
          unit: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_price: number
          default_vat_rate?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          type: string
          unit?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_price?: number
          default_vat_rate?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          type?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          dossier_id: string
          id: string
          message: string
          sender_role: Database["public"]["Enums"]["app_role"]
          sender_user_id: string
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          dossier_id: string
          id?: string
          message: string
          sender_role: Database["public"]["Enums"]["app_role"]
          sender_user_id: string
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          dossier_id?: string
          id?: string
          message?: string
          sender_role?: Database["public"]["Enums"]["app_role"]
          sender_user_id?: string
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "chat_messages_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_policies: {
        Row: {
          cross_org_dm_enabled: boolean | null
          id: string
          triad_chat_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          cross_org_dm_enabled?: boolean | null
          id?: string
          triad_chat_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          cross_org_dm_enabled?: boolean | null
          id?: string
          triad_chat_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      claim_actions: {
        Row: {
          action: string
          claim_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["claim_status"] | null
          id: string
          metadata: Json | null
          reason: string | null
          to_status: Database["public"]["Enums"]["claim_status"] | null
          user_id: string
        }
        Insert: {
          action: string
          claim_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["claim_status"] | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          to_status?: Database["public"]["Enums"]["claim_status"] | null
          user_id: string
        }
        Update: {
          action?: string
          claim_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["claim_status"] | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          to_status?: Database["public"]["Enums"]["claim_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_actions_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          api_response: Json | null
          blocked_reason: string | null
          created_at: string
          dossier_id: string
          id: string
          insurer_org_id: string
          override_reason: string | null
          policy_number: string
          source: Database["public"]["Enums"]["claim_source"]
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
        }
        Insert: {
          api_response?: Json | null
          blocked_reason?: string | null
          created_at?: string
          dossier_id: string
          id?: string
          insurer_org_id: string
          override_reason?: string | null
          policy_number: string
          source?: Database["public"]["Enums"]["claim_source"]
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Update: {
          api_response?: Json | null
          blocked_reason?: string | null
          created_at?: string
          dossier_id?: string
          id?: string
          insurer_org_id?: string
          override_reason?: string | null
          policy_number?: string
          source?: Database["public"]["Enums"]["claim_source"]
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "claims_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_insurer_org_id_fkey"
            columns: ["insurer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cool_cell_reservations: {
        Row: {
          cool_cell_id: string | null
          created_at: string
          created_by_user_id: string
          dossier_id: string
          end_at: string
          facility_org_id: string
          id: string
          note: string | null
          start_at: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
        }
        Insert: {
          cool_cell_id?: string | null
          created_at?: string
          created_by_user_id: string
          dossier_id: string
          end_at: string
          facility_org_id: string
          id?: string
          note?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Update: {
          cool_cell_id?: string | null
          created_at?: string
          created_by_user_id?: string
          dossier_id?: string
          end_at?: string
          facility_org_id?: string
          id?: string
          note?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cool_cell_reservations_cool_cell_id_fkey"
            columns: ["cool_cell_id"]
            isOneToOne: false
            referencedRelation: "cool_cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cool_cell_reservations_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cool_cell_reservations_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "cool_cell_reservations_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cool_cell_reservations_facility_org_id_fkey"
            columns: ["facility_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cool_cells: {
        Row: {
          created_at: string
          facility_org_id: string
          id: string
          label: string
          out_of_service_note: string | null
          status: Database["public"]["Enums"]["cool_cell_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_org_id: string
          id?: string
          label: string
          out_of_service_note?: string | null
          status?: Database["public"]["Enums"]["cool_cell_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_org_id?: string
          id?: string
          label?: string
          out_of_service_note?: string | null
          status?: Database["public"]["Enums"]["cool_cell_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cool_cells_facility_org_id_fkey"
            columns: ["facility_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          created_at: string
          data_type: string
          description: string | null
          id: string
          is_active: boolean
          retention_period_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_type: string
          description?: string | null
          id?: string
          is_active?: boolean
          retention_period_days: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          retention_period_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      document_comments: {
        Row: {
          comment: string
          created_at: string
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          dossier_id: string
          file_name: string
          file_url: string
          id: string
          language: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["doc_status"]
          uploaded_at: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          dossier_id: string
          file_name: string
          file_url: string
          id?: string
          language?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["doc_type"]
          dossier_id?: string
          file_name?: string
          file_url?: string
          id?: string
          language?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "documents_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_claims: {
        Row: {
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          dossier_id: string
          expire_at: string | null
          id: string
          reason: string | null
          requested_by: string
          requesting_org_id: string
          status: string
          token: string | null
        }
        Insert: {
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          dossier_id: string
          expire_at?: string | null
          id?: string
          reason?: string | null
          requested_by: string
          requesting_org_id: string
          status?: string
          token?: string | null
        }
        Update: {
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          dossier_id?: string
          expire_at?: string | null
          id?: string
          reason?: string | null
          requested_by?: string
          requesting_org_id?: string
          status?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_claims_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_claims_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "dossier_claims_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_claims_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_claims_requesting_org_id_fkey"
            columns: ["requesting_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_communication_preferences: {
        Row: {
          dossier_id: string
          id: string
          last_channel_used: Database["public"]["Enums"]["communication_channel"]
          updated_at: string
        }
        Insert: {
          dossier_id: string
          id?: string
          last_channel_used: Database["public"]["Enums"]["communication_channel"]
          updated_at?: string
        }
        Update: {
          dossier_id?: string
          id?: string
          last_channel_used?: Database["public"]["Enums"]["communication_channel"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_communication_preferences_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_communication_preferences_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "dossier_communication_preferences_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_events: {
        Row: {
          created_at: string
          created_by: string | null
          dossier_id: string
          event_description: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dossier_id: string
          event_description: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dossier_id?: string
          event_description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "dossier_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_release_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string | null
          dossier_id: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string | null
          dossier_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string | null
          dossier_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_release_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_release_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "dossier_release_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          adhoc_fd_org_id: string | null
          adhoc_limited_access: boolean | null
          advisory_checks: Json | null
          assigned_fd_org_id: string | null
          assignment_status: string
          created_at: string
          date_of_death: string | null
          deceased_dob: string | null
          deceased_first_name: string | null
          deceased_gender: string | null
          deceased_last_name: string | null
          deceased_name: string
          display_id: string | null
          flow: Database["public"]["Enums"]["dossier_flow"]
          id: string
          insurer_org_id: string | null
          internal_notes: string | null
          is_adhoc: boolean | null
          legal_hold: boolean
          legal_hold_active: boolean
          legal_hold_authority: string | null
          legal_hold_case_number: string | null
          legal_hold_prev_status: string | null
          place_of_death: string | null
          ref_number: string
          require_doc_ref: string | null
          status: Database["public"]["Enums"]["dossier_status"]
          updated_at: string
        }
        Insert: {
          adhoc_fd_org_id?: string | null
          adhoc_limited_access?: boolean | null
          advisory_checks?: Json | null
          assigned_fd_org_id?: string | null
          assignment_status?: string
          created_at?: string
          date_of_death?: string | null
          deceased_dob?: string | null
          deceased_first_name?: string | null
          deceased_gender?: string | null
          deceased_last_name?: string | null
          deceased_name: string
          display_id?: string | null
          flow?: Database["public"]["Enums"]["dossier_flow"]
          id?: string
          insurer_org_id?: string | null
          internal_notes?: string | null
          is_adhoc?: boolean | null
          legal_hold?: boolean
          legal_hold_active?: boolean
          legal_hold_authority?: string | null
          legal_hold_case_number?: string | null
          legal_hold_prev_status?: string | null
          place_of_death?: string | null
          ref_number: string
          require_doc_ref?: string | null
          status?: Database["public"]["Enums"]["dossier_status"]
          updated_at?: string
        }
        Update: {
          adhoc_fd_org_id?: string | null
          adhoc_limited_access?: boolean | null
          advisory_checks?: Json | null
          assigned_fd_org_id?: string | null
          assignment_status?: string
          created_at?: string
          date_of_death?: string | null
          deceased_dob?: string | null
          deceased_first_name?: string | null
          deceased_gender?: string | null
          deceased_last_name?: string | null
          deceased_name?: string
          display_id?: string | null
          flow?: Database["public"]["Enums"]["dossier_flow"]
          id?: string
          insurer_org_id?: string | null
          internal_notes?: string | null
          is_adhoc?: boolean | null
          legal_hold?: boolean
          legal_hold_active?: boolean
          legal_hold_authority?: string | null
          legal_hold_case_number?: string | null
          legal_hold_prev_status?: string | null
          place_of_death?: string | null
          ref_number?: string
          require_doc_ref?: string | null
          status?: Database["public"]["Enums"]["dossier_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_adhoc_fd_org_id_fkey"
            columns: ["adhoc_fd_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_assigned_fd_org_id_fkey"
            columns: ["assigned_fd_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_insurer_org_id_fkey"
            columns: ["insurer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_day_blocks: {
        Row: {
          created_at: string
          created_by_user_id: string
          date: string
          facility_org_id: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          date: string
          facility_org_id: string
          id?: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          date?: string
          facility_org_id?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_day_blocks_facility_org_id_fkey"
            columns: ["facility_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      family_contacts: {
        Row: {
          created_at: string
          dossier_id: string
          email: string | null
          id: string
          name: string
          phone: string | null
          preferred_language: string | null
          relationship: string | null
        }
        Insert: {
          created_at?: string
          dossier_id: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          preferred_language?: string | null
          relationship?: string | null
        }
        Update: {
          created_at?: string
          dossier_id?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          preferred_language?: string | null
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_contacts_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_contacts_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "family_contacts_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      fd_reviews: {
        Row: {
          comment: string | null
          created_at: string
          dossier_id: string
          family_name: string | null
          fd_org_id: string
          id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          dossier_id: string
          family_name?: string | null
          fd_org_id: string
          id?: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          dossier_id?: string
          family_name?: string | null
          fd_org_id?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "fd_reviews_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fd_reviews_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "fd_reviews_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fd_reviews_fd_org_id_fkey"
            columns: ["fd_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean
          key: string
          meta: Json | null
          scope: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          key: string
          meta?: Json | null
          scope?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          key?: string
          meta?: Json | null
          scope?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_tokens: {
        Row: {
          created_at: string
          dossier_id: string
          expires_at: string
          id: string
          token: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          dossier_id: string
          expires_at?: string
          id?: string
          token: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          dossier_id?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_tokens_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_tokens_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "feedback_tokens_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          notes: string | null
          repatriation_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          notes?: string | null
          repatriation_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          notes?: string | null
          repatriation_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_attachments_repatriation_id_fkey"
            columns: ["repatriation_id"]
            isOneToOne: false
            referencedRelation: "repatriations"
            referencedColumns: ["id"]
          },
        ]
      }
      flights: {
        Row: {
          air_waybill: string | null
          arrive_at: string
          carrier: string
          created_at: string
          depart_at: string
          id: string
          repatriation_id: string
          reservation_ref: string
        }
        Insert: {
          air_waybill?: string | null
          arrive_at: string
          carrier: string
          created_at?: string
          depart_at: string
          id?: string
          repatriation_id: string
          reservation_ref: string
        }
        Update: {
          air_waybill?: string | null
          arrive_at?: string
          carrier?: string
          created_at?: string
          depart_at?: string
          id?: string
          repatriation_id?: string
          reservation_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "flights_repatriation_id_fkey"
            columns: ["repatriation_id"]
            isOneToOne: false
            referencedRelation: "repatriations"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_requests: {
        Row: {
          expires_at: string | null
          export_url: string | null
          id: string
          metadata: Json | null
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          request_type: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          export_url?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          request_type: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          export_url?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          request_type?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_refs: {
        Row: {
          created_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          last_sync_at: string | null
          meta: Json | null
          organization_id: string
          provider: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          last_sync_at?: string | null
          meta?: Json | null
          organization_id: string
          provider: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          last_sync_at?: string | null
          meta?: Json | null
          organization_id?: string
          provider?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_refs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_links: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          current_uses: number | null
          expires_at: string
          id: string
          max_uses: number | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          current_uses?: number | null
          expires_at: string
          id?: string
          max_uses?: number | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          current_uses?: number | null
          expires_at?: string
          id?: string
          max_uses?: number | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          invoice_id: string
          metadata: Json | null
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          invoice_id: string
          metadata?: Json | null
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          invoice_id?: string
          metadata?: Json | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_actions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          code: string
          created_at: string
          description: string
          id: string
          invoice_id: string
          qty: number
          unit_price: number
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          qty: number
          unit_price: number
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          dossier_id: string
          external_file_name: string | null
          external_file_url: string | null
          facility_org_id: string
          fd_org_id: string
          id: string
          insurer_notes: string | null
          invoice_number: string | null
          invoice_type: string | null
          is_external: boolean | null
          issued_at: string | null
          needs_info_reason: string | null
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          payment_terms_days: number | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at: string
          uploaded_by: string | null
          vat: number
        }
        Insert: {
          created_at?: string
          dossier_id: string
          external_file_name?: string | null
          external_file_url?: string | null
          facility_org_id: string
          fd_org_id: string
          id?: string
          insurer_notes?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_external?: boolean | null
          issued_at?: string | null
          needs_info_reason?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          payment_terms_days?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          uploaded_by?: string | null
          vat?: number
        }
        Update: {
          created_at?: string
          dossier_id?: string
          external_file_name?: string | null
          external_file_url?: string | null
          facility_org_id?: string
          fd_org_id?: string
          id?: string
          insurer_notes?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
          is_external?: boolean | null
          issued_at?: string | null
          needs_info_reason?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          payment_terms_days?: number | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          uploaded_by?: string | null
          vat?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "invoices_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_facility_org_id_fkey"
            columns: ["facility_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_fd_org_id_fkey"
            columns: ["fd_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      janaz_services: {
        Row: {
          created_at: string
          dossier_id: string
          id: string
          mosque_name: string
          mosque_org_id: string | null
          notes: string | null
          prayer_time: string | null
          service_date: string
          status: Database["public"]["Enums"]["service_status"]
        }
        Insert: {
          created_at?: string
          dossier_id: string
          id?: string
          mosque_name: string
          mosque_org_id?: string | null
          notes?: string | null
          prayer_time?: string | null
          service_date: string
          status?: Database["public"]["Enums"]["service_status"]
        }
        Update: {
          created_at?: string
          dossier_id?: string
          id?: string
          mosque_name?: string
          mosque_org_id?: string | null
          notes?: string | null
          prayer_time?: string | null
          service_date?: string
          status?: Database["public"]["Enums"]["service_status"]
        }
        Relationships: [
          {
            foreignKeyName: "janaz_services_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "janaz_services_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "janaz_services_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "janaz_services_mosque_org_id_fkey"
            columns: ["mosque_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_tasks: {
        Row: {
          assignee_id: string | null
          board_id: string
          column_id: string
          created_at: string
          description: string | null
          dossier_id: string | null
          due_date: string | null
          id: string
          is_archived: boolean
          is_blocked: boolean
          labels: string[] | null
          org_id: string | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          reporter_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          board_id: string
          column_id: string
          created_at?: string
          description?: string | null
          dossier_id?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean
          is_blocked?: boolean
          labels?: string[] | null
          org_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          reporter_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          board_id?: string
          column_id?: string
          created_at?: string
          description?: string | null
          dossier_id?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean
          is_blocked?: boolean
          labels?: string[] | null
          org_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          reporter_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "task_board_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_tasks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_tasks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "kanban_tasks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_holds: {
        Row: {
          authority: string
          case_number: string | null
          dossier_id: string
          id: string
          placed_at: string
          placed_by: string | null
          reason: string | null
          released_at: string | null
          released_by: string | null
          status: string
        }
        Insert: {
          authority: string
          case_number?: string | null
          dossier_id: string
          id?: string
          placed_at?: string
          placed_by?: string | null
          reason?: string | null
          released_at?: string | null
          released_by?: string | null
          status: string
        }
        Update: {
          authority?: string
          case_number?: string | null
          dossier_id?: string
          id?: string
          placed_at?: string
          placed_by?: string | null
          reason?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_holds_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_holds_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "legal_holds_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_holds_placed_by_fkey"
            columns: ["placed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_holds_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      manual_events: {
        Row: {
          created_at: string
          dossier_id: string
          event_description: string | null
          event_title: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dossier_id: string
          event_description?: string | null
          event_title: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dossier_id?: string
          event_description?: string | null
          event_title?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "manual_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_docs: {
        Row: {
          address: string
          created_at: string
          dossier_id: string
          floor: string | null
          id: string
          location_type: Database["public"]["Enums"]["location_type"]
          notes: string | null
        }
        Insert: {
          address: string
          created_at?: string
          dossier_id: string
          floor?: string | null
          id?: string
          location_type: Database["public"]["Enums"]["location_type"]
          notes?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          dossier_id?: string
          floor?: string | null
          id?: string
          location_type?: Database["public"]["Enums"]["location_type"]
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_docs_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_docs_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "medical_docs_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_availability: {
        Row: {
          asr: boolean
          created_at: string
          date: string
          dhuhr: boolean
          fajr: boolean
          id: string
          isha: boolean
          jumuah: boolean | null
          maghrib: boolean
          mosque_org_id: string
          updated_at: string
        }
        Insert: {
          asr?: boolean
          created_at?: string
          date: string
          dhuhr?: boolean
          fajr?: boolean
          id?: string
          isha?: boolean
          jumuah?: boolean | null
          maghrib?: boolean
          mosque_org_id: string
          updated_at?: string
        }
        Update: {
          asr?: boolean
          created_at?: string
          date?: string
          dhuhr?: boolean
          fajr?: boolean
          id?: string
          isha?: boolean
          jumuah?: boolean | null
          maghrib?: boolean
          mosque_org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_availability_mosque_org_id_fkey"
            columns: ["mosque_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_day_blocks: {
        Row: {
          created_at: string
          created_by_user_id: string
          date: string
          id: string
          mosque_org_id: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          date: string
          id?: string
          mosque_org_id: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          date?: string
          id?: string
          mosque_org_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_day_blocks_mosque_org_id_fkey"
            columns: ["mosque_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_weekly_availability: {
        Row: {
          asr: boolean
          created_at: string
          day_of_week: number
          dhuhr: boolean
          fajr: boolean
          id: string
          isha: boolean
          jumuah: boolean | null
          maghrib: boolean
          mosque_org_id: string
          updated_at: string
        }
        Insert: {
          asr?: boolean
          created_at?: string
          day_of_week: number
          dhuhr?: boolean
          fajr?: boolean
          id?: string
          isha?: boolean
          jumuah?: boolean | null
          maghrib?: boolean
          mosque_org_id: string
          updated_at?: string
        }
        Update: {
          asr?: boolean
          created_at?: string
          day_of_week?: number
          dhuhr?: boolean
          fajr?: boolean
          id?: string
          isha?: boolean
          jumuah?: boolean | null
          maghrib?: boolean
          mosque_org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string
          delivered_at: string | null
          dossier_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_contact: string
          recipient_type: string
          sent_at: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          delivered_at?: string | null
          dossier_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_contact: string
          recipient_type: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          delivered_at?: string | null
          dossier_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_contact?: string
          recipient_type?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "notification_log_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_active: boolean
          recipient_type: string
          subject: string | null
          template_en: string | null
          template_fr: string | null
          template_nl: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          is_active?: boolean
          recipient_type: string
          subject?: string | null
          template_en?: string | null
          template_fr?: string | null
          template_nl: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          recipient_type?: string
          subject?: string | null
          template_en?: string | null
          template_fr?: string | null
          template_nl?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["channel"]
          created_at: string
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          dossier_id: string | null
          id: string
          recipient: string
          sent_at: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["channel"]
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          dossier_id?: string | null
          id?: string
          recipient: string
          sent_at?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["channel"]
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          dossier_id?: string | null
          id?: string
          recipient?: string
          sent_at?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "notifications_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          organization_id: string
          phone: string | null
          role: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          organization_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          organization_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          invited_role: Database["public"]["Enums"]["app_role"]
          organization_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_role: Database["public"]["Enums"]["app_role"]
          organization_id: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_role?: Database["public"]["Enums"]["app_role"]
          organization_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_locations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          organization_id: string
          postal_code: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          organization_id: string
          postal_code?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          organization_id?: string
          postal_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_onboarding: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          organization_id: string
          step_basic_info: boolean
          step_integrations: boolean
          step_preferences: boolean
          step_team_setup: boolean
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          step_basic_info?: boolean
          step_integrations?: boolean
          step_preferences?: boolean
          step_team_setup?: boolean
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          step_basic_info?: boolean
          step_integrations?: boolean
          step_preferences?: boolean
          step_team_setup?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_onboarding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_verification_docs: {
        Row: {
          document_type: string
          file_name: string
          file_url: string
          id: string
          organization_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          document_type: string
          file_name: string
          file_url: string
          id?: string
          organization_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          organization_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_verification_docs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          address_city: string | null
          address_country: string | null
          address_postcode: string | null
          address_street: string | null
          approved_at: string | null
          approved_by: string | null
          billing_email: string | null
          business_number: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_first_name: string | null
          contact_last_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          created_by_role: string | null
          iban: string | null
          id: string
          language: string | null
          legal_name: string | null
          name: string
          postal_code: string | null
          provisional: boolean | null
          registration_number: string | null
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string | null
          slug: string | null
          status: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
          vat_number: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          address_city?: string | null
          address_country?: string | null
          address_postcode?: string | null
          address_street?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billing_email?: string | null
          business_number?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by_role?: string | null
          iban?: string | null
          id?: string
          language?: string | null
          legal_name?: string | null
          name: string
          postal_code?: string | null
          provisional?: boolean | null
          registration_number?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          slug?: string | null
          status?: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          vat_number?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          address_city?: string | null
          address_country?: string | null
          address_postcode?: string | null
          address_street?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billing_email?: string | null
          business_number?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          created_by_role?: string | null
          iban?: string | null
          id?: string
          language?: string | null
          legal_name?: string | null
          name?: string
          postal_code?: string | null
          provisional?: boolean | null
          registration_number?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          slug?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          vat_number?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          token_hash: string
          used: boolean
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          token_hash: string
          used?: boolean
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          token_hash?: string
          used?: boolean
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pending_2fa: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip: unknown | null
          nonce: string
          used: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip?: unknown | null
          nonce?: string
          used?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip?: unknown | null
          nonce?: string
          used?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      polis_checks: {
        Row: {
          checked_at: string
          dossier_id: string
          id: string
          insurer_name: string
          is_covered: boolean | null
          num_travelers: number | null
          polis_number: string
        }
        Insert: {
          checked_at?: string
          dossier_id: string
          id?: string
          insurer_name: string
          is_covered?: boolean | null
          num_travelers?: number | null
          polis_number: string
        }
        Update: {
          checked_at?: string
          dossier_id?: string
          id?: string
          insurer_name?: string
          is_covered?: boolean | null
          num_travelers?: number | null
          polis_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "polis_checks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polis_checks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "polis_checks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          nis_encrypted: string | null
          phone: string | null
          phone_verified: boolean | null
          ssn_encrypted: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          two_fa_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          nis_encrypted?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          ssn_encrypted?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          two_fa_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          nis_encrypted?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          ssn_encrypted?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          two_fa_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      qr_scan_events: {
        Row: {
          access_granted: boolean
          denial_reason: string | null
          id: string
          ip_address: unknown | null
          location: string | null
          metadata: Json | null
          qr_token_id: string
          scanned_at: string
          scanned_by: string | null
          user_agent: string | null
        }
        Insert: {
          access_granted: boolean
          denial_reason?: string | null
          id?: string
          ip_address?: unknown | null
          location?: string | null
          metadata?: Json | null
          qr_token_id: string
          scanned_at?: string
          scanned_by?: string | null
          user_agent?: string | null
        }
        Update: {
          access_granted?: boolean
          denial_reason?: string | null
          id?: string
          ip_address?: unknown | null
          location?: string | null
          metadata?: Json | null
          qr_token_id?: string
          scanned_at?: string
          scanned_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scan_events_qr_token_id_fkey"
            columns: ["qr_token_id"]
            isOneToOne: false
            referencedRelation: "qr_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_tags: {
        Row: {
          created_at: string
          dossier_id: string
          facility_org_id: string
          id: string
          printed_at: string | null
          qr_code_data: string
        }
        Insert: {
          created_at?: string
          dossier_id: string
          facility_org_id: string
          id?: string
          printed_at?: string | null
          qr_code_data: string
        }
        Update: {
          created_at?: string
          dossier_id?: string
          facility_org_id?: string
          id?: string
          printed_at?: string | null
          qr_code_data?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_tags_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_tags_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "qr_tags_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_tags_facility_org_id_fkey"
            columns: ["facility_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_tokens: {
        Row: {
          created_at: string
          created_by: string
          dossier_id: string
          expires_at: string
          id: string
          max_scans: number | null
          revoke_reason: string | null
          revoked: boolean
          revoked_at: string | null
          revoked_by: string | null
          scan_count: number
          scopes: Json
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dossier_id: string
          expires_at: string
          id?: string
          max_scans?: number | null
          revoke_reason?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          scan_count?: number
          scopes?: Json
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dossier_id?: string
          expires_at?: string
          id?: string
          max_scans?: number | null
          revoke_reason?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          scan_count?: number
          scopes?: Json
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_tokens_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_tokens_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "qr_tokens_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_tracking: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      repatriations: {
        Row: {
          created_at: string
          dest_address: string | null
          dest_city: string
          dest_country: string
          dossier_id: string
          id: string
          traveler_id: string | null
        }
        Insert: {
          created_at?: string
          dest_address?: string | null
          dest_city: string
          dest_country: string
          dossier_id: string
          id?: string
          traveler_id?: string | null
        }
        Update: {
          created_at?: string
          dest_address?: string | null
          dest_city?: string
          dest_country?: string
          dossier_id?: string
          id?: string
          traveler_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repatriations_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repatriations_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "repatriations_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repatriations_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activities: {
        Row: {
          action: string
          created_at: string
          from_value: string | null
          id: string
          metadata: Json | null
          task_id: string
          to_value: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          from_value?: string | null
          id?: string
          metadata?: Json | null
          task_id: string
          to_value?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          from_value?: string | null
          id?: string
          metadata?: Json | null
          task_id?: string
          to_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "kanban_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_board_columns: {
        Row: {
          board_id: string
          created_at: string
          id: string
          is_done: boolean
          key: string
          label: string
          order_idx: number
          wip_limit: number | null
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          is_done?: boolean
          key: string
          label: string
          order_idx: number
          wip_limit?: number | null
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          is_done?: boolean
          key?: string
          label?: string
          order_idx?: number
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_board_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      task_boards: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_boards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_deleted: boolean
          task_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          task_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "kanban_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_priority_audit: {
        Row: {
          actor_user_id: string
          created_at: string
          from_priority: Database["public"]["Enums"]["priority"]
          id: string
          source_after: Database["public"]["Enums"]["priority_source"]
          source_before: Database["public"]["Enums"]["priority_source"]
          task_id: string
          to_priority: Database["public"]["Enums"]["priority"]
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          from_priority: Database["public"]["Enums"]["priority"]
          id?: string
          source_after: Database["public"]["Enums"]["priority_source"]
          source_before: Database["public"]["Enums"]["priority_source"]
          task_id: string
          to_priority: Database["public"]["Enums"]["priority"]
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          from_priority?: Database["public"]["Enums"]["priority"]
          id?: string
          source_after?: Database["public"]["Enums"]["priority_source"]
          source_before?: Database["public"]["Enums"]["priority_source"]
          task_id?: string
          to_priority?: Database["public"]["Enums"]["priority"]
        }
        Relationships: [
          {
            foreignKeyName: "task_priority_audit_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_watchers: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_watchers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "kanban_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          dossier_id: string
          id: string
          priority: Database["public"]["Enums"]["priority"]
          priority_set_at: string | null
          priority_set_by_user_id: string | null
          priority_source: Database["public"]["Enums"]["priority_source"]
          status: Database["public"]["Enums"]["task_status"]
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          dossier_id: string
          id?: string
          priority?: Database["public"]["Enums"]["priority"]
          priority_set_at?: string | null
          priority_set_by_user_id?: string | null
          priority_source?: Database["public"]["Enums"]["priority_source"]
          status?: Database["public"]["Enums"]["task_status"]
          type: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          dossier_id?: string
          id?: string
          priority?: Database["public"]["Enums"]["priority"]
          priority_set_at?: string | null
          priority_set_by_user_id?: string | null
          priority_source?: Database["public"]["Enums"]["priority_source"]
          status?: Database["public"]["Enums"]["task_status"]
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "tasks_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_members: {
        Row: {
          id: string
          joined_at: string
          last_read_at: string | null
          muted: boolean | null
          role: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          created_by: string
          dossier_id: string | null
          id: string
          last_message_at: string | null
          name: string | null
          org_id: string | null
          type: Database["public"]["Enums"]["thread_type"]
          updated_at: string
          visibility_policy: Json | null
        }
        Insert: {
          created_at?: string
          created_by: string
          dossier_id?: string | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          org_id?: string | null
          type: Database["public"]["Enums"]["thread_type"]
          updated_at?: string
          visibility_policy?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string
          dossier_id?: string | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          org_id?: string | null
          type?: Database["public"]["Enums"]["thread_type"]
          updated_at?: string
          visibility_policy?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "threads_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "threads_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_name: string | null
          expires_at: string
          id: string
          ip_prefix: unknown | null
          last_rotated_at: string
          last_used_at: string
          revoke_reason: string | null
          revoked: boolean
          risk_score: number
          token_hash: string
          user_agent_hash: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          expires_at?: string
          id?: string
          ip_prefix?: unknown | null
          last_rotated_at?: string
          last_used_at?: string
          revoke_reason?: string | null
          revoked?: boolean
          risk_score?: number
          token_hash: string
          user_agent_hash?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          expires_at?: string
          id?: string
          ip_prefix?: unknown | null
          last_rotated_at?: string
          last_used_at?: string
          revoke_reason?: string | null
          revoked?: boolean
          risk_score?: number
          token_hash?: string
          user_agent_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_2fa_settings: {
        Row: {
          backup_phone: string | null
          created_at: string
          id: string
          last_verified_at: string | null
          recovery_codes: string[] | null
          sms_enabled: boolean
          totp_enabled: boolean
          totp_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_phone?: string | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          recovery_codes?: string[] | null
          sms_enabled?: boolean
          totp_enabled?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_phone?: string | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          recovery_codes?: string[] | null
          sms_enabled?: boolean
          totp_enabled?: boolean
          totp_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_admin: boolean | null
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean | null
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          scope?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_activity_at: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity_at?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity_at?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_totp_replay_guard: {
        Row: {
          created_at: string
          period: number
          user_id: string
        }
        Insert: {
          created_at?: string
          period: number
          user_id: string
        }
        Update: {
          created_at?: string
          period?: number
          user_id?: string
        }
        Relationships: []
      }
      wash_services: {
        Row: {
          cool_cell_id: string | null
          created_at: string
          dossier_id: string
          facility_org_id: string
          id: string
          note: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["wash_status"]
          updated_at: string
        }
        Insert: {
          cool_cell_id?: string | null
          created_at?: string
          dossier_id: string
          facility_org_id: string
          id?: string
          note?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["wash_status"]
          updated_at?: string
        }
        Update: {
          cool_cell_id?: string | null
          created_at?: string
          dossier_id?: string
          facility_org_id?: string
          id?: string
          note?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["wash_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wash_services_cool_cell_id_fkey"
            columns: ["cool_cell_id"]
            isOneToOne: false
            referencedRelation: "cool_cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wash_services_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wash_services_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers_mosque_view"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "wash_services_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "view_my_dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wash_services_facility_org_id_fkey"
            columns: ["facility_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      audit_log_view: {
        Row: {
          actor_role: string | null
          created_at: string | null
          description: string | null
          dossier_id: string | null
          event_type: string | null
          id: string | null
          metadata: Json | null
          payload_diff: Json | null
          reason: string | null
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          actor_role?: string | null
          created_at?: string | null
          description?: string | null
          dossier_id?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          payload_diff?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          actor_role?: string | null
          created_at?: string | null
          description?: string | null
          dossier_id?: string | null
          event_type?: string | null
          id?: string | null
          metadata?: Json | null
          payload_diff?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dossiers_mosque_view: {
        Row: {
          deceased_name: string | null
          display_id: string | null
          dossier_id: string | null
          family_name_for_notice: string | null
          fd_org_name: string | null
          flow: Database["public"]["Enums"]["dossier_flow"] | null
          janazah_at: string | null
          janazah_location: string | null
          mosque_event_id: string | null
          mosque_event_status: string | null
          status: Database["public"]["Enums"]["dossier_status"] | null
        }
        Relationships: []
      }
      v_fd_review_summary: {
        Row: {
          avg_rating: number | null
          fd_org_id: string | null
          last_comment: string | null
          total_reviews: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fd_reviews_fd_org_id_fkey"
            columns: ["fd_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      view_my_dossiers: {
        Row: {
          advisory_checks: Json | null
          assigned_fd_org_id: string | null
          assignment_status: string | null
          contact_count: number | null
          created_at: string | null
          date_of_death: string | null
          deceased_dob: string | null
          deceased_gender: string | null
          deceased_name: string | null
          display_id: string | null
          document_count: number | null
          fd_org_name: string | null
          flow: Database["public"]["Enums"]["dossier_flow"] | null
          id: string | null
          insurer_name: string | null
          insurer_org_id: string | null
          internal_notes: string | null
          legal_hold: boolean | null
          ref_number: string | null
          require_doc_ref: string | null
          status: Database["public"]["Enums"]["dossier_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_assigned_fd_org_id_fkey"
            columns: ["assigned_fd_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_insurer_org_id_fkey"
            columns: ["insurer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      admin_approve_organization: {
        Args: { p_admin_id: string; p_approved: boolean; p_org_id: string }
        Returns: undefined
      }
      app_get_setting: {
        Args: { key: string }
        Returns: string
      }
      app_setting: {
        Args: { default_value?: string; key: string }
        Returns: string
      }
      apply_retention_policies: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      approve_dossier_claim: {
        Args: { p_approved: boolean; p_claim_id: string }
        Returns: Json
      }
      calculate_device_risk: {
        Args: {
          p_current_ip: string
          p_current_user_agent: string
          p_device_id: string
        }
        Returns: number
      }
      calculate_login_delay: {
        Args: { p_email: string }
        Returns: number
      }
      calculate_task_priority: {
        Args: {
          _dossier_id: string
          _task_type: Database["public"]["Enums"]["task_type"]
        }
        Returns: Database["public"]["Enums"]["priority"]
      }
      case_event_belongs_to_user_mosque: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      check_2fa_requirement: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_password_reset_rate_limit: {
        Args: { p_email: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      claim_dossier: {
        Args: {
          p_dossier_id: string
          p_note?: string
          p_require_family_approval?: boolean
        }
        Returns: Json
      }
      claim_totp_period: {
        Args: { p_nonce: string; p_period: number }
        Returns: Json
      }
      cleanup_device_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_2fa_nonces: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_captcha: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_password_reset_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_qr_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_replay_guards: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      count_claimable_dossiers: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_2fa_nonce: {
        Args: { p_ip?: string; p_user_agent?: string; p_user_id: string }
        Returns: string
      }
      decrypt_field: {
        Args: { p_encrypted: string; p_key?: string }
        Returns: string
      }
      encrypt_field: {
        Args: { p_data: string; p_key?: string }
        Returns: string
      }
      ensure_task_board: {
        Args: { p_org: string }
        Returns: string
      }
      fn_ensure_board_and_todo_col: {
        Args: { p_org: string }
        Returns: Record<string, unknown>
      }
      fn_invoice_mark_paid: {
        Args: { p_invoice_id: string; p_note?: string }
        Returns: undefined
      }
      fn_invoice_send: {
        Args: { p_invoice_id: string; p_message?: string }
        Returns: undefined
      }
      fn_place_legal_hold: {
        Args: {
          p_actor: string
          p_authority: string
          p_case_number: string
          p_dossier_id: string
          p_reason: string
        }
        Returns: undefined
      }
      fn_register_org_with_contact: {
        Args:
          | {
              p_business_number: string
              p_contact_email: string
              p_contact_first_name: string
              p_contact_last_name: string
              p_contact_phone: string
              p_org_name: string
              p_org_type: string
              p_set_active?: boolean
              p_user_id: string
              p_vat_number: string
            }
          | {
              p_business_number?: string
              p_company_name: string
              p_contact_first_name?: string
              p_contact_last_name?: string
              p_email?: string
              p_org_type: string
              p_phone?: string
              p_set_active?: boolean
              p_user_id?: string
            }
        Returns: Json
      }
      fn_release_legal_hold: {
        Args: { p_actor: string; p_dossier_id: string; p_reason: string }
        Returns: undefined
      }
      fn_seed_dossier_tasks_sql: {
        Args: { p_dossier_id: string; p_flow: string; p_status: string }
        Returns: undefined
      }
      generate_feedback_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invitation_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_qr_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_2fa_settings_with_nonce: {
        Args: { p_nonce: string }
        Returns: Json
      }
      get_decrypted_nis: {
        Args: { p_profile_id: string }
        Returns: string
      }
      get_ip_prefix: {
        Args: { p_ip: string }
        Returns: unknown
      }
      get_user_data_export: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_org_ids_for_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: {
          organization_id: string
        }[]
      }
      handle_fd_request: {
        Args: {
          p_approved: boolean
          p_claim_id: string
          p_rejection_reason?: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_locked: {
        Args: { p_email: string }
        Returns: boolean
      }
      is_admin_or_platform_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_allowed_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_admin_for: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_thread_member: {
        Args: { p_thread_id: string; p_user_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_reason?: string
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      log_password_change: {
        Args: {
          p_ip?: string
          p_method: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_invoice_paid: {
        Args: { p_invoice_id: string; p_reason?: string }
        Returns: Json
      }
      mark_password_reset_token_used: {
        Args: { p_token_hash: string }
        Returns: undefined
      }
      register_device_token: {
        Args: {
          p_device_fingerprint: string
          p_device_name?: string
          p_ip?: string
          p_old_token_hash?: string
          p_token_hash: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      release_dossier: {
        Args: { p_action: string; p_dossier_id: string; p_reason?: string }
        Returns: Json
      }
      request_data_deletion: {
        Args: { p_reason?: string }
        Returns: Json
      }
      request_data_export: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      revoke_qr_token: {
        Args: { p_reason: string; p_token_id: string }
        Returns: undefined
      }
      set_encrypted_nis: {
        Args: { p_nis: string; p_profile_id: string }
        Returns: undefined
      }
      update_2fa_verification: {
        Args: { p_recovery_code?: string; p_user_id: string }
        Returns: undefined
      }
      update_session_activity: {
        Args: { p_session_token: string }
        Returns: Json
      }
      user_2fa_status: {
        Args: { p_user_id: string }
        Returns: Json
      }
      user_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_mosque_has_event_for_dossier: {
        Args: { _dossier_id: string; _user_id: string }
        Returns: boolean
      }
      user_org_is_approved: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      user_requires_2fa: {
        Args: { user_id: string }
        Returns: boolean
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: Json
      }
      validate_status_transition: {
        Args: {
          p_dossier_id: string
          p_new_status: Database["public"]["Enums"]["dossier_status"]
        }
        Returns: Json
      }
      verify_captcha: {
        Args: { p_endpoint: string; p_identifier: string; p_token: string }
        Returns: Json
      }
      verify_device_token: {
        Args: {
          p_current_ip?: string
          p_current_user_agent?: string
          p_token_hash: string
        }
        Returns: Json
      }
      verify_password_reset_token: {
        Args: { p_token_hash: string }
        Returns: Json
      }
      verify_qr_token: {
        Args: {
          p_ip?: string
          p_scanned_by?: string
          p_token: string
          p_user_agent?: string
        }
        Returns: Json
      }
      verify_totp_code: {
        Args: { p_nonce: string; p_token: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "funeral_director"
        | "insurer"
        | "family"
        | "mortuarium"
        | "mosque"
        | "platform_admin"
        | "org_admin"
        | "reviewer"
        | "support"
      channel: "EMAIL" | "SMS" | "PUSH"
      claim_source: "API" | "MANUAL"
      claim_status:
        | "API_PENDING"
        | "API_APPROVED"
        | "API_REJECTED"
        | "MANUAL_APPROVED"
        | "MANUAL_REJECTED"
        | "BLOCKED"
      communication_channel: "PORTAL"
      cool_cell_status: "FREE" | "RESERVED" | "OCCUPIED" | "OUT_OF_SERVICE"
      delivery_status: "PENDING" | "SENT" | "FAILED"
      doc_status: "IN_REVIEW" | "APPROVED" | "REJECTED"
      doc_type:
        | "MEDICAL_ID"
        | "MEDICAL_DEATH_CERTIFICATE"
        | "DEATH_CERTIFICATE"
        | "TRANSPORT_PERMIT"
        | "LAISSEZ_PASSER"
        | "CONSULAR_LASSEZ_PASSER"
        | "SEALING_CERTIFICATE"
        | "OTHER"
        | "OBITUARY_JANAZAH"
      dossier_flow: "REP" | "LOC" | "UNSET"
      dossier_status:
        | "CREATED"
        | "INTAKE_IN_PROGRESS"
        | "DOCS_PENDING"
        | "FD_ASSIGNED"
        | "DOCS_VERIFIED"
        | "APPROVED"
        | "LEGAL_HOLD"
        | "PLANNING"
        | "READY_FOR_TRANSPORT"
        | "IN_TRANSIT"
        | "ARCHIVED"
      invoice_status:
        | "DRAFT"
        | "ISSUED"
        | "PAID"
        | "CANCELLED"
        | "NEEDS_INFO"
        | "APPROVED"
      location_type: "HOME" | "HOSPITAL" | "OTHER"
      mosque_status: "PENDING" | "CONFIRMED" | "DECLINED"
      org_type:
        | "FUNERAL_DIRECTOR"
        | "MOSQUE"
        | "INSURER"
        | "FAMILY"
        | "ADMIN"
        | "OTHER"
        | "MORTUARIUM"
      org_ver_status: "PENDING" | "ACTIVE" | "REJECTED" | "REVIEW_REQUIRED"
      prayer_type: "FAJR" | "DHUHR" | "ASR" | "MAGHRIB" | "ISHA" | "JUMUAH"
      priority: "HIGH" | "MEDIUM" | "LOW"
      priority_source: "AUTO" | "MANUAL"
      reservation_status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
      service_status: "PENDING" | "CONFIRMED" | "COMPLETED" | "FAILED"
      task_priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      task_status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED"
      task_type:
        | "DOC_REUPLOAD_REQUEST"
        | "MOSQUE_CONFIRM"
        | "WASH_START"
        | "FLIGHT_REGISTER"
        | "INTAKE_COMPLETE"
        | "LEGAL_HOLD_FOLLOW_UP"
        | "TRANSPORT_PREPARE"
        | "DOC_REVIEW"
      thread_type:
        | "dossier_family"
        | "dossier_insurer"
        | "dossier_shared"
        | "org_channel"
        | "dm"
      user_status:
        | "PENDING_REGISTRATION"
        | "EMAIL_VERIFIED"
        | "TWOFA_VERIFIED"
        | "PENDING_VERIFICATION"
        | "ACTIVE"
        | "DISABLED"
      wash_status:
        | "PENDING"
        | "SCHEDULED"
        | "ARRIVED"
        | "WASHING"
        | "WASHED"
        | "RELEASED"
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
      app_role: [
        "admin",
        "funeral_director",
        "insurer",
        "family",
        "mortuarium",
        "mosque",
        "platform_admin",
        "org_admin",
        "reviewer",
        "support",
      ],
      channel: ["EMAIL", "SMS", "PUSH"],
      claim_source: ["API", "MANUAL"],
      claim_status: [
        "API_PENDING",
        "API_APPROVED",
        "API_REJECTED",
        "MANUAL_APPROVED",
        "MANUAL_REJECTED",
        "BLOCKED",
      ],
      communication_channel: ["PORTAL"],
      cool_cell_status: ["FREE", "RESERVED", "OCCUPIED", "OUT_OF_SERVICE"],
      delivery_status: ["PENDING", "SENT", "FAILED"],
      doc_status: ["IN_REVIEW", "APPROVED", "REJECTED"],
      doc_type: [
        "MEDICAL_ID",
        "MEDICAL_DEATH_CERTIFICATE",
        "DEATH_CERTIFICATE",
        "TRANSPORT_PERMIT",
        "LAISSEZ_PASSER",
        "CONSULAR_LASSEZ_PASSER",
        "SEALING_CERTIFICATE",
        "OTHER",
        "OBITUARY_JANAZAH",
      ],
      dossier_flow: ["REP", "LOC", "UNSET"],
      dossier_status: [
        "CREATED",
        "INTAKE_IN_PROGRESS",
        "DOCS_PENDING",
        "FD_ASSIGNED",
        "DOCS_VERIFIED",
        "APPROVED",
        "LEGAL_HOLD",
        "PLANNING",
        "READY_FOR_TRANSPORT",
        "IN_TRANSIT",
        "ARCHIVED",
      ],
      invoice_status: [
        "DRAFT",
        "ISSUED",
        "PAID",
        "CANCELLED",
        "NEEDS_INFO",
        "APPROVED",
      ],
      location_type: ["HOME", "HOSPITAL", "OTHER"],
      mosque_status: ["PENDING", "CONFIRMED", "DECLINED"],
      org_type: [
        "FUNERAL_DIRECTOR",
        "MOSQUE",
        "INSURER",
        "FAMILY",
        "ADMIN",
        "OTHER",
        "MORTUARIUM",
      ],
      org_ver_status: ["PENDING", "ACTIVE", "REJECTED", "REVIEW_REQUIRED"],
      prayer_type: ["FAJR", "DHUHR", "ASR", "MAGHRIB", "ISHA", "JUMUAH"],
      priority: ["HIGH", "MEDIUM", "LOW"],
      priority_source: ["AUTO", "MANUAL"],
      reservation_status: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
      service_status: ["PENDING", "CONFIRMED", "COMPLETED", "FAILED"],
      task_priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      task_status: ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"],
      task_type: [
        "DOC_REUPLOAD_REQUEST",
        "MOSQUE_CONFIRM",
        "WASH_START",
        "FLIGHT_REGISTER",
        "INTAKE_COMPLETE",
        "LEGAL_HOLD_FOLLOW_UP",
        "TRANSPORT_PREPARE",
        "DOC_REVIEW",
      ],
      thread_type: [
        "dossier_family",
        "dossier_insurer",
        "dossier_shared",
        "org_channel",
        "dm",
      ],
      user_status: [
        "PENDING_REGISTRATION",
        "EMAIL_VERIFIED",
        "TWOFA_VERIFIED",
        "PENDING_VERIFICATION",
        "ACTIVE",
        "DISABLED",
      ],
      wash_status: [
        "PENDING",
        "SCHEDULED",
        "ARRIVED",
        "WASHING",
        "WASHED",
        "RELEASED",
      ],
    },
  },
} as const
