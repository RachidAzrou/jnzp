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
      audit_events: {
        Row: {
          actor_role: string | null
          created_at: string
          description: string | null
          dossier_id: string | null
          event_type: string
          id: string
          metadata: Json | null
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
          payload_diff?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at: string
          whatsapp_message_id: string | null
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
          updated_at?: string
          whatsapp_message_id?: string | null
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
          updated_at?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
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
      documents: {
        Row: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          dossier_id: string
          file_name: string
          file_url: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["doc_status"]
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          doc_type: Database["public"]["Enums"]["doc_type"]
          dossier_id: string
          file_name: string
          file_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          doc_type?: Database["public"]["Enums"]["doc_type"]
          dossier_id?: string
          file_name?: string
          file_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          uploaded_at?: string
          uploaded_by?: string | null
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
      dossier_communication_preferences: {
        Row: {
          dossier_id: string
          id: string
          last_channel_used: Database["public"]["Enums"]["communication_channel"]
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          dossier_id: string
          id?: string
          last_channel_used: Database["public"]["Enums"]["communication_channel"]
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          dossier_id?: string
          id?: string
          last_channel_used?: Database["public"]["Enums"]["communication_channel"]
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_communication_preferences_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: true
            referencedRelation: "dossiers"
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
        ]
      }
      dossiers: {
        Row: {
          assigned_fd_org_id: string | null
          created_at: string
          date_of_death: string | null
          deceased_dob: string | null
          deceased_name: string
          display_id: string | null
          flow: Database["public"]["Enums"]["dossier_flow"]
          id: string
          insurer_org_id: string | null
          legal_hold: boolean
          ref_number: string
          require_doc_ref: string | null
          status: Database["public"]["Enums"]["dossier_status"]
          updated_at: string
        }
        Insert: {
          assigned_fd_org_id?: string | null
          created_at?: string
          date_of_death?: string | null
          deceased_dob?: string | null
          deceased_name: string
          display_id?: string | null
          flow?: Database["public"]["Enums"]["dossier_flow"]
          id?: string
          insurer_org_id?: string | null
          legal_hold?: boolean
          ref_number: string
          require_doc_ref?: string | null
          status?: Database["public"]["Enums"]["dossier_status"]
          updated_at?: string
        }
        Update: {
          assigned_fd_org_id?: string | null
          created_at?: string
          date_of_death?: string | null
          deceased_dob?: string | null
          deceased_name?: string
          display_id?: string | null
          flow?: Database["public"]["Enums"]["dossier_flow"]
          id?: string
          insurer_org_id?: string | null
          legal_hold?: boolean
          ref_number?: string
          require_doc_ref?: string | null
          status?: Database["public"]["Enums"]["dossier_status"]
          updated_at?: string
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
          facility_org_id: string
          fd_org_id: string
          id: string
          insurer_notes: string | null
          invoice_number: string | null
          invoice_type: string | null
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
          vat: number
        }
        Insert: {
          created_at?: string
          dossier_id: string
          facility_org_id: string
          fd_org_id: string
          id?: string
          insurer_notes?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
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
          vat?: number
        }
        Update: {
          created_at?: string
          dossier_id?: string
          facility_org_id?: string
          fd_org_id?: string
          id?: string
          insurer_notes?: string | null
          invoice_number?: string | null
          invoice_type?: string | null
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
          notes: string | null
          service_date: string
          status: Database["public"]["Enums"]["service_status"]
        }
        Insert: {
          created_at?: string
          dossier_id: string
          id?: string
          mosque_name: string
          notes?: string | null
          service_date: string
          status?: Database["public"]["Enums"]["service_status"]
        }
        Update: {
          created_at?: string
          dossier_id?: string
          id?: string
          mosque_name?: string
          notes?: string | null
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
      mosque_services: {
        Row: {
          confirmed_slot: string | null
          created_at: string
          decline_reason: string | null
          dossier_id: string
          id: string
          mosque_org_id: string
          note: string | null
          prayer: Database["public"]["Enums"]["prayer_type"] | null
          proposed_date: string | null
          proposed_prayer: Database["public"]["Enums"]["prayer_type"] | null
          requested_at: string
          requested_date: string | null
          requested_slot: string | null
          status: Database["public"]["Enums"]["mosque_status"]
          updated_at: string
        }
        Insert: {
          confirmed_slot?: string | null
          created_at?: string
          decline_reason?: string | null
          dossier_id: string
          id?: string
          mosque_org_id: string
          note?: string | null
          prayer?: Database["public"]["Enums"]["prayer_type"] | null
          proposed_date?: string | null
          proposed_prayer?: Database["public"]["Enums"]["prayer_type"] | null
          requested_at?: string
          requested_date?: string | null
          requested_slot?: string | null
          status?: Database["public"]["Enums"]["mosque_status"]
          updated_at?: string
        }
        Update: {
          confirmed_slot?: string | null
          created_at?: string
          decline_reason?: string | null
          dossier_id?: string
          id?: string
          mosque_org_id?: string
          note?: string | null
          prayer?: Database["public"]["Enums"]["prayer_type"] | null
          proposed_date?: string | null
          proposed_prayer?: Database["public"]["Enums"]["prayer_type"] | null
          requested_at?: string
          requested_date?: string | null
          requested_slot?: string | null
          status?: Database["public"]["Enums"]["mosque_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_services_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mosque_services_mosque_org_id_fkey"
            columns: ["mosque_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          postal_code: string | null
          registration_number: string | null
          rejection_reason: string | null
          requested_at: string | null
          requested_by: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
          vat_number: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          postal_code?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          vat_number?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          postal_code?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by?: string | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          vat_number?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
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
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
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
            foreignKeyName: "qr_tags_facility_org_id_fkey"
            columns: ["facility_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "repatriations_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope: string | null
          user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          scope?: string | null
          user_id: string
        }
        Update: {
          id?: string
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
        Relationships: [
          {
            foreignKeyName: "audit_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
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
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
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
      generate_invitation_code: {
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
      user_requires_2fa: {
        Args: { user_id: string }
        Returns: boolean
      }
      validate_password_strength: {
        Args: { password: string }
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
        | "wasplaats"
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
      communication_channel: "PORTAL" | "WHATSAPP"
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
        | "WASPLAATS"
      prayer_type: "FAJR" | "DHUHR" | "ASR" | "MAGHRIB" | "ISHA" | "JUMUAH"
      priority: "HIGH" | "MEDIUM" | "LOW"
      priority_source: "AUTO" | "MANUAL"
      reservation_status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
      service_status: "PENDING" | "CONFIRMED" | "COMPLETED" | "FAILED"
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
        "wasplaats",
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
      ],
      communication_channel: ["PORTAL", "WHATSAPP"],
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
        "WASPLAATS",
      ],
      prayer_type: ["FAJR", "DHUHR", "ASR", "MAGHRIB", "ISHA", "JUMUAH"],
      priority: ["HIGH", "MEDIUM", "LOW"],
      priority_source: ["AUTO", "MANUAL"],
      reservation_status: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
      service_status: ["PENDING", "CONFIRMED", "COMPLETED", "FAILED"],
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
