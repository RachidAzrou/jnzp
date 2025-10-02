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
          created_at: string
          description: string | null
          dossier_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          dossier_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          dossier_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
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
      dossiers: {
        Row: {
          assigned_fd_org_id: string | null
          created_at: string
          date_of_death: string | null
          deceased_dob: string | null
          deceased_name: string
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
          issued_at: string | null
          paid_at: string | null
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
          issued_at?: string | null
          paid_at?: string | null
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
          issued_at?: string | null
          paid_at?: string | null
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
          afternoon_open: boolean
          created_at: string
          date: string
          evening_open: boolean
          id: string
          morning_open: boolean
          mosque_org_id: string
          updated_at: string
        }
        Insert: {
          afternoon_open?: boolean
          created_at?: string
          date: string
          evening_open?: boolean
          id?: string
          morning_open?: boolean
          mosque_org_id: string
          updated_at?: string
        }
        Update: {
          afternoon_open?: boolean
          created_at?: string
          date?: string
          evening_open?: boolean
          id?: string
          morning_open?: boolean
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
          requested_at: string
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
          requested_at?: string
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
          requested_at?: string
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
      organizations: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
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
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
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
      user_roles: {
        Row: {
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role:
        | "admin"
        | "funeral_director"
        | "insurer"
        | "family"
        | "wasplaats"
        | "mosque"
      channel: "EMAIL" | "SMS" | "PUSH"
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
      invoice_status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED"
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
      reservation_status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
      service_status: "PENDING" | "CONFIRMED" | "COMPLETED" | "FAILED"
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
      ],
      channel: ["EMAIL", "SMS", "PUSH"],
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
      invoice_status: ["DRAFT", "ISSUED", "PAID", "CANCELLED"],
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
      reservation_status: ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"],
      service_status: ["PENDING", "CONFIRMED", "COMPLETED", "FAILED"],
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
