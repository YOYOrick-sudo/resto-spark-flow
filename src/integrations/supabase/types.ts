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
      areas: {
        Row: {
          created_at: string
          fill_order: Database["public"]["Enums"]["fill_order_type"]
          id: string
          is_active: boolean
          location_id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fill_order?: Database["public"]["Enums"]["fill_order_type"]
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fill_order?: Database["public"]["Enums"]["fill_order_type"]
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          employee_id: string
          file_url: string
          id: string
          signed_at: string | null
          version: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          file_url: string
          id?: string
          signed_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          file_url?: string
          id?: string
          signed_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          employee_id: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          employee_id: string
          expires_at: string
          id?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          employee_id?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invites_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          location_id: string
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          location_id: string
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          location_id?: string
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_entitlements: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          location_id: string
          module_key: Database["public"]["Enums"]["module_key"]
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          location_id: string
          module_key: Database["public"]["Enums"]["module_key"]
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          location_id?: string
          module_key?: Database["public"]["Enums"]["module_key"]
        }
        Relationships: [
          {
            foreignKeyName: "location_entitlements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_subscriptions: {
        Row: {
          created_at: string
          id: string
          location_id: string
          plan_key: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          plan_key?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          plan_key?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_subscriptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ob_tasks: {
        Row: {
          assigned_role: Database["public"]["Enums"]["location_role"] | null
          assigned_user_id: string | null
          candidate_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          id: string
          is_automated: boolean
          location_id: string
          phase_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role?: Database["public"]["Enums"]["location_role"] | null
          assigned_user_id?: string | null
          candidate_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_automated?: boolean
          location_id: string
          phase_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: Database["public"]["Enums"]["location_role"] | null
          assigned_user_id?: string | null
          candidate_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_automated?: boolean
          location_id?: string
          phase_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ob_tasks_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "onboarding_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ob_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ob_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "onboarding_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_candidates: {
        Row: {
          applied_at: string
          created_at: string
          current_phase_id: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          location_id: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
        }
        Insert: {
          applied_at?: string
          created_at?: string
          current_phase_id?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          location_id: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
        }
        Update: {
          applied_at?: string
          created_at?: string
          current_phase_id?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          location_id?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_candidates_current_phase_id_fkey"
            columns: ["current_phase_id"]
            isOneToOne: false
            referencedRelation: "onboarding_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_candidates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_events: {
        Row: {
          actor_id: string | null
          candidate_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          location_id: string
          triggered_by: string
        }
        Insert: {
          actor_id?: string | null
          candidate_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          location_id: string
          triggered_by?: string
        }
        Update: {
          actor_id?: string | null
          candidate_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          location_id?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_events_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "onboarding_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_phase_logs: {
        Row: {
          candidate_id: string
          created_by: string | null
          entered_at: string
          exited_at: string | null
          id: string
          notes: string | null
          phase_id: string
        }
        Insert: {
          candidate_id: string
          created_by?: string | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          notes?: string | null
          phase_id: string
        }
        Update: {
          candidate_id?: string
          created_by?: string | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          notes?: string | null
          phase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_phase_logs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "onboarding_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_phase_logs_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "onboarding_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_phases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location_id: string
          name: string
          sort_order: number
          task_templates: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          sort_order?: number
          task_templates?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          sort_order?: number
          task_templates?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_phases_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_settings: {
        Row: {
          created_at: string
          email_config: Json
          email_templates: Json
          id: string
          location_id: string
          reminder_config: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_config?: Json
          email_templates?: Json
          id?: string
          location_id: string
          reminder_config?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_config?: Json
          email_templates?: Json
          id?: string
          location_id?: string
          reminder_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          employee_id: string
          id: string
          key: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          key: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_contact: string | null
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_contact?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_contact?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payslips: {
        Row: {
          created_at: string
          employee_id: string
          file_url: string
          id: string
          period_end: string
          period_start: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          file_url: string
          id?: string
          period_end: string
          period_start: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          file_url?: string
          id?: string
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_set_permissions: {
        Row: {
          id: string
          permission_id: string
          permission_set_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          permission_set_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          permission_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_set_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_set_permissions_permission_set_id_fkey"
            columns: ["permission_set_id"]
            isOneToOne: false
            referencedRelation: "permission_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_sets: {
        Row: {
          created_at: string
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
        }
        Relationships: []
      }
      policy_sets: {
        Row: {
          absorb_transaction_fee: boolean
          cancel_cutoff_time: string | null
          cancel_policy_type: string
          cancel_window_hours: number | null
          created_at: string
          description: string | null
          discount_original_cents: number | null
          full_price_cents: number | null
          id: string
          is_active: boolean
          location_id: string
          name: string
          noshow_charge_amount_cents: number | null
          noshow_mark_after_minutes: number | null
          noshow_policy_type: string
          payment_amount_cents: number | null
          payment_type: string
          reconfirm_enabled: boolean
          reconfirm_hours_before: number | null
          reconfirm_required: boolean
          refund_percentage: number | null
          refund_type: string
          show_discount_price: boolean
          show_full_price: boolean
          updated_at: string
        }
        Insert: {
          absorb_transaction_fee?: boolean
          cancel_cutoff_time?: string | null
          cancel_policy_type?: string
          cancel_window_hours?: number | null
          created_at?: string
          description?: string | null
          discount_original_cents?: number | null
          full_price_cents?: number | null
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          noshow_charge_amount_cents?: number | null
          noshow_mark_after_minutes?: number | null
          noshow_policy_type?: string
          payment_amount_cents?: number | null
          payment_type?: string
          reconfirm_enabled?: boolean
          reconfirm_hours_before?: number | null
          reconfirm_required?: boolean
          refund_percentage?: number | null
          refund_type?: string
          show_discount_price?: boolean
          show_full_price?: boolean
          updated_at?: string
        }
        Update: {
          absorb_transaction_fee?: boolean
          cancel_cutoff_time?: string | null
          cancel_policy_type?: string
          cancel_window_hours?: number | null
          created_at?: string
          description?: string | null
          discount_original_cents?: number | null
          full_price_cents?: number | null
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          noshow_charge_amount_cents?: number | null
          noshow_mark_after_minutes?: number | null
          noshow_policy_type?: string
          payment_amount_cents?: number | null
          payment_type?: string
          reconfirm_enabled?: boolean
          reconfirm_hours_before?: number | null
          reconfirm_required?: boolean
          refund_percentage?: number | null
          refund_type?: string
          show_discount_price?: boolean
          show_full_price?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_sets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          platform_role: Database["public"]["Enums"]["platform_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      reservation_settings: {
        Row: {
          allow_multi_table: boolean
          auto_assign: boolean
          booking_cutoff_minutes: number
          created_at: string
          default_buffer_minutes: number
          default_duration_minutes: number
          default_squeeze_duration_minutes: number
          id: string
          location_id: string
          max_parallel_invites: number
          squeeze_enabled: boolean
          updated_at: string
          waitlist_auto_invite_enabled: boolean
        }
        Insert: {
          allow_multi_table?: boolean
          auto_assign?: boolean
          booking_cutoff_minutes?: number
          created_at?: string
          default_buffer_minutes?: number
          default_duration_minutes?: number
          default_squeeze_duration_minutes?: number
          id?: string
          location_id: string
          max_parallel_invites?: number
          squeeze_enabled?: boolean
          updated_at?: string
          waitlist_auto_invite_enabled?: boolean
        }
        Update: {
          allow_multi_table?: boolean
          auto_assign?: boolean
          booking_cutoff_minutes?: number
          created_at?: string
          default_buffer_minutes?: number
          default_duration_minutes?: number
          default_squeeze_duration_minutes?: number
          id?: string
          location_id?: string
          max_parallel_invites?: number
          squeeze_enabled?: boolean
          updated_at?: string
          waitlist_auto_invite_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reservation_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permission_sets: {
        Row: {
          id: string
          permission_set_id: string
          role: Database["public"]["Enums"]["location_role"]
        }
        Insert: {
          id?: string
          permission_set_id: string
          role: Database["public"]["Enums"]["location_role"]
        }
        Update: {
          id?: string
          permission_set_id?: string
          role?: Database["public"]["Enums"]["location_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permission_sets_permission_set_id_fkey"
            columns: ["permission_set_id"]
            isOneToOne: false
            referencedRelation: "permission_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_exceptions: {
        Row: {
          created_at: string
          exception_date: string
          exception_type: Database["public"]["Enums"]["shift_exception_type"]
          id: string
          label: string | null
          location_id: string
          notes: string | null
          override_end_time: string | null
          override_start_time: string | null
          shift_id: string | null
        }
        Insert: {
          created_at?: string
          exception_date: string
          exception_type: Database["public"]["Enums"]["shift_exception_type"]
          id?: string
          label?: string | null
          location_id: string
          notes?: string | null
          override_end_time?: string | null
          override_start_time?: string | null
          shift_id?: string | null
        }
        Update: {
          created_at?: string
          exception_date?: string
          exception_type?: Database["public"]["Enums"]["shift_exception_type"]
          id?: string
          label?: string | null
          location_id?: string
          notes?: string | null
          override_end_time?: string | null
          override_start_time?: string | null
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_exceptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_exceptions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_tickets: {
        Row: {
          area_display_names: Json | null
          areas: string[] | null
          channel_permissions: Json
          created_at: string
          id: string
          ignore_pacing: boolean
          is_active: boolean
          location_id: string
          override_buffer_minutes: number | null
          override_duration_minutes: number | null
          override_max_party: number | null
          override_min_party: number | null
          pacing_limit: number | null
          seating_limit_guests: number | null
          seating_limit_reservations: number | null
          shift_id: string
          show_area_name: boolean
          show_end_time: boolean
          squeeze_duration_minutes: number | null
          squeeze_enabled: boolean
          squeeze_gap_minutes: number | null
          squeeze_limit_per_shift: number | null
          squeeze_to_fixed_end_time: string | null
          ticket_id: string
          waitlist_enabled: boolean
        }
        Insert: {
          area_display_names?: Json | null
          areas?: string[] | null
          channel_permissions?: Json
          created_at?: string
          id?: string
          ignore_pacing?: boolean
          is_active?: boolean
          location_id: string
          override_buffer_minutes?: number | null
          override_duration_minutes?: number | null
          override_max_party?: number | null
          override_min_party?: number | null
          pacing_limit?: number | null
          seating_limit_guests?: number | null
          seating_limit_reservations?: number | null
          shift_id: string
          show_area_name?: boolean
          show_end_time?: boolean
          squeeze_duration_minutes?: number | null
          squeeze_enabled?: boolean
          squeeze_gap_minutes?: number | null
          squeeze_limit_per_shift?: number | null
          squeeze_to_fixed_end_time?: string | null
          ticket_id: string
          waitlist_enabled?: boolean
        }
        Update: {
          area_display_names?: Json | null
          areas?: string[] | null
          channel_permissions?: Json
          created_at?: string
          id?: string
          ignore_pacing?: boolean
          is_active?: boolean
          location_id?: string
          override_buffer_minutes?: number | null
          override_duration_minutes?: number | null
          override_max_party?: number | null
          override_min_party?: number | null
          pacing_limit?: number | null
          seating_limit_guests?: number | null
          seating_limit_reservations?: number | null
          shift_id?: string
          show_area_name?: boolean
          show_end_time?: boolean
          squeeze_duration_minutes?: number | null
          squeeze_enabled?: boolean
          squeeze_gap_minutes?: number | null
          squeeze_limit_per_shift?: number | null
          squeeze_to_fixed_end_time?: string | null
          ticket_id?: string
          waitlist_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "shift_tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_tickets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          arrival_interval_minutes: number
          color: string
          created_at: string
          days_of_week: number[]
          end_time: string
          id: string
          is_active: boolean
          location_id: string
          name: string
          short_name: string
          sort_order: number
          start_time: string
          updated_at: string
        }
        Insert: {
          arrival_interval_minutes?: number
          color?: string
          created_at?: string
          days_of_week?: number[]
          end_time: string
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          short_name: string
          sort_order?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          arrival_interval_minutes?: number
          color?: string
          created_at?: string
          days_of_week?: number[]
          end_time?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          short_name?: string
          sort_order?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_preferences: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          muted: boolean | null
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          muted?: boolean | null
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          muted?: boolean | null
          signal_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_preferences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          action_path: string | null
          actionable: boolean | null
          cooldown_until: string | null
          created_at: string | null
          dedup_key: string
          dismissed_at: string | null
          dismissed_by: string | null
          id: string
          kind: string
          location_id: string
          message: string | null
          module: string
          organization_id: string
          payload: Json | null
          priority: number | null
          resolved_at: string | null
          severity: string
          signal_type: string
          source_signal_ids: string[] | null
          status: string
          title: string
        }
        Insert: {
          action_path?: string | null
          actionable?: boolean | null
          cooldown_until?: string | null
          created_at?: string | null
          dedup_key: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          kind?: string
          location_id: string
          message?: string | null
          module: string
          organization_id: string
          payload?: Json | null
          priority?: number | null
          resolved_at?: string | null
          severity?: string
          signal_type: string
          source_signal_ids?: string[] | null
          status?: string
          title: string
        }
        Update: {
          action_path?: string | null
          actionable?: boolean | null
          cooldown_until?: string | null
          created_at?: string | null
          dedup_key?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          kind?: string
          location_id?: string
          message?: string | null
          module?: string
          organization_id?: string
          payload?: Json | null
          priority?: number | null
          resolved_at?: string | null
          severity?: string
          signal_type?: string
          source_signal_ids?: string[] | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      table_group_members: {
        Row: {
          id: string
          sort_order: number
          table_group_id: string
          table_id: string
        }
        Insert: {
          id?: string
          sort_order?: number
          table_group_id: string
          table_id: string
        }
        Update: {
          id?: string
          sort_order?: number
          table_group_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_group_members_table_group_id_fkey"
            columns: ["table_group_id"]
            isOneToOne: false
            referencedRelation: "table_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_group_members_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      table_groups: {
        Row: {
          combined_max_capacity: number
          combined_min_capacity: number
          created_at: string
          extra_seats: number
          id: string
          is_active: boolean
          is_online_bookable: boolean
          is_system_generated: boolean
          location_id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          combined_max_capacity?: number
          combined_min_capacity?: number
          created_at?: string
          extra_seats?: number
          id?: string
          is_active?: boolean
          is_online_bookable?: boolean
          is_system_generated?: boolean
          location_id: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          combined_max_capacity?: number
          combined_min_capacity?: number
          created_at?: string
          extra_seats?: number
          id?: string
          is_active?: boolean
          is_online_bookable?: boolean
          is_system_generated?: boolean
          location_id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_groups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          area_id: string
          assign_priority: number
          created_at: string
          display_label: string
          id: string
          is_active: boolean
          is_joinable: boolean
          is_online_bookable: boolean
          join_priority: number
          location_id: string
          max_capacity: number
          min_capacity: number
          sort_order: number
          table_number: number
          updated_at: string
        }
        Insert: {
          area_id: string
          assign_priority?: number
          created_at?: string
          display_label?: string
          id?: string
          is_active?: boolean
          is_joinable?: boolean
          is_online_bookable?: boolean
          join_priority?: number
          location_id: string
          max_capacity?: number
          min_capacity?: number
          sort_order?: number
          table_number: number
          updated_at?: string
        }
        Update: {
          area_id?: string
          assign_priority?: number
          created_at?: string
          display_label?: string
          id?: string
          is_active?: boolean
          is_joinable?: boolean
          is_online_bookable?: boolean
          join_priority?: number
          location_id?: string
          max_capacity?: number
          min_capacity?: number
          sort_order?: number
          table_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          booking_window_max_days: number | null
          booking_window_min_minutes: number | null
          buffer_minutes: number
          color: string
          created_at: string
          description: string | null
          display_title: string
          duration_minutes: number
          friend_url_token: string | null
          highlight_order: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_default: boolean
          is_highlighted: boolean
          large_party_min_minutes: number | null
          large_party_threshold: number | null
          location_id: string
          max_party_size: number
          metadata: Json
          min_party_size: number
          name: string
          policy_set_id: string | null
          short_description: string | null
          sort_order: number
          status: string
          tags: Json
          ticket_type: string
          updated_at: string
        }
        Insert: {
          booking_window_max_days?: number | null
          booking_window_min_minutes?: number | null
          buffer_minutes?: number
          color?: string
          created_at?: string
          description?: string | null
          display_title: string
          duration_minutes?: number
          friend_url_token?: string | null
          highlight_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          is_highlighted?: boolean
          large_party_min_minutes?: number | null
          large_party_threshold?: number | null
          location_id: string
          max_party_size?: number
          metadata?: Json
          min_party_size?: number
          name: string
          policy_set_id?: string | null
          short_description?: string | null
          sort_order?: number
          status?: string
          tags?: Json
          ticket_type?: string
          updated_at?: string
        }
        Update: {
          booking_window_max_days?: number | null
          booking_window_min_minutes?: number | null
          buffer_minutes?: number
          color?: string
          created_at?: string
          description?: string | null
          display_title?: string
          duration_minutes?: number
          friend_url_token?: string | null
          highlight_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          is_highlighted?: boolean
          large_party_min_minutes?: number | null
          large_party_threshold?: number | null
          location_id?: string
          max_party_size?: number
          metadata?: Json
          min_party_size?: number
          name?: string
          policy_set_id?: string | null
          short_description?: string | null
          sort_order?: number
          status?: string
          tags?: Json
          ticket_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_policy_set_id_fkey"
            columns: ["policy_set_id"]
            isOneToOne: false
            referencedRelation: "policy_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_location_roles: {
        Row: {
          created_at: string
          id: string
          location_id: string
          role: Database["public"]["Enums"]["location_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          role: Database["public"]["Enums"]["location_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          role?: Database["public"]["Enums"]["location_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_roles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          error: string | null
          id: string
          idempotency_key: string
          result: Json | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error?: string | null
          id?: string
          idempotency_key: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          error?: string | null
          id?: string
          idempotency_key?: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_area: { Args: { _area_id: string }; Returns: Json }
      get_bookable_tickets: {
        Args: { _date: string; _location_id: string }
        Returns: {
          buffer_minutes: number
          color: string
          description: string
          display_title: string
          duration_minutes: number
          friend_url_token: string
          highlight_order: number
          id: string
          image_url: string
          is_default: boolean
          is_highlighted: boolean
          max_party_size: number
          metadata: Json
          min_party_size: number
          name: string
          policy_set_id: string
          short_description: string
          sort_order: number
          tags: Json
          ticket_type: string
        }[]
      }
      get_effective_shift_schedule: {
        Args: { _date: string; _location_id: string }
        Returns: {
          arrival_interval_minutes: number
          color: string
          end_time: string
          exception_label: string
          shift_id: string
          shift_name: string
          short_name: string
          start_time: string
          status: string
        }[]
      }
      get_employee_id: {
        Args: { _location_id: string; _user_id: string }
        Returns: string
      }
      get_location_for_area: { Args: { _area_id: string }; Returns: string }
      get_location_for_table_group: {
        Args: { _table_group_id: string }
        Returns: string
      }
      get_next_area_sort_order: {
        Args: { _location_id: string }
        Returns: number
      }
      get_next_table_sort_order: { Args: { _area_id: string }; Returns: number }
      get_next_ticket_sort_order: {
        Args: { _location_id: string }
        Returns: number
      }
      get_shift_ticket_config: {
        Args: { _shift_id: string; _ticket_id: string }
        Returns: Json
      }
      get_ticket_with_policy: { Args: { _ticket_id: string }; Returns: Json }
      get_user_context: {
        Args: { _location_id: string; _user_id: string }
        Returns: Json
      }
      get_user_location_role: {
        Args: { _location_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["location_role"]
      }
      get_user_permissions: {
        Args: { _location_id: string; _user_id: string }
        Returns: string[]
      }
      is_employee_at_location: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_platform_user: { Args: { _user_id: string }; Returns: boolean }
      reorder_areas: {
        Args: { _area_ids: string[]; _location_id: string }
        Returns: Json
      }
      reorder_shifts: {
        Args: { _location_id: string; _shift_ids: string[] }
        Returns: Json
      }
      reorder_tables: {
        Args: { _area_id: string; _table_ids: string[] }
        Returns: Json
      }
      reorder_tickets: {
        Args: { _location_id: string; _ticket_ids: string[] }
        Returns: Json
      }
      restore_table: {
        Args: { _new_display_label?: string; _table_id: string }
        Returns: Json
      }
      swap_area_sort_order: {
        Args: { _area_a_id: string; _area_b_id: string }
        Returns: undefined
      }
      swap_table_sort_order: {
        Args: { _table_a_id: string; _table_b_id: string }
        Returns: undefined
      }
      user_has_location_access: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { _location_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      user_has_role_in_location: {
        Args: {
          _location_id: string
          _roles: Database["public"]["Enums"]["location_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      user_in_organization: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      employee_status: "invited" | "active" | "archived"
      fill_order_type: "first_available" | "round_robin" | "priority" | "custom"
      location_role: "owner" | "manager" | "service" | "kitchen" | "finance"
      module_key:
        | "reservations"
        | "kitchen"
        | "finance"
        | "hrm"
        | "marketing"
        | "settings"
        | "onboarding"
      onboarding_status:
        | "active"
        | "hired"
        | "rejected"
        | "withdrawn"
        | "no_response"
        | "expired"
      platform_role: "platform_admin" | "support"
      shift_exception_type: "closed" | "modified" | "special"
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
      employee_status: ["invited", "active", "archived"],
      fill_order_type: ["first_available", "round_robin", "priority", "custom"],
      location_role: ["owner", "manager", "service", "kitchen", "finance"],
      module_key: [
        "reservations",
        "kitchen",
        "finance",
        "hrm",
        "marketing",
        "settings",
        "onboarding",
      ],
      onboarding_status: [
        "active",
        "hired",
        "rejected",
        "withdrawn",
        "no_response",
        "expired",
      ],
      platform_role: ["platform_admin", "support"],
      shift_exception_type: ["closed", "modified", "special"],
    },
  },
} as const
