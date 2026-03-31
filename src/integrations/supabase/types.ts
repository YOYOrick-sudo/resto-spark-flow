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
      agent_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          beschrijving: string | null
          created_at: string | null
          goedgekeurd_door: string | null
          goedgekeurd_op: string | null
          id: string
          location_id: string
          referentie_id: string | null
          referentie_type: string | null
          status: string | null
          title: string
          verloopt_op: string | null
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          beschrijving?: string | null
          created_at?: string | null
          goedgekeurd_door?: string | null
          goedgekeurd_op?: string | null
          id?: string
          location_id: string
          referentie_id?: string | null
          referentie_type?: string | null
          status?: string | null
          title: string
          verloopt_op?: string | null
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          beschrijving?: string | null
          created_at?: string | null
          goedgekeurd_door?: string | null
          goedgekeurd_op?: string | null
          id?: string
          location_id?: string
          referentie_id?: string | null
          referentie_type?: string | null
          status?: string | null
          title?: string
          verloopt_op?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_goedgekeurd_door_fkey"
            columns: ["goedgekeurd_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_configurations: {
        Row: {
          autonomy_level: string
          configuration: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          location_id: string
          task_key: string
          updated_at: string | null
        }
        Insert: {
          autonomy_level?: string
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          location_id: string
          task_key: string
          updated_at?: string | null
        }
        Update: {
          autonomy_level?: string
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          location_id?: string
          task_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_configurations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_feedback: {
        Row: {
          action_id: string | null
          correction_data: Json | null
          created_at: string | null
          feedback_type: string
          given_by: string | null
          id: string
          location_id: string
        }
        Insert: {
          action_id?: string | null
          correction_data?: Json | null
          created_at?: string | null
          feedback_type: string
          given_by?: string | null
          id?: string
          location_id: string
        }
        Update: {
          action_id?: string | null
          correction_data?: Json | null
          created_at?: string | null
          feedback_type?: string
          given_by?: string | null
          id?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_feedback_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "agent_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cache: {
        Row: {
          created_at: string | null
          expires_at: string
          feature: string
          hit_count: number | null
          id: string
          location_id: string
          model: string
          query_text: string
          response: Json
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          feature: string
          hit_count?: number | null
          id?: string
          location_id: string
          model: string
          query_text: string
          response: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          feature?: string
          hit_count?: number | null
          id?: string
          location_id?: string
          model?: string
          query_text?: string
          response?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_logs: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          error_message: string | null
          feature: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          location_id: string
          model: string
          output_tokens: number | null
          status: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string | null
          error_message?: string | null
          feature: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          location_id: string
          model: string
          output_tokens?: number | null
          status?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string | null
          error_message?: string | null
          feature?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          location_id?: string
          model?: string
          output_tokens?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          changes: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          location_id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string
          changes?: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          location_id: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          location_id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_settings: {
        Row: {
          brand_color: string | null
          created_at: string
          footer_text: string | null
          id: string
          location_id: string
          logo_url: string | null
          reply_to: string | null
          sender_name: string | null
          updated_at: string
        }
        Insert: {
          brand_color?: string | null
          created_at?: string
          footer_text?: string | null
          id?: string
          location_id: string
          logo_url?: string | null
          reply_to?: string | null
          sender_name?: string | null
          updated_at?: string
        }
        Update: {
          brand_color?: string | null
          created_at?: string
          footer_text?: string | null
          id?: string
          location_id?: string
          logo_url?: string | null
          reply_to?: string | null
          sender_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
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
      conversations: {
        Row: {
          channel: string
          channel_contact_id: string | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          customer_id: string | null
          handled_by: string | null
          id: string
          last_message_at: string | null
          last_notification_at: string | null
          location_id: string
          reservation_id: string | null
          service_window_expires_at: string | null
          status: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          channel?: string
          channel_contact_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          handled_by?: string | null
          id?: string
          last_message_at?: string | null
          last_notification_at?: string | null
          location_id: string
          reservation_id?: string | null
          service_window_expires_at?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          channel?: string
          channel_contact_id?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          customer_id?: string | null
          handled_by?: string | null
          id?: string
          last_message_at?: string | null
          last_notification_at?: string | null
          location_id?: string
          reservation_id?: string | null
          service_window_expires_at?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_module_events: {
        Row: {
          consumed_by: Json
          created_at: string
          event_type: string
          expires_at: string
          id: string
          location_id: string
          payload: Json
          source_module: string
        }
        Insert: {
          consumed_by?: Json
          created_at?: string
          event_type: string
          expires_at: string
          id?: string
          location_id: string
          payload?: Json
          source_module: string
        }
        Update: {
          consumed_by?: Json
          created_at?: string
          event_type?: string
          expires_at?: string
          id?: string
          location_id?: string
          payload?: Json
          source_module?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_module_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          average_spend: number | null
          birthday: string | null
          created_at: string
          dietary_preferences: Json | null
          email: string | null
          favorite_items: Json | null
          first_name: string
          first_visit_at: string | null
          id: string
          language: string
          last_name: string
          last_visit_at: string | null
          location_id: string
          notes: string | null
          phone_number: string | null
          tags: Json
          total_cancellations: number
          total_no_shows: number
          total_visits: number
          updated_at: string
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          average_spend?: number | null
          birthday?: string | null
          created_at?: string
          dietary_preferences?: Json | null
          email?: string | null
          favorite_items?: Json | null
          first_name: string
          first_visit_at?: string | null
          id?: string
          language?: string
          last_name: string
          last_visit_at?: string | null
          location_id: string
          notes?: string | null
          phone_number?: string | null
          tags?: Json
          total_cancellations?: number
          total_no_shows?: number
          total_visits?: number
          updated_at?: string
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          average_spend?: number | null
          birthday?: string | null
          created_at?: string
          dietary_preferences?: Json | null
          email?: string | null
          favorite_items?: Json | null
          first_name?: string
          first_visit_at?: string | null
          id?: string
          language?: string
          last_name?: string
          last_visit_at?: string | null
          location_id?: string
          notes?: string | null
          phone_number?: string | null
          tags?: Json
          total_cancellations?: number
          total_no_shows?: number
          total_visits?: number
          updated_at?: string
          whatsapp_opt_in?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      knowledge_base: {
        Row: {
          answer: string
          category: string
          created_at: string | null
          hit_count: number | null
          id: string
          is_active: boolean | null
          location_id: string
          question: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          category: string
          created_at?: string | null
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          location_id: string
          question?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string | null
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          location_id?: string
          question?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_location_id_fkey"
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
          brand_color_accent: string | null
          brand_color_primary: string | null
          brand_color_secondary: string | null
          created_at: string
          description_short: string | null
          google_place_id: string | null
          guest_greeting: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          organization_id: string
          slug: string
          timezone: string
          tone_of_voice: string | null
          tripadvisor_url: string | null
          updated_at: string
          whatsapp_business_account_id: string | null
          whatsapp_enabled: boolean | null
          whatsapp_phone_number_id: string | null
        }
        Insert: {
          brand_color_accent?: string | null
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          created_at?: string
          description_short?: string | null
          google_place_id?: string | null
          guest_greeting?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          organization_id: string
          slug: string
          timezone?: string
          tone_of_voice?: string | null
          tripadvisor_url?: string | null
          updated_at?: string
          whatsapp_business_account_id?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone_number_id?: string | null
        }
        Update: {
          brand_color_accent?: string | null
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          created_at?: string
          description_short?: string | null
          google_place_id?: string | null
          guest_greeting?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          organization_id?: string
          slug?: string
          timezone?: string
          tone_of_voice?: string | null
          tripadvisor_url?: string | null
          updated_at?: string
          whatsapp_business_account_id?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone_number_id?: string | null
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
      marketing_automation_flows: {
        Row: {
          created_at: string
          flow_type: string
          id: string
          is_active: boolean
          location_id: string
          name: string
          stats: Json
          steps: Json
          template_id: string | null
          trigger_config: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          flow_type?: string
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          stats?: Json
          steps?: Json
          template_id?: string | null
          trigger_config?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          flow_type?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          stats?: Json
          steps?: Json
          template_id?: string | null
          trigger_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_automation_flows_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_automation_flows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_brand_intelligence: {
        Row: {
          caption_style_profile: string | null
          content_type_performance: Json | null
          created_at: string
          current_weekplan: Json | null
          email_tone_profile: string | null
          engagement_baseline: Json | null
          id: string
          last_analysis_at: string | null
          learning_stage: string
          location_id: string
          optimal_post_times: Json | null
          posts_analyzed: number
          review_response_profile: string | null
          top_hashtag_sets: Json | null
          updated_at: string
          visual_style_profile: string | null
          weekly_best_content_type: string | null
        }
        Insert: {
          caption_style_profile?: string | null
          content_type_performance?: Json | null
          created_at?: string
          current_weekplan?: Json | null
          email_tone_profile?: string | null
          engagement_baseline?: Json | null
          id?: string
          last_analysis_at?: string | null
          learning_stage?: string
          location_id: string
          optimal_post_times?: Json | null
          posts_analyzed?: number
          review_response_profile?: string | null
          top_hashtag_sets?: Json | null
          updated_at?: string
          visual_style_profile?: string | null
          weekly_best_content_type?: string | null
        }
        Update: {
          caption_style_profile?: string | null
          content_type_performance?: Json | null
          created_at?: string
          current_weekplan?: Json | null
          email_tone_profile?: string | null
          engagement_baseline?: Json | null
          id?: string
          last_analysis_at?: string | null
          learning_stage?: string
          location_id?: string
          optimal_post_times?: Json | null
          posts_analyzed?: number
          review_response_profile?: string | null
          top_hashtag_sets?: Json | null
          updated_at?: string
          visual_style_profile?: string | null
          weekly_best_content_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_brand_intelligence_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_brand_kit: {
        Row: {
          accent_color: string | null
          created_at: string
          default_greeting: string | null
          default_send_time: string
          default_signature: string | null
          double_opt_in_enabled: boolean
          font_body: string | null
          font_heading: string | null
          gdpr_consent_text: string | null
          id: string
          location_id: string
          logo_url: string | null
          marketing_reply_to: string | null
          marketing_sender_name: string | null
          max_email_frequency_days: number
          primary_color: string | null
          secondary_color: string | null
          social_handles: Json | null
          tone_description: string | null
          tone_of_voice: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          default_greeting?: string | null
          default_send_time?: string
          default_signature?: string | null
          double_opt_in_enabled?: boolean
          font_body?: string | null
          font_heading?: string | null
          gdpr_consent_text?: string | null
          id?: string
          location_id: string
          logo_url?: string | null
          marketing_reply_to?: string | null
          marketing_sender_name?: string | null
          max_email_frequency_days?: number
          primary_color?: string | null
          secondary_color?: string | null
          social_handles?: Json | null
          tone_description?: string | null
          tone_of_voice?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          default_greeting?: string | null
          default_send_time?: string
          default_signature?: string | null
          double_opt_in_enabled?: boolean
          font_body?: string | null
          font_heading?: string | null
          gdpr_consent_text?: string | null
          id?: string
          location_id?: string
          logo_url?: string | null
          marketing_reply_to?: string | null
          marketing_sender_name?: string | null
          max_email_frequency_days?: number
          primary_color?: string | null
          secondary_color?: string | null
          social_handles?: Json | null
          tone_description?: string | null
          tone_of_voice?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_brand_kit_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaign_analytics: {
        Row: {
          bounced_count: number
          campaign_id: string
          channel: string
          clicked_count: number
          delivered_count: number
          id: string
          location_id: string
          opened_count: number
          reservations_attributed: number
          revenue_attributed: number
          sent_count: number
          social_engagement: number
          social_impressions: number
          social_reach: number
          social_saves: number
          unsubscribed_count: number
          updated_at: string
        }
        Insert: {
          bounced_count?: number
          campaign_id: string
          channel?: string
          clicked_count?: number
          delivered_count?: number
          id?: string
          location_id: string
          opened_count?: number
          reservations_attributed?: number
          revenue_attributed?: number
          sent_count?: number
          social_engagement?: number
          social_impressions?: number
          social_reach?: number
          social_saves?: number
          unsubscribed_count?: number
          updated_at?: string
        }
        Update: {
          bounced_count?: number
          campaign_id?: string
          channel?: string
          clicked_count?: number
          delivered_count?: number
          id?: string
          location_id?: string
          opened_count?: number
          reservations_attributed?: number
          revenue_attributed?: number
          sent_count?: number
          social_engagement?: number
          social_impressions?: number
          social_reach?: number
          social_saves?: number
          unsubscribed_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaign_analytics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          ai_generated: boolean
          campaign_type: string
          content_html: string | null
          content_social: Json | null
          content_text: string | null
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          name: string
          scheduled_at: string | null
          segment_filter: Json | null
          segment_id: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string | null
          trigger_event: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          campaign_type?: string
          content_html?: string | null
          content_social?: Json | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          name: string
          scheduled_at?: string | null
          segment_filter?: Json | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string | null
          trigger_event?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          campaign_type?: string
          content_html?: string | null
          content_social?: Json | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          name?: string
          scheduled_at?: string | null
          segment_filter?: Json | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string | null
          trigger_event?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "marketing_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_coaching_tips: {
        Row: {
          created_at: string
          description: string
          id: string
          location_id: string
          priority: number
          status: string
          tip_type: string
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          location_id: string
          priority?: number
          status?: string
          tip_type?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          location_id?: string
          priority?: number
          status?: string
          tip_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_coaching_tips_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_contact_preferences: {
        Row: {
          channel: string
          consent_source: string | null
          created_at: string
          customer_id: string
          double_opt_in_confirmed: boolean
          double_opt_in_sent_at: string | null
          double_opt_in_token: string | null
          id: string
          location_id: string
          opted_in: boolean
          opted_in_at: string | null
          opted_out_at: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          consent_source?: string | null
          created_at?: string
          customer_id: string
          double_opt_in_confirmed?: boolean
          double_opt_in_sent_at?: string | null
          double_opt_in_token?: string | null
          id?: string
          location_id: string
          opted_in?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          consent_source?: string | null
          created_at?: string
          customer_id?: string
          double_opt_in_confirmed?: boolean
          double_opt_in_sent_at?: string | null
          double_opt_in_token?: string | null
          id?: string
          location_id?: string
          opted_in?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_contact_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_contact_preferences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content_ideas: {
        Row: {
          converted_to_campaign_id: string | null
          created_at: string
          description: string | null
          id: string
          idea_type: string
          location_id: string
          priority: number
          source: string
          source_event_id: string | null
          status: string
          suggested_content: Json | null
          suggested_date: string | null
          suggested_segment_id: string | null
          title: string
        }
        Insert: {
          converted_to_campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          idea_type?: string
          location_id: string
          priority?: number
          source?: string
          source_event_id?: string | null
          status?: string
          suggested_content?: Json | null
          suggested_date?: string | null
          suggested_segment_id?: string | null
          title: string
        }
        Update: {
          converted_to_campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          idea_type?: string
          location_id?: string
          priority?: number
          source?: string
          source_event_id?: string | null
          status?: string
          suggested_content?: Json | null
          suggested_date?: string | null
          suggested_segment_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_ideas_converted_to_campaign_id_fkey"
            columns: ["converted_to_campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_ideas_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_ideas_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "cross_module_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_ideas_suggested_segment_id_fkey"
            columns: ["suggested_segment_id"]
            isOneToOne: false
            referencedRelation: "marketing_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content_series: {
        Row: {
          content_type: string | null
          created_at: string
          description: string | null
          episode_count: number
          frequency: string
          id: string
          is_active: boolean
          location_id: string
          name: string
          preferred_day: string | null
          template_prompt: string | null
          updated_at: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          description?: string | null
          episode_count?: number
          frequency?: string
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          preferred_day?: string | null
          template_prompt?: string | null
          updated_at?: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          description?: string | null
          episode_count?: number
          frequency?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          preferred_day?: string | null
          template_prompt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_series_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_email_log: {
        Row: {
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          flow_id: string | null
          id: string
          location_id: string
          opened_at: string | null
          resend_message_id: string | null
          sent_at: string
          status: string
          unsubscribed_at: string | null
        }
        Insert: {
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          flow_id?: string | null
          id?: string
          location_id: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          unsubscribed_at?: string | null
        }
        Update: {
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          flow_id?: string | null
          id?: string
          location_id?: string
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_email_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_email_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_email_log_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "marketing_automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_email_log_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_popup_config: {
        Row: {
          button_text: string
          created_at: string
          custom_button_url: string | null
          description: string
          exit_intent_enabled: boolean
          featured_ticket_id: string | null
          gdpr_text: string
          headline: string
          id: string
          is_active: boolean
          location_id: string
          name: string
          popup_type: string
          priority: number
          schedule_end_at: string | null
          schedule_start_at: string | null
          sticky_bar_enabled: boolean
          sticky_bar_position: string
          success_message: string
          timed_popup_delay_seconds: number
          timed_popup_enabled: boolean
          updated_at: string
        }
        Insert: {
          button_text?: string
          created_at?: string
          custom_button_url?: string | null
          description?: string
          exit_intent_enabled?: boolean
          featured_ticket_id?: string | null
          gdpr_text?: string
          headline?: string
          id?: string
          is_active?: boolean
          location_id: string
          name?: string
          popup_type?: string
          priority?: number
          schedule_end_at?: string | null
          schedule_start_at?: string | null
          sticky_bar_enabled?: boolean
          sticky_bar_position?: string
          success_message?: string
          timed_popup_delay_seconds?: number
          timed_popup_enabled?: boolean
          updated_at?: string
        }
        Update: {
          button_text?: string
          created_at?: string
          custom_button_url?: string | null
          description?: string
          exit_intent_enabled?: boolean
          featured_ticket_id?: string | null
          gdpr_text?: string
          headline?: string
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          popup_type?: string
          priority?: number
          schedule_end_at?: string | null
          schedule_start_at?: string | null
          sticky_bar_enabled?: boolean
          sticky_bar_position?: string
          success_message?: string
          timed_popup_delay_seconds?: number
          timed_popup_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_popup_config_featured_ticket_id_fkey"
            columns: ["featured_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_popup_config_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_popup_suggestions: {
        Row: {
          button_text: string | null
          created_at: string | null
          custom_button_url: string | null
          description: string
          dismiss_reason: string | null
          featured_ticket_id: string | null
          generated_at: string | null
          headline: string
          id: string
          location_id: string
          popup_type: string
          reasoning: string
          responded_at: string | null
          status: string
        }
        Insert: {
          button_text?: string | null
          created_at?: string | null
          custom_button_url?: string | null
          description: string
          dismiss_reason?: string | null
          featured_ticket_id?: string | null
          generated_at?: string | null
          headline: string
          id?: string
          location_id: string
          popup_type?: string
          reasoning: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          button_text?: string | null
          created_at?: string | null
          custom_button_url?: string | null
          description?: string
          dismiss_reason?: string | null
          featured_ticket_id?: string | null
          generated_at?: string | null
          headline?: string
          id?: string
          location_id?: string
          popup_type?: string
          reasoning?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_popup_suggestions_featured_ticket_id_fkey"
            columns: ["featured_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_popup_suggestions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_reviews: {
        Row: {
          ai_original_response: string | null
          ai_suggested_response: string | null
          author_name: string
          author_photo_url: string | null
          created_at: string
          external_review_id: string
          id: string
          is_featured: boolean
          location_id: string
          operator_edited: boolean
          platform: string
          published_at: string | null
          rating: number
          responded_at: string | null
          response_text: string | null
          review_language: string | null
          review_text: string | null
          sentiment: string | null
          sentiment_aspects: Json | null
          updated_at: string
        }
        Insert: {
          ai_original_response?: string | null
          ai_suggested_response?: string | null
          author_name?: string
          author_photo_url?: string | null
          created_at?: string
          external_review_id: string
          id?: string
          is_featured?: boolean
          location_id: string
          operator_edited?: boolean
          platform: string
          published_at?: string | null
          rating: number
          responded_at?: string | null
          response_text?: string | null
          review_language?: string | null
          review_text?: string | null
          sentiment?: string | null
          sentiment_aspects?: Json | null
          updated_at?: string
        }
        Update: {
          ai_original_response?: string | null
          ai_suggested_response?: string | null
          author_name?: string
          author_photo_url?: string | null
          created_at?: string
          external_review_id?: string
          id?: string
          is_featured?: boolean
          location_id?: string
          operator_edited?: boolean
          platform?: string
          published_at?: string | null
          rating?: number
          responded_at?: string | null
          response_text?: string | null
          review_language?: string | null
          review_text?: string | null
          sentiment?: string | null
          sentiment_aspects?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_segments: {
        Row: {
          created_at: string
          description: string | null
          filter_rules: Json
          guest_count: number | null
          guest_count_updated_at: string | null
          id: string
          is_dynamic: boolean
          is_system: boolean
          last_campaign_at: string | null
          location_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filter_rules?: Json
          guest_count?: number | null
          guest_count_updated_at?: string | null
          id?: string
          is_dynamic?: boolean
          is_system?: boolean
          last_campaign_at?: string | null
          location_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filter_rules?: Json
          guest_count?: number | null
          guest_count_updated_at?: string | null
          id?: string
          is_dynamic?: boolean
          is_system?: boolean
          last_campaign_at?: string | null
          location_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_segments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_social_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          page_id: string | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          page_id?: string | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          page_id?: string | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_social_accounts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_social_posts: {
        Row: {
          ab_test_group: string | null
          ab_test_id: string | null
          ai_generated: boolean
          ai_original_caption: string | null
          alternative_caption: string | null
          analytics: Json
          campaign_id: string | null
          content_text: string | null
          content_type_tag: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          external_post_id: string | null
          hashtags: string[]
          id: string
          is_recurring: boolean
          location_id: string
          media_urls: string[]
          operator_edited: boolean
          platform: string
          post_type: string
          published_at: string | null
          recurrence_rule: Json | null
          scheduled_at: string | null
          status: string
        }
        Insert: {
          ab_test_group?: string | null
          ab_test_id?: string | null
          ai_generated?: boolean
          ai_original_caption?: string | null
          alternative_caption?: string | null
          analytics?: Json
          campaign_id?: string | null
          content_text?: string | null
          content_type_tag?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          external_post_id?: string | null
          hashtags?: string[]
          id?: string
          is_recurring?: boolean
          location_id: string
          media_urls?: string[]
          operator_edited?: boolean
          platform: string
          post_type?: string
          published_at?: string | null
          recurrence_rule?: Json | null
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          ab_test_group?: string | null
          ab_test_id?: string | null
          ai_generated?: boolean
          ai_original_caption?: string | null
          alternative_caption?: string | null
          analytics?: Json
          campaign_id?: string | null
          content_text?: string | null
          content_type_tag?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          external_post_id?: string | null
          hashtags?: string[]
          id?: string
          is_recurring?: boolean
          location_id?: string
          media_urls?: string[]
          operator_edited?: boolean
          platform?: string
          post_type?: string
          published_at?: string | null
          recurrence_rule?: Json | null
          scheduled_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_social_posts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_templates: {
        Row: {
          category: string
          content_html: string | null
          content_text: string | null
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          location_id: string | null
          name: string
          template_type: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          location_id?: string | null
          name: string
          template_type?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          location_id?: string | null
          name?: string
          template_type?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          buttons: Json | null
          channel: string
          created_at: string | null
          footer: string | null
          header: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          language: string
          location_id: string
          subject: string | null
          template_key: string
          updated_at: string | null
          wa_category: string | null
          wa_status: string | null
          wa_template_id: string | null
          wa_template_name: string | null
        }
        Insert: {
          body: string
          buttons?: Json | null
          channel?: string
          created_at?: string | null
          footer?: string | null
          header?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string
          location_id: string
          subject?: string | null
          template_key: string
          updated_at?: string | null
          wa_category?: string | null
          wa_status?: string | null
          wa_template_id?: string | null
          wa_template_name?: string | null
        }
        Update: {
          body?: string
          buttons?: Json | null
          channel?: string
          created_at?: string | null
          footer?: string | null
          header?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string
          location_id?: string
          subject?: string | null
          template_key?: string
          updated_at?: string | null
          wa_category?: string | null
          wa_status?: string | null
          wa_template_id?: string | null
          wa_template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel: string
          content: string | null
          content_rich: Json | null
          conversation_id: string
          created_at: string | null
          direction: string
          id: string
          is_ai_generated: boolean | null
          location_id: string
          message_type: string
          read_at: string | null
          reservation_id: string | null
          sent_by: string | null
          template_name: string | null
          template_params: Json | null
          wa_error_code: string | null
          wa_message_id: string | null
          wa_status: string | null
        }
        Insert: {
          channel?: string
          content?: string | null
          content_rich?: Json | null
          conversation_id: string
          created_at?: string | null
          direction?: string
          id?: string
          is_ai_generated?: boolean | null
          location_id: string
          message_type?: string
          read_at?: string | null
          reservation_id?: string | null
          sent_by?: string | null
          template_name?: string | null
          template_params?: Json | null
          wa_error_code?: string | null
          wa_message_id?: string | null
          wa_status?: string | null
        }
        Update: {
          channel?: string
          content?: string | null
          content_rich?: Json | null
          conversation_id?: string
          created_at?: string | null
          direction?: string
          id?: string
          is_ai_generated?: boolean | null
          location_id?: string
          message_type?: string
          read_at?: string | null
          reservation_id?: string | null
          sent_by?: string | null
          template_name?: string | null
          template_params?: Json | null
          wa_error_code?: string | null
          wa_message_id?: string | null
          wa_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_config: {
        Row: {
          active_window_end: string | null
          active_window_start: string | null
          ai_agent_enabled: boolean | null
          auto_cancel_reservations: boolean | null
          auto_modify_reservations: boolean | null
          created_at: string | null
          d360_api_key_encrypted: string | null
          escalation_message: string | null
          greeting_message: string | null
          id: string
          languages: string[] | null
          large_party_threshold: number | null
          location_id: string
          outside_window_reply: string | null
          personality_tone: string | null
          updated_at: string | null
          webchat_enabled: boolean | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          active_window_end?: string | null
          active_window_start?: string | null
          ai_agent_enabled?: boolean | null
          auto_cancel_reservations?: boolean | null
          auto_modify_reservations?: boolean | null
          created_at?: string | null
          d360_api_key_encrypted?: string | null
          escalation_message?: string | null
          greeting_message?: string | null
          id?: string
          languages?: string[] | null
          large_party_threshold?: number | null
          location_id: string
          outside_window_reply?: string | null
          personality_tone?: string | null
          updated_at?: string | null
          webchat_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          active_window_end?: string | null
          active_window_start?: string | null
          ai_agent_enabled?: boolean | null
          auto_cancel_reservations?: boolean | null
          auto_modify_reservations?: boolean | null
          created_at?: string | null
          d360_api_key_encrypted?: string | null
          escalation_message?: string | null
          greeting_message?: string | null
          id?: string
          languages?: string[] | null
          large_party_threshold?: number | null
          location_id?: string
          outside_window_reply?: string | null
          personality_tone?: string | null
          updated_at?: string | null
          webchat_enabled?: boolean | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_config_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mollie_connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          id: string
          location_id: string
          mollie_organization_id: string | null
          mollie_profile_id: string | null
          oauth_state: string | null
          onboarding_status: string
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          location_id: string
          mollie_organization_id?: string | null
          mollie_profile_id?: string | null
          oauth_state?: string | null
          onboarding_status?: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          location_id?: string
          mollie_organization_id?: string | null
          mollie_profile_id?: string | null
          oauth_state?: string | null
          onboarding_status?: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mollie_connections_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
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
          task_type: string
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
          task_type?: string
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
          task_type?: string
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
      onboarding_messages: {
        Row: {
          body_html: string
          body_text: string | null
          candidate_id: string
          created_at: string
          direction: string
          id: string
          location_id: string
          read_at: string | null
          resend_message_id: string | null
          sender_email: string
          sender_name: string
          subject: string
          triggered_by: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          candidate_id: string
          created_at?: string
          direction?: string
          id?: string
          location_id: string
          read_at?: string | null
          resend_message_id?: string | null
          sender_email: string
          sender_name: string
          subject: string
          triggered_by?: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          candidate_id?: string
          created_at?: string
          direction?: string
          id?: string
          location_id?: string
          read_at?: string | null
          resend_message_id?: string | null
          sender_email?: string
          sender_name?: string
          subject?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_messages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "onboarding_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_messages_location_id_fkey"
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
          is_custom: boolean
          location_id: string
          name: string
          phase_owner_email: string | null
          phase_owner_id: string | null
          phase_owner_name: string | null
          sort_order: number
          task_templates: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          location_id: string
          name: string
          phase_owner_email?: string | null
          phase_owner_id?: string | null
          phase_owner_name?: string | null
          sort_order?: number
          task_templates?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          location_id?: string
          name?: string
          phase_owner_email?: string | null
          phase_owner_id?: string | null
          phase_owner_name?: string | null
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
          {
            foreignKeyName: "onboarding_phases_phase_owner_id_fkey"
            columns: ["phase_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      reservation_email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          subject?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_email_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_settings: {
        Row: {
          allow_multi_table: boolean
          auto_assign: boolean
          auto_no_show_enabled: boolean
          booking_cutoff_minutes: number
          checkin_window_minutes: number
          created_at: string
          default_buffer_minutes: number
          default_duration_minutes: number
          default_squeeze_duration_minutes: number
          id: string
          location_id: string
          max_parallel_invites: number
          move_to_now_on_checkin: boolean
          no_show_after_minutes: number
          option_auto_release: boolean
          option_default_expiry_hours: number
          options_enabled: boolean
          reconfirm_enabled: boolean
          reconfirm_min_risk_score: number
          reminder_24h_enabled: boolean
          reminder_3h_enabled: boolean
          squeeze_enabled: boolean
          updated_at: string
          waitlist_auto_invite_enabled: boolean
        }
        Insert: {
          allow_multi_table?: boolean
          auto_assign?: boolean
          auto_no_show_enabled?: boolean
          booking_cutoff_minutes?: number
          checkin_window_minutes?: number
          created_at?: string
          default_buffer_minutes?: number
          default_duration_minutes?: number
          default_squeeze_duration_minutes?: number
          id?: string
          location_id: string
          max_parallel_invites?: number
          move_to_now_on_checkin?: boolean
          no_show_after_minutes?: number
          option_auto_release?: boolean
          option_default_expiry_hours?: number
          options_enabled?: boolean
          reconfirm_enabled?: boolean
          reconfirm_min_risk_score?: number
          reminder_24h_enabled?: boolean
          reminder_3h_enabled?: boolean
          squeeze_enabled?: boolean
          updated_at?: string
          waitlist_auto_invite_enabled?: boolean
        }
        Update: {
          allow_multi_table?: boolean
          auto_assign?: boolean
          auto_no_show_enabled?: boolean
          booking_cutoff_minutes?: number
          checkin_window_minutes?: number
          created_at?: string
          default_buffer_minutes?: number
          default_duration_minutes?: number
          default_squeeze_duration_minutes?: number
          id?: string
          location_id?: string
          max_parallel_invites?: number
          move_to_now_on_checkin?: boolean
          no_show_after_minutes?: number
          option_auto_release?: boolean
          option_default_expiry_hours?: number
          options_enabled?: boolean
          reconfirm_enabled?: boolean
          reconfirm_min_risk_score?: number
          reminder_24h_enabled?: boolean
          reminder_3h_enabled?: boolean
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
      reservations: {
        Row: {
          cancellation_reason: string | null
          channel: Database["public"]["Enums"]["reservation_channel"]
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          duration_minutes: number
          end_time: string
          guest_notes: string | null
          id: string
          internal_notes: string | null
          is_squeeze: boolean
          location_id: string
          manage_token: string
          mollie_payment_id: string | null
          no_show_risk_score: number | null
          option_expires_at: string | null
          party_size: number
          payment_amount: number | null
          payment_status: string
          reconfirm_sent_at: string | null
          reconfirm_token: string | null
          reconfirmed_at: string | null
          reminder_24h_sent_at: string | null
          reminder_3h_sent_at: string | null
          reservation_date: string
          risk_factors: Json | null
          shift_id: string
          start_time: string
          status: Database["public"]["Enums"]["reservation_status"]
          table_group_id: string | null
          table_id: string | null
          tags: Json
          ticket_id: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          channel?: Database["public"]["Enums"]["reservation_channel"]
          checked_in_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          duration_minutes: number
          end_time: string
          guest_notes?: string | null
          id?: string
          internal_notes?: string | null
          is_squeeze?: boolean
          location_id: string
          manage_token?: string
          mollie_payment_id?: string | null
          no_show_risk_score?: number | null
          option_expires_at?: string | null
          party_size: number
          payment_amount?: number | null
          payment_status?: string
          reconfirm_sent_at?: string | null
          reconfirm_token?: string | null
          reconfirmed_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_3h_sent_at?: string | null
          reservation_date: string
          risk_factors?: Json | null
          shift_id: string
          start_time: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_group_id?: string | null
          table_id?: string | null
          tags?: Json
          ticket_id: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          channel?: Database["public"]["Enums"]["reservation_channel"]
          checked_in_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          duration_minutes?: number
          end_time?: string
          guest_notes?: string | null
          id?: string
          internal_notes?: string | null
          is_squeeze?: boolean
          location_id?: string
          manage_token?: string
          mollie_payment_id?: string | null
          no_show_risk_score?: number | null
          option_expires_at?: string | null
          party_size?: number
          payment_amount?: number | null
          payment_status?: string
          reconfirm_sent_at?: string | null
          reconfirm_token?: string | null
          reconfirmed_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_3h_sent_at?: string | null
          reservation_date?: string
          risk_factors?: Json | null
          shift_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_group_id?: string | null
          table_id?: string | null
          tags?: Json
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_group_id_fkey"
            columns: ["table_group_id"]
            isOneToOne: false
            referencedRelation: "table_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
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
          override_max_covers_total: number | null
          override_online_booking_enabled: boolean | null
          override_pacing_limit_arrivals: number | null
          override_pacing_limit_covers: number | null
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
          override_max_covers_total?: number | null
          override_online_booking_enabled?: boolean | null
          override_pacing_limit_arrivals?: number | null
          override_pacing_limit_covers?: number | null
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
          override_max_covers_total?: number | null
          override_online_booking_enabled?: boolean | null
          override_pacing_limit_arrivals?: number | null
          override_pacing_limit_covers?: number | null
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
          squeeze_duration_minutes: number | null
          squeeze_enabled: boolean
          squeeze_gap_minutes: number
          squeeze_limit_per_shift: number | null
          squeeze_to_fixed_end_time: string | null
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
          squeeze_duration_minutes?: number | null
          squeeze_enabled?: boolean
          squeeze_gap_minutes?: number
          squeeze_limit_per_shift?: number | null
          squeeze_to_fixed_end_time?: string | null
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
          squeeze_duration_minutes?: number | null
          squeeze_enabled?: boolean
          squeeze_gap_minutes?: number
          squeeze_limit_per_shift?: number | null
          squeeze_to_fixed_end_time?: string | null
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
      waitlist_entries: {
        Row: {
          created_at: string
          customer_id: string | null
          date: string
          email: string
          first_name: string
          id: string
          last_name: string
          location_id: string
          notes: string | null
          party_size: number
          phone: string | null
          preferred_time_from: string | null
          preferred_time_to: string | null
          priority_score: number
          shift_id: string | null
          status: string
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          date: string
          email: string
          first_name: string
          id?: string
          last_name: string
          location_id: string
          notes?: string | null
          party_size: number
          phone?: string | null
          preferred_time_from?: string | null
          preferred_time_to?: string | null
          priority_score?: number
          shift_id?: string | null
          status?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          date?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          location_id?: string
          notes?: string | null
          party_size?: number
          phone?: string | null
          preferred_time_from?: string | null
          preferred_time_to?: string | null
          priority_score?: number
          shift_id?: string | null
          status?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invite_token: string
          location_id: string
          party_size: number
          reservation_id: string | null
          slot_date: string
          slot_time: string
          status: string
          ticket_id: string | null
          waitlist_entry_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          invite_token: string
          location_id: string
          party_size: number
          reservation_id?: string | null
          slot_date: string
          slot_time: string
          status?: string
          ticket_id?: string | null
          waitlist_entry_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_token?: string
          location_id?: string
          party_size?: number
          reservation_id?: string | null
          slot_date?: string
          slot_time?: string
          status?: string
          ticket_id?: string | null
          waitlist_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_invites_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_invites_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_invites_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_invites_waitlist_entry_id_fkey"
            columns: ["waitlist_entry_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_settings: {
        Row: {
          auto_invite_delay_minutes: number
          auto_invite_enabled: boolean
          created_at: string
          invite_window_minutes: number
          location_id: string
          max_parallel_invites: number
          priority_mode: string
          updated_at: string
          waitlist_enabled: boolean
        }
        Insert: {
          auto_invite_delay_minutes?: number
          auto_invite_enabled?: boolean
          created_at?: string
          invite_window_minutes?: number
          location_id: string
          max_parallel_invites?: number
          priority_mode?: string
          updated_at?: string
          waitlist_enabled?: boolean
        }
        Update: {
          auto_invite_delay_minutes?: number
          auto_invite_enabled?: boolean
          created_at?: string
          invite_window_minutes?: number
          location_id?: string
          max_parallel_invites?: number
          priority_mode?: string
          updated_at?: string
          waitlist_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_settings: {
        Row: {
          booking_questions: Json
          created_at: string
          google_reserve_url: string | null
          id: string
          location_id: string
          location_slug: string | null
          show_end_time: boolean
          show_nesto_branding: boolean
          unavailable_text: string
          updated_at: string
          widget_accent_color: string
          widget_button_logo_url: string | null
          widget_button_pulse: boolean
          widget_button_style: string
          widget_enabled: boolean
          widget_logo_url: string | null
          widget_primary_color: string
          widget_style: string
          widget_success_redirect_url: string | null
          widget_welcome_text: string | null
        }
        Insert: {
          booking_questions?: Json
          created_at?: string
          google_reserve_url?: string | null
          id?: string
          location_id: string
          location_slug?: string | null
          show_end_time?: boolean
          show_nesto_branding?: boolean
          unavailable_text?: string
          updated_at?: string
          widget_accent_color?: string
          widget_button_logo_url?: string | null
          widget_button_pulse?: boolean
          widget_button_style?: string
          widget_enabled?: boolean
          widget_logo_url?: string | null
          widget_primary_color?: string
          widget_style?: string
          widget_success_redirect_url?: string | null
          widget_welcome_text?: string | null
        }
        Update: {
          booking_questions?: Json
          created_at?: string
          google_reserve_url?: string | null
          id?: string
          location_id?: string
          location_slug?: string | null
          show_end_time?: boolean
          show_nesto_branding?: boolean
          unavailable_text?: string
          updated_at?: string
          widget_accent_color?: string
          widget_button_logo_url?: string | null
          widget_button_pulse?: boolean
          widget_button_style?: string
          widget_enabled?: boolean
          widget_logo_url?: string | null
          widget_primary_color?: string
          widget_style?: string
          widget_success_redirect_url?: string | null
          widget_welcome_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
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
      shift_risk_summary: {
        Row: {
          avg_risk_score: number | null
          high_risk_count: number | null
          high_risk_covers: number | null
          location_id: string | null
          reservation_date: string | null
          shift_id: string | null
          shift_name: string | null
          suggested_overbook_covers: number | null
          total_covers: number | null
          total_reservations: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advance_onboarding_phase: {
        Args: { _candidate_id: string; _user_id: string }
        Returns: Json
      }
      archive_area: { Args: { _area_id: string }; Returns: Json }
      assign_best_table: {
        Args: {
          _date: string
          _duration_minutes: number
          _location_id: string
          _party_size: number
          _preferred_area_id?: string
          _reservation_id?: string
          _shift_id: string
          _ticket_id: string
          _time: string
        }
        Returns: Json
      }
      count_segment_customers: {
        Args: { _filter_rules: Json; _location_id: string }
        Returns: number
      }
      create_reservation: {
        Args: {
          _actor_id?: string
          _channel?: Database["public"]["Enums"]["reservation_channel"]
          _customer_id?: string
          _guest_notes?: string
          _initial_status?: Database["public"]["Enums"]["reservation_status"]
          _internal_notes?: string
          _location_id: string
          _party_size?: number
          _reservation_date?: string
          _shift_id?: string
          _squeeze?: boolean
          _start_time?: string
          _table_id?: string
          _ticket_id?: string
        }
        Returns: string
      }
      detect_empty_shifts: { Args: never; Returns: undefined }
      extend_option: {
        Args: {
          _actor_id?: string
          _extra_hours?: number
          _reservation_id: string
        }
        Returns: string
      }
      fn_auto_mark_no_shows: { Args: never; Returns: number }
      fn_auto_release_options: { Args: never; Returns: number }
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
          effective_max_covers_total: number
          effective_online_booking_enabled: boolean
          effective_pacing_limit_arrivals: number
          effective_pacing_limit_covers: number
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
      increment_marketing_analytics: {
        Args: { p_campaign_id: string; p_field: string; p_location_id: string }
        Returns: undefined
      }
      is_employee_at_location: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_platform_user: { Args: { _user_id: string }; Returns: boolean }
      list_segment_customers: {
        Args: {
          _filter_rules?: Json
          _limit?: number
          _location_id: string
          _offset?: number
        }
        Returns: {
          average_spend: number
          birthday: string
          created_at: string
          dietary_preferences: string[]
          email: string
          first_name: string
          id: string
          language: string
          last_name: string
          last_visit_at: string
          notes: string
          phone_number: string
          tags: Json
          total_cancellations: number
          total_no_shows: number
          total_visits: number
        }[]
      }
      move_reservation_table: {
        Args: {
          _actor_id?: string
          _new_table_id?: string
          _reservation_id: string
        }
        Returns: undefined
      }
      process_scheduled_campaigns: { Args: never; Returns: undefined }
      publish_scheduled_social_posts: { Args: never; Returns: undefined }
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
      reset_onboarding_phases: {
        Args: { p_location_id: string }
        Returns: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_custom: boolean
          location_id: string
          name: string
          phase_owner_email: string | null
          phase_owner_id: string | null
          phase_owner_name: string | null
          sort_order: number
          task_templates: Json
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "onboarding_phases"
          isOneToOne: false
          isSetofReturn: true
        }
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
      transition_reservation_status: {
        Args: {
          _actor_id?: string
          _is_override?: boolean
          _new_status: Database["public"]["Enums"]["reservation_status"]
          _reason?: string
          _reservation_id: string
        }
        Returns: string
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
      reservation_channel:
        | "widget"
        | "operator"
        | "phone"
        | "google"
        | "whatsapp"
        | "walk_in"
      reservation_status:
        | "draft"
        | "confirmed"
        | "option"
        | "pending_payment"
        | "seated"
        | "completed"
        | "no_show"
        | "cancelled"
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
      reservation_channel: [
        "widget",
        "operator",
        "phone",
        "google",
        "whatsapp",
        "walk_in",
      ],
      reservation_status: [
        "draft",
        "confirmed",
        "option",
        "pending_payment",
        "seated",
        "completed",
        "no_show",
        "cancelled",
      ],
      shift_exception_type: ["closed", "modified", "special"],
    },
  },
} as const
