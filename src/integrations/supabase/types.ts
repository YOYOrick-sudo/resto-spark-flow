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
      ai_correction_events: {
        Row: {
          confidence_before: number | null
          corrected_at: string
          field_path: string
          id: string
          leverancier_id: string | null
          location_id: string
          new_value: Json | null
          old_value: Json | null
          source_id: string
          source_table: string
          user_id: string | null
        }
        Insert: {
          confidence_before?: number | null
          corrected_at?: string
          field_path: string
          id?: string
          leverancier_id?: string | null
          location_id: string
          new_value?: Json | null
          old_value?: Json | null
          source_id: string
          source_table: string
          user_id?: string | null
        }
        Update: {
          confidence_before?: number | null
          corrected_at?: string
          field_path?: string
          id?: string
          leverancier_id?: string | null
          location_id?: string
          new_value?: Json | null
          old_value?: Json | null
          source_id?: string
          source_table?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_correction_events_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_correction_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_logs: {
        Row: {
          cost_eur: number | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          escalated_to_pro: boolean
          escalation_reason: string | null
          feature: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          location_id: string | null
          model: string
          organization_id: string | null
          output_tokens: number | null
          status: string | null
          was_fallback: boolean
        }
        Insert: {
          cost_eur?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          escalated_to_pro?: boolean
          escalation_reason?: string | null
          feature: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          location_id?: string | null
          model: string
          organization_id?: string | null
          output_tokens?: number | null
          status?: string | null
          was_fallback?: boolean
        }
        Update: {
          cost_eur?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          escalated_to_pro?: boolean
          escalation_reason?: string | null
          feature?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          location_id?: string | null
          model?: string
          organization_id?: string | null
          output_tokens?: number | null
          status?: string | null
          was_fallback?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      allergenen: {
        Row: {
          code: string
          created_at: string
          id: string
          naam_en: string
          naam_nl: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          naam_en: string
          naam_nl: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          naam_en?: string
          naam_nl?: string
          sort_order?: number
        }
        Relationships: []
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
      article_cache: {
        Row: {
          article_code: string
          created_at: string
          description: string | null
          hit_count: number
          ingredient_id: string | null
          last_seen_at: string
          last_unit_price_eur: number | null
          leverancier_id: string
          location_id: string
          packaging_id: string | null
          updated_at: string
        }
        Insert: {
          article_code: string
          created_at?: string
          description?: string | null
          hit_count?: number
          ingredient_id?: string | null
          last_seen_at?: string
          last_unit_price_eur?: number | null
          leverancier_id: string
          location_id: string
          packaging_id?: string | null
          updated_at?: string
        }
        Update: {
          article_code?: string
          created_at?: string
          description?: string | null
          hit_count?: number
          ingredient_id?: string | null
          last_seen_at?: string
          last_unit_price_eur?: number | null
          leverancier_id?: string
          location_id?: string
          packaging_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_cache_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_cache_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_cache_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_cache_packaging_id_fkey"
            columns: ["packaging_id"]
            isOneToOne: false
            referencedRelation: "ingredient_packagings"
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
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action_enum"]
          actor_id: string | null
          actor_name: string | null
          actor_type: Database["public"]["Enums"]["actor_type_enum"]
          details: Json | null
          device_id: string | null
          id: string
          identification_method: string | null
          identified_by_name: string | null
          identified_by_staff_id: string | null
          ip_address: unknown
          location_id: string | null
          organization_id: string
          recorded_at: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action_enum"]
          actor_id?: string | null
          actor_name?: string | null
          actor_type: Database["public"]["Enums"]["actor_type_enum"]
          details?: Json | null
          device_id?: string | null
          id?: string
          identification_method?: string | null
          identified_by_name?: string | null
          identified_by_staff_id?: string | null
          ip_address?: unknown
          location_id?: string | null
          organization_id: string
          recorded_at?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action_enum"]
          actor_id?: string | null
          actor_name?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type_enum"]
          details?: Json | null
          device_id?: string | null
          id?: string
          identification_method?: string | null
          identified_by_name?: string | null
          identified_by_staff_id?: string | null
          ip_address?: unknown
          location_id?: string | null
          organization_id?: string
          recorded_at?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_identified_by_staff_id_fkey"
            columns: ["identified_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bestellingen: {
        Row: {
          aangemaakt_door: string | null
          besteldatum: string | null
          bestelmethode: Database["public"]["Enums"]["bestel_methode"]
          bestelnummer: string | null
          created_at: string
          id: string
          laatst_verzonden: string | null
          leverancier_id: string
          location_id: string
          notities: string | null
          ontvangstdatum: string | null
          status: string
          totaal_bedrag: number | null
          updated_at: string
          verwachte_leverdatum: string | null
        }
        Insert: {
          aangemaakt_door?: string | null
          besteldatum?: string | null
          bestelmethode?: Database["public"]["Enums"]["bestel_methode"]
          bestelnummer?: string | null
          created_at?: string
          id?: string
          laatst_verzonden?: string | null
          leverancier_id: string
          location_id: string
          notities?: string | null
          ontvangstdatum?: string | null
          status?: string
          totaal_bedrag?: number | null
          updated_at?: string
          verwachte_leverdatum?: string | null
        }
        Update: {
          aangemaakt_door?: string | null
          besteldatum?: string | null
          bestelmethode?: Database["public"]["Enums"]["bestel_methode"]
          bestelnummer?: string | null
          created_at?: string
          id?: string
          laatst_verzonden?: string | null
          leverancier_id?: string
          location_id?: string
          notities?: string | null
          ontvangstdatum?: string | null
          status?: string
          totaal_bedrag?: number | null
          updated_at?: string
          verwachte_leverdatum?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bestellingen_aangemaakt_door_fkey"
            columns: ["aangemaakt_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bestellingen_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bestellingen_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      bestelregels: {
        Row: {
          bestelde_hoeveelheid: number
          bestelling_id: string
          created_at: string
          eenheid: string
          id: string
          ingredient_id: string
          leveranciers_artikel_id: string | null
          ontvangen_hoeveelheid: number | null
          prijs_per_eenheid: number | null
          totaal: number | null
        }
        Insert: {
          bestelde_hoeveelheid: number
          bestelling_id: string
          created_at?: string
          eenheid: string
          id?: string
          ingredient_id: string
          leveranciers_artikel_id?: string | null
          ontvangen_hoeveelheid?: number | null
          prijs_per_eenheid?: number | null
          totaal?: number | null
        }
        Update: {
          bestelde_hoeveelheid?: number
          bestelling_id?: string
          created_at?: string
          eenheid?: string
          id?: string
          ingredient_id?: string
          leveranciers_artikel_id?: string | null
          ontvangen_hoeveelheid?: number | null
          prijs_per_eenheid?: number | null
          totaal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bestelregels_bestelling_id_fkey"
            columns: ["bestelling_id"]
            isOneToOne: false
            referencedRelation: "bestellingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bestelregels_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bestelregels_leveranciers_artikel_id_fkey"
            columns: ["leveranciers_artikel_id"]
            isOneToOne: false
            referencedRelation: "leveranciers_artikelen"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_responses: {
        Row: {
          checked: boolean | null
          created_at: string
          foto_url: string | null
          id: string
          ingevuld_door: string | null
          ingevuld_op: string | null
          item_id: string
          notitie: string | null
          run_id: string
          temp_in_range: boolean | null
          temperatuur: number | null
          type: string
        }
        Insert: {
          checked?: boolean | null
          created_at?: string
          foto_url?: string | null
          id?: string
          ingevuld_door?: string | null
          ingevuld_op?: string | null
          item_id: string
          notitie?: string | null
          run_id: string
          temp_in_range?: boolean | null
          temperatuur?: number | null
          type: string
        }
        Update: {
          checked?: boolean | null
          created_at?: string
          foto_url?: string | null
          id?: string
          ingevuld_door?: string | null
          ingevuld_op?: string | null
          item_id?: string
          notitie?: string | null
          run_id?: string
          temp_in_range?: boolean | null
          temperatuur?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_responses_ingevuld_door_fkey"
            columns: ["ingevuld_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_responses_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "checklist_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_runs: {
        Row: {
          afgerond_door: string | null
          afgerond_op: string | null
          created_at: string
          datum: string
          gestart_door: string | null
          gestart_op: string | null
          id: string
          items_snapshot: Json | null
          location_id: string
          medewerker_id: string | null
          opmerkingen: string | null
          shift: string | null
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          afgerond_door?: string | null
          afgerond_op?: string | null
          created_at?: string
          datum?: string
          gestart_door?: string | null
          gestart_op?: string | null
          id?: string
          items_snapshot?: Json | null
          location_id: string
          medewerker_id?: string | null
          opmerkingen?: string | null
          shift?: string | null
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          afgerond_door?: string | null
          afgerond_op?: string | null
          created_at?: string
          datum?: string
          gestart_door?: string | null
          gestart_op?: string | null
          id?: string
          items_snapshot?: Json | null
          location_id?: string
          medewerker_id?: string | null
          opmerkingen?: string | null
          shift?: string | null
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_runs_afgerond_door_fkey"
            columns: ["afgerond_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_runs_gestart_door_fkey"
            columns: ["gestart_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_runs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_runs_medewerker_id_fkey"
            columns: ["medewerker_id"]
            isOneToOne: false
            referencedRelation: "medewerkers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_runs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          actief: boolean
          beschrijving: string | null
          categorie: string | null
          created_at: string
          default_time: string | null
          frequentie: string
          frequentie_config: Json
          gearchiveerd_op: string | null
          id: string
          is_system: boolean
          items: Json
          location_id: string
          modus: string
          naam: string
          type: string
          updated_at: string
        }
        Insert: {
          actief?: boolean
          beschrijving?: string | null
          categorie?: string | null
          created_at?: string
          default_time?: string | null
          frequentie?: string
          frequentie_config?: Json
          gearchiveerd_op?: string | null
          id?: string
          is_system?: boolean
          items?: Json
          location_id: string
          modus?: string
          naam: string
          type: string
          updated_at?: string
        }
        Update: {
          actief?: boolean
          beschrijving?: string | null
          categorie?: string | null
          created_at?: string
          default_time?: string | null
          frequentie?: string
          frequentie_config?: Json
          gearchiveerd_op?: string | null
          id?: string
          is_system?: boolean
          items?: Json
          location_id?: string
          modus?: string
          naam?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_location_id_fkey"
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
      credit_note_requests: {
        Row: {
          aantal: number | null
          created_at: string
          dedup_key: string | null
          eenheid: string | null
          email_message_id: string | null
          email_verzonden_at: string | null
          geschatte_waarde: number | null
          goods_receipt_id: string
          goods_receipt_line_id: string | null
          id: string
          leverancier_id: string | null
          leverancier_reactie: string | null
          location_id: string
          notities: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_via:
            | Database["public"]["Enums"]["credit_note_resolved_via"]
            | null
          status: Database["public"]["Enums"]["credit_note_status"]
          type: Database["public"]["Enums"]["credit_note_type"]
          updated_at: string
        }
        Insert: {
          aantal?: number | null
          created_at?: string
          dedup_key?: string | null
          eenheid?: string | null
          email_message_id?: string | null
          email_verzonden_at?: string | null
          geschatte_waarde?: number | null
          goods_receipt_id: string
          goods_receipt_line_id?: string | null
          id?: string
          leverancier_id?: string | null
          leverancier_reactie?: string | null
          location_id: string
          notities?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_via?:
            | Database["public"]["Enums"]["credit_note_resolved_via"]
            | null
          status?: Database["public"]["Enums"]["credit_note_status"]
          type: Database["public"]["Enums"]["credit_note_type"]
          updated_at?: string
        }
        Update: {
          aantal?: number | null
          created_at?: string
          dedup_key?: string | null
          eenheid?: string | null
          email_message_id?: string | null
          email_verzonden_at?: string | null
          geschatte_waarde?: number | null
          goods_receipt_id?: string
          goods_receipt_line_id?: string | null
          id?: string
          leverancier_id?: string | null
          leverancier_reactie?: string | null
          location_id?: string
          notities?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_via?:
            | Database["public"]["Enums"]["credit_note_resolved_via"]
            | null
          status?: Database["public"]["Enums"]["credit_note_status"]
          type?: Database["public"]["Enums"]["credit_note_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_requests_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_requests_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts_chef_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_requests_goods_receipt_line_id_fkey"
            columns: ["goods_receipt_line_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_requests_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      day_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          location_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          location_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_notes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          app_version: string | null
          auth_user_id: string | null
          created_at: string
          device_name: string
          device_role: Database["public"]["Enums"]["device_role_enum"]
          id: string
          last_heartbeat: string | null
          location_id: string
          metadata: Json | null
          paired_at: string | null
          paired_by: string | null
          pairing_code: string | null
          pairing_expires_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          app_version?: string | null
          auth_user_id?: string | null
          created_at?: string
          device_name: string
          device_role?: Database["public"]["Enums"]["device_role_enum"]
          id?: string
          last_heartbeat?: string | null
          location_id: string
          metadata?: Json | null
          paired_at?: string | null
          paired_by?: string | null
          pairing_code?: string | null
          pairing_expires_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          app_version?: string | null
          auth_user_id?: string | null
          created_at?: string
          device_name?: string
          device_role?: Database["public"]["Enums"]["device_role_enum"]
          id?: string
          last_heartbeat?: string | null
          location_id?: string
          metadata?: Json | null
          paired_at?: string | null
          paired_by?: string | null
          pairing_code?: string | null
          pairing_expires_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_cache: {
        Row: {
          cost_eur: number | null
          location_id: string
          model_used: string | null
          parsed_at: string
          parsed_result: Json
          pdf_sha256: string
        }
        Insert: {
          cost_eur?: number | null
          location_id: string
          model_used?: string | null
          parsed_at?: string
          parsed_result: Json
          pdf_sha256: string
        }
        Update: {
          cost_eur?: number | null
          location_id?: string
          model_used?: string | null
          parsed_at?: string
          parsed_result?: Json
          pdf_sha256?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_cache_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      eenheid_conversies: {
        Row: {
          factor: number
          id: string
          ingredient_id: string
          naar_eenheid: string
          van_eenheid: string
        }
        Insert: {
          factor: number
          id?: string
          ingredient_id: string
          naar_eenheid: string
          van_eenheid: string
        }
        Update: {
          factor?: number
          id?: string
          ingredient_id?: string
          naar_eenheid?: string
          van_eenheid?: string
        }
        Relationships: [
          {
            foreignKeyName: "eenheid_conversies_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
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
      factuur_regels: {
        Row: {
          ai_category_hint: string | null
          ai_confidence: number | null
          ai_raw_artikelnummer: string | null
          ai_raw_naam: string | null
          ai_raw_verpakking_tekst: string | null
          ai_suggested_eenheid: string | null
          ai_suggested_naam: string | null
          btw_percentage: number | null
          created_at: string
          eenheid: string | null
          extract_confidence: string | null
          factuur_id: string
          hoeveelheid: number | null
          id: string
          ingredient_id: string | null
          is_credit: boolean | null
          is_emballage: boolean | null
          is_nieuw_ingredient: boolean | null
          match_confidence: number | null
          match_status: string
          ordernr: string | null
          prijs_per_basiseenheid: number | null
          prijs_per_eenheid: number | null
          product_naam_herkend: string
          product_omschrijving_kort: string | null
          totaal: number | null
          validation_ambiguous: boolean | null
          validation_corrected: boolean | null
          validation_correction_path: string | null
          validation_error: boolean
          validation_error_reden: string | null
          verpakking_eenheid: string | null
          verpakking_hoeveelheid: number | null
        }
        Insert: {
          ai_category_hint?: string | null
          ai_confidence?: number | null
          ai_raw_artikelnummer?: string | null
          ai_raw_naam?: string | null
          ai_raw_verpakking_tekst?: string | null
          ai_suggested_eenheid?: string | null
          ai_suggested_naam?: string | null
          btw_percentage?: number | null
          created_at?: string
          eenheid?: string | null
          extract_confidence?: string | null
          factuur_id: string
          hoeveelheid?: number | null
          id?: string
          ingredient_id?: string | null
          is_credit?: boolean | null
          is_emballage?: boolean | null
          is_nieuw_ingredient?: boolean | null
          match_confidence?: number | null
          match_status?: string
          ordernr?: string | null
          prijs_per_basiseenheid?: number | null
          prijs_per_eenheid?: number | null
          product_naam_herkend: string
          product_omschrijving_kort?: string | null
          totaal?: number | null
          validation_ambiguous?: boolean | null
          validation_corrected?: boolean | null
          validation_correction_path?: string | null
          validation_error?: boolean
          validation_error_reden?: string | null
          verpakking_eenheid?: string | null
          verpakking_hoeveelheid?: number | null
        }
        Update: {
          ai_category_hint?: string | null
          ai_confidence?: number | null
          ai_raw_artikelnummer?: string | null
          ai_raw_naam?: string | null
          ai_raw_verpakking_tekst?: string | null
          ai_suggested_eenheid?: string | null
          ai_suggested_naam?: string | null
          btw_percentage?: number | null
          created_at?: string
          eenheid?: string | null
          extract_confidence?: string | null
          factuur_id?: string
          hoeveelheid?: number | null
          id?: string
          ingredient_id?: string | null
          is_credit?: boolean | null
          is_emballage?: boolean | null
          is_nieuw_ingredient?: boolean | null
          match_confidence?: number | null
          match_status?: string
          ordernr?: string | null
          prijs_per_basiseenheid?: number | null
          prijs_per_eenheid?: number | null
          product_naam_herkend?: string
          product_omschrijving_kort?: string | null
          totaal?: number | null
          validation_ambiguous?: boolean | null
          validation_corrected?: boolean | null
          validation_correction_path?: string | null
          validation_error?: boolean
          validation_error_reden?: string | null
          verpakking_eenheid?: string | null
          verpakking_hoeveelheid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "factuur_regels_factuur_id_fkey"
            columns: ["factuur_id"]
            isOneToOne: false
            referencedRelation: "factuur_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factuur_regels_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
        ]
      }
      factuur_uploads: {
        Row: {
          ai_confidence_overall: number | null
          ai_cost_estimate: number | null
          ai_parsed_at: string | null
          ai_parsing_status: string | null
          ai_raw_response: Json | null
          ai_tokens_input: number | null
          ai_tokens_output: number | null
          bestand_url: string
          bestandsnaam: string
          bron: string
          btw_bedrag: number | null
          btw_percentage: number | null
          created_at: string
          factuurdatum: string | null
          factuurnummer: string | null
          file_hash: string | null
          fuzzy_kandidaten: Json
          goedgekeurd_door: string | null
          goedgekeurd_op: string | null
          id: string
          leverancier_id: string | null
          leverancier_naam_herkend: string | null
          location_id: string
          parse_confidence: number | null
          parse_method: string
          preview_snapshot: Json | null
          ruwe_tekst: string | null
          status: string
          subtotaal_excl_btw: number | null
          totaal_incl_btw: number | null
          totaalbedrag: number | null
          updated_at: string
          v2_shadow_completed_at: string | null
          v2_shadow_cost_eur: number | null
          v2_shadow_duration_ms: number | null
          v2_shadow_error: string | null
          v2_shadow_parse_method: string | null
          v2_shadow_response: Json | null
          v2_shadow_tokens_input: number | null
          v2_shadow_tokens_output: number | null
          v2_shadow_validation_status: string | null
          validation_blocked_reason: string | null
          validation_errors: Json | null
          validation_retries: number
          validation_status: string | null
          validation_warnings: Json | null
          verwerkt_op: string | null
        }
        Insert: {
          ai_confidence_overall?: number | null
          ai_cost_estimate?: number | null
          ai_parsed_at?: string | null
          ai_parsing_status?: string | null
          ai_raw_response?: Json | null
          ai_tokens_input?: number | null
          ai_tokens_output?: number | null
          bestand_url: string
          bestandsnaam: string
          bron?: string
          btw_bedrag?: number | null
          btw_percentage?: number | null
          created_at?: string
          factuurdatum?: string | null
          factuurnummer?: string | null
          file_hash?: string | null
          fuzzy_kandidaten?: Json
          goedgekeurd_door?: string | null
          goedgekeurd_op?: string | null
          id?: string
          leverancier_id?: string | null
          leverancier_naam_herkend?: string | null
          location_id: string
          parse_confidence?: number | null
          parse_method?: string
          preview_snapshot?: Json | null
          ruwe_tekst?: string | null
          status?: string
          subtotaal_excl_btw?: number | null
          totaal_incl_btw?: number | null
          totaalbedrag?: number | null
          updated_at?: string
          v2_shadow_completed_at?: string | null
          v2_shadow_cost_eur?: number | null
          v2_shadow_duration_ms?: number | null
          v2_shadow_error?: string | null
          v2_shadow_parse_method?: string | null
          v2_shadow_response?: Json | null
          v2_shadow_tokens_input?: number | null
          v2_shadow_tokens_output?: number | null
          v2_shadow_validation_status?: string | null
          validation_blocked_reason?: string | null
          validation_errors?: Json | null
          validation_retries?: number
          validation_status?: string | null
          validation_warnings?: Json | null
          verwerkt_op?: string | null
        }
        Update: {
          ai_confidence_overall?: number | null
          ai_cost_estimate?: number | null
          ai_parsed_at?: string | null
          ai_parsing_status?: string | null
          ai_raw_response?: Json | null
          ai_tokens_input?: number | null
          ai_tokens_output?: number | null
          bestand_url?: string
          bestandsnaam?: string
          bron?: string
          btw_bedrag?: number | null
          btw_percentage?: number | null
          created_at?: string
          factuurdatum?: string | null
          factuurnummer?: string | null
          file_hash?: string | null
          fuzzy_kandidaten?: Json
          goedgekeurd_door?: string | null
          goedgekeurd_op?: string | null
          id?: string
          leverancier_id?: string | null
          leverancier_naam_herkend?: string | null
          location_id?: string
          parse_confidence?: number | null
          parse_method?: string
          preview_snapshot?: Json | null
          ruwe_tekst?: string | null
          status?: string
          subtotaal_excl_btw?: number | null
          totaal_incl_btw?: number | null
          totaalbedrag?: number | null
          updated_at?: string
          v2_shadow_completed_at?: string | null
          v2_shadow_cost_eur?: number | null
          v2_shadow_duration_ms?: number | null
          v2_shadow_error?: string | null
          v2_shadow_parse_method?: string | null
          v2_shadow_response?: Json | null
          v2_shadow_tokens_input?: number | null
          v2_shadow_tokens_output?: number | null
          v2_shadow_validation_status?: string | null
          validation_blocked_reason?: string | null
          validation_errors?: Json | null
          validation_retries?: number
          validation_status?: string | null
          validation_warnings?: Json | null
          verwerkt_op?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factuur_uploads_goedgekeurd_door_fkey"
            columns: ["goedgekeurd_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factuur_uploads_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factuur_uploads_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      gedeelde_producten_per_locatie: {
        Row: {
          actief: boolean
          created_at: string
          id: string
          ingredient_id: string | null
          locatie_id: string
          product_type: string
          recept_id: string | null
          updated_at: string
        }
        Insert: {
          actief?: boolean
          created_at?: string
          id?: string
          ingredient_id?: string | null
          locatie_id: string
          product_type: string
          recept_id?: string | null
          updated_at?: string
        }
        Update: {
          actief?: boolean
          created_at?: string
          id?: string
          ingredient_id?: string | null
          locatie_id?: string
          product_type?: string
          recept_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gedeelde_producten_per_locatie_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gedeelde_producten_per_locatie_locatie_id_fkey"
            columns: ["locatie_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gedeelde_producten_per_locatie_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
        ]
      }
      gerecht_componenten: {
        Row: {
          created_at: string
          eenheid: string
          gerecht_id: string
          hoeveelheid: number
          id: string
          ingredient_id: string | null
          kostprijs_snapshot: number | null
          recept_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          eenheid: string
          gerecht_id: string
          hoeveelheid: number
          id?: string
          ingredient_id?: string | null
          kostprijs_snapshot?: number | null
          recept_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          eenheid?: string
          gerecht_id?: string
          hoeveelheid?: number
          id?: string
          ingredient_id?: string | null
          kostprijs_snapshot?: number | null
          recept_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gerecht_componenten_gerecht_id_fkey"
            columns: ["gerecht_id"]
            isOneToOne: false
            referencedRelation: "gerechten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gerecht_componenten_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gerecht_componenten_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
        ]
      }
      gerechten: {
        Row: {
          archived_at: string | null
          bereidingswijze: string | null
          beschrijving: string | null
          categorie: string
          created_at: string
          foto_url: string | null
          id: string
          is_actief: boolean
          is_archived: boolean
          kostprijs: number
          location_id: string
          marge_percentage: number | null
          naam: string
          omschrijving: string | null
          updated_at: string
          verkoopprijs: number | null
        }
        Insert: {
          archived_at?: string | null
          bereidingswijze?: string | null
          beschrijving?: string | null
          categorie?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          is_actief?: boolean
          is_archived?: boolean
          kostprijs?: number
          location_id: string
          marge_percentage?: number | null
          naam: string
          omschrijving?: string | null
          updated_at?: string
          verkoopprijs?: number | null
        }
        Update: {
          archived_at?: string | null
          bereidingswijze?: string | null
          beschrijving?: string | null
          categorie?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          is_actief?: boolean
          is_archived?: boolean
          kostprijs?: number
          location_id?: string
          marge_percentage?: number | null
          naam?: string
          omschrijving?: string | null
          updated_at?: string
          verkoopprijs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gerechten_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_lines: {
        Row: {
          afgevinkt_at: string | null
          afgevinkt_door: string | null
          afwijking_foto_url: string | null
          afwijking_notitie: string | null
          ai_confidence: number | null
          ai_confidence_per_field: Json | null
          ai_is_weighted: boolean
          ai_package_label: string | null
          ai_package_unit: string | null
          ai_per_package_quantity: number | null
          ai_raw_artikelnummer: string | null
          ai_raw_naam: string | null
          ai_reasoning: string | null
          ai_total_packages: number | null
          ai_total_received_quantity: number | null
          ai_total_received_unit: string | null
          created_at: string
          eenheid_verwacht: string | null
          factor_status: string
          goods_receipt_id: string
          haccp_categorie: Database["public"]["Enums"]["haccp_categorie"] | null
          hoeveelheid_ontvangen: number | null
          hoeveelheid_verwacht: number | null
          id: string
          ingredient_id: string | null
          is_nieuw_ingredient: boolean | null
          leverancier_artikel_id: string | null
          lotnummer: string | null
          match_confidence: number | null
          match_status: string | null
          product_naam_herkend: string
          status: Database["public"]["Enums"]["goods_receipt_line_status"]
          suggested_ingredient_id: string | null
          tht_datum: string | null
          updated_at: string
          validation_errors: Json | null
          werkelijk_gewicht_g: number | null
        }
        Insert: {
          afgevinkt_at?: string | null
          afgevinkt_door?: string | null
          afwijking_foto_url?: string | null
          afwijking_notitie?: string | null
          ai_confidence?: number | null
          ai_confidence_per_field?: Json | null
          ai_is_weighted?: boolean
          ai_package_label?: string | null
          ai_package_unit?: string | null
          ai_per_package_quantity?: number | null
          ai_raw_artikelnummer?: string | null
          ai_raw_naam?: string | null
          ai_reasoning?: string | null
          ai_total_packages?: number | null
          ai_total_received_quantity?: number | null
          ai_total_received_unit?: string | null
          created_at?: string
          eenheid_verwacht?: string | null
          factor_status?: string
          goods_receipt_id: string
          haccp_categorie?:
            | Database["public"]["Enums"]["haccp_categorie"]
            | null
          hoeveelheid_ontvangen?: number | null
          hoeveelheid_verwacht?: number | null
          id?: string
          ingredient_id?: string | null
          is_nieuw_ingredient?: boolean | null
          leverancier_artikel_id?: string | null
          lotnummer?: string | null
          match_confidence?: number | null
          match_status?: string | null
          product_naam_herkend: string
          status?: Database["public"]["Enums"]["goods_receipt_line_status"]
          suggested_ingredient_id?: string | null
          tht_datum?: string | null
          updated_at?: string
          validation_errors?: Json | null
          werkelijk_gewicht_g?: number | null
        }
        Update: {
          afgevinkt_at?: string | null
          afgevinkt_door?: string | null
          afwijking_foto_url?: string | null
          afwijking_notitie?: string | null
          ai_confidence?: number | null
          ai_confidence_per_field?: Json | null
          ai_is_weighted?: boolean
          ai_package_label?: string | null
          ai_package_unit?: string | null
          ai_per_package_quantity?: number | null
          ai_raw_artikelnummer?: string | null
          ai_raw_naam?: string | null
          ai_reasoning?: string | null
          ai_total_packages?: number | null
          ai_total_received_quantity?: number | null
          ai_total_received_unit?: string | null
          created_at?: string
          eenheid_verwacht?: string | null
          factor_status?: string
          goods_receipt_id?: string
          haccp_categorie?:
            | Database["public"]["Enums"]["haccp_categorie"]
            | null
          hoeveelheid_ontvangen?: number | null
          hoeveelheid_verwacht?: number | null
          id?: string
          ingredient_id?: string | null
          is_nieuw_ingredient?: boolean | null
          leverancier_artikel_id?: string | null
          lotnummer?: string | null
          match_confidence?: number | null
          match_status?: string | null
          product_naam_herkend?: string
          status?: Database["public"]["Enums"]["goods_receipt_line_status"]
          suggested_ingredient_id?: string | null
          tht_datum?: string | null
          updated_at?: string
          validation_errors?: Json | null
          werkelijk_gewicht_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_lines_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts_chef_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_leverancier_artikel_id_fkey"
            columns: ["leverancier_artikel_id"]
            isOneToOne: false
            referencedRelation: "leveranciers_artikelen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_suggested_ingredient_id_fkey"
            columns: ["suggested_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          ai_generated: boolean
          ai_model_version: string | null
          ai_parse_confidence: number | null
          ai_parse_status:
            | Database["public"]["Enums"]["pakbon_ai_parse_status"]
            | null
          ai_raw_response: Json | null
          bestelling_id: string | null
          created_at: string
          email_raw_url: string | null
          heeft_strict_temp_alarm: boolean
          id: string
          leverancier_id: string | null
          leverancier_warning: boolean
          leverancier_warning_reason: string | null
          levering_datum: string | null
          location_id: string
          notities: string | null
          ontvangen_at: string | null
          ontvangen_door: string | null
          ontvangst_status: Database["public"]["Enums"]["goods_receipt_status"]
          organization_id: string
          pakbon_nummer: string | null
          temp_gekoeld_gemeten: number | null
          temp_gemeten_at: string | null
          temp_gemeten_door: string | null
          temp_vries_gemeten: number | null
          totaal_regels_afwijking: number | null
          totaal_regels_akkoord: number | null
          totaal_regels_verwacht: number | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          ai_model_version?: string | null
          ai_parse_confidence?: number | null
          ai_parse_status?:
            | Database["public"]["Enums"]["pakbon_ai_parse_status"]
            | null
          ai_raw_response?: Json | null
          bestelling_id?: string | null
          created_at?: string
          email_raw_url?: string | null
          heeft_strict_temp_alarm?: boolean
          id?: string
          leverancier_id?: string | null
          leverancier_warning?: boolean
          leverancier_warning_reason?: string | null
          levering_datum?: string | null
          location_id: string
          notities?: string | null
          ontvangen_at?: string | null
          ontvangen_door?: string | null
          ontvangst_status?: Database["public"]["Enums"]["goods_receipt_status"]
          organization_id: string
          pakbon_nummer?: string | null
          temp_gekoeld_gemeten?: number | null
          temp_gemeten_at?: string | null
          temp_gemeten_door?: string | null
          temp_vries_gemeten?: number | null
          totaal_regels_afwijking?: number | null
          totaal_regels_akkoord?: number | null
          totaal_regels_verwacht?: number | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          ai_model_version?: string | null
          ai_parse_confidence?: number | null
          ai_parse_status?:
            | Database["public"]["Enums"]["pakbon_ai_parse_status"]
            | null
          ai_raw_response?: Json | null
          bestelling_id?: string | null
          created_at?: string
          email_raw_url?: string | null
          heeft_strict_temp_alarm?: boolean
          id?: string
          leverancier_id?: string | null
          leverancier_warning?: boolean
          leverancier_warning_reason?: string | null
          levering_datum?: string | null
          location_id?: string
          notities?: string | null
          ontvangen_at?: string | null
          ontvangen_door?: string | null
          ontvangst_status?: Database["public"]["Enums"]["goods_receipt_status"]
          organization_id?: string
          pakbon_nummer?: string | null
          temp_gekoeld_gemeten?: number | null
          temp_gemeten_at?: string | null
          temp_gemeten_door?: string | null
          temp_vries_gemeten?: number | null
          totaal_regels_afwijking?: number | null
          totaal_regels_akkoord?: number | null
          totaal_regels_verwacht?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_bestelling_id_fkey"
            columns: ["bestelling_id"]
            isOneToOne: false
            referencedRelation: "interne_bestellingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      halffabricaat_methodes: {
        Row: {
          batch_nummer_template: string | null
          created_at: string | null
          houdbaarheid: number | null
          id: string
          instructie: string | null
          output_eenheid: string
          output_gewicht_per_stuk_g: number | null
          output_hoeveelheid: number
          recept_id: string
          sort_order: number | null
          standaard_duur: number
          sub_recept_id: string | null
          type: string
          visuele_eenheid: string
        }
        Insert: {
          batch_nummer_template?: string | null
          created_at?: string | null
          houdbaarheid?: number | null
          id?: string
          instructie?: string | null
          output_eenheid: string
          output_gewicht_per_stuk_g?: number | null
          output_hoeveelheid: number
          recept_id: string
          sort_order?: number | null
          standaard_duur: number
          sub_recept_id?: string | null
          type: string
          visuele_eenheid: string
        }
        Update: {
          batch_nummer_template?: string | null
          created_at?: string | null
          houdbaarheid?: number | null
          id?: string
          instructie?: string | null
          output_eenheid?: string
          output_gewicht_per_stuk_g?: number | null
          output_hoeveelheid?: number
          recept_id?: string
          sort_order?: number | null
          standaard_duur?: number
          sub_recept_id?: string | null
          type?: string
          visuele_eenheid?: string
        }
        Relationships: [
          {
            foreignKeyName: "halffabricaat_methodes_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "halffabricaat_methodes_sub_recept_id_fkey"
            columns: ["sub_recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_aliassen: {
        Row: {
          alias_naam: string
          artikelnummer: string | null
          bron: string
          created_at: string
          id: string
          ingredient_id: string
          leverancier_id: string | null
          updated_at: string
        }
        Insert: {
          alias_naam: string
          artikelnummer?: string | null
          bron?: string
          created_at?: string
          id?: string
          ingredient_id: string
          leverancier_id?: string | null
          updated_at?: string
        }
        Update: {
          alias_naam?: string
          artikelnummer?: string | null
          bron?: string
          created_at?: string
          id?: string
          ingredient_id?: string
          leverancier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_aliassen_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_aliassen_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_allergenen: {
        Row: {
          allergeen_id: string
          bron: string | null
          id: string
          ingredient_id: string
          laatst_bijgewerkt: string
          status: string
        }
        Insert: {
          allergeen_id: string
          bron?: string | null
          id?: string
          ingredient_id: string
          laatst_bijgewerkt?: string
          status: string
        }
        Update: {
          allergeen_id?: string
          bron?: string | null
          id?: string
          ingredient_id?: string
          laatst_bijgewerkt?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_allergenen_allergeen_id_fkey"
            columns: ["allergeen_id"]
            isOneToOne: false
            referencedRelation: "allergenen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_allergenen_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_packagings: {
        Row: {
          created_at: string
          factor_confidence: number | null
          factor_source: string | null
          factor_to_base: number | null
          id: string
          ingredient_id: string
          is_piece: boolean
          is_weighted: boolean
          label: string
          leverancier_id: string | null
          notes: string | null
          pieces_in_package: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          factor_confidence?: number | null
          factor_source?: string | null
          factor_to_base?: number | null
          id?: string
          ingredient_id: string
          is_piece?: boolean
          is_weighted?: boolean
          label: string
          leverancier_id?: string | null
          notes?: string | null
          pieces_in_package?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          factor_confidence?: number | null
          factor_source?: string | null
          factor_to_base?: number | null
          id?: string
          ingredient_id?: string
          is_piece?: boolean
          is_weighted?: boolean
          label?: string
          leverancier_id?: string | null
          notes?: string | null
          pieces_in_package?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_packagings_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_packagings_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredienten: {
        Row: {
          archived_at: string | null
          base_unit: string | null
          btw_percentage: number | null
          categorie: string
          conversion_confidence: number | null
          conversion_source: string | null
          created_at: string
          created_by_source: string | null
          density_g_per_ml: number | null
          eenheid: string
          haccp_categorie: Database["public"]["Enums"]["haccp_categorie"] | null
          haccp_strict_temp_max: number | null
          id: string
          is_archived: boolean
          is_halffabricaat: boolean
          is_variable_weight: boolean
          kostprijs: number | null
          kostprijs_bron: string | null
          kostprijs_laatst_bijgewerkt: string | null
          location_id: string
          max_voorraad: number | null
          measure_class: string | null
          min_voorraad: number
          naam: string
          opslag_locatie: string | null
          opslag_type: string | null
          prefer_piece_display: boolean
          recept_id: string | null
          updated_at: string
          voorraad: number
          weight_per_piece_g: number | null
          weight_per_piece_max_g: number | null
          weight_per_piece_min_g: number | null
          yield_percentage: number
        }
        Insert: {
          archived_at?: string | null
          base_unit?: string | null
          btw_percentage?: number | null
          categorie: string
          conversion_confidence?: number | null
          conversion_source?: string | null
          created_at?: string
          created_by_source?: string | null
          density_g_per_ml?: number | null
          eenheid: string
          haccp_categorie?:
            | Database["public"]["Enums"]["haccp_categorie"]
            | null
          haccp_strict_temp_max?: number | null
          id?: string
          is_archived?: boolean
          is_halffabricaat?: boolean
          is_variable_weight?: boolean
          kostprijs?: number | null
          kostprijs_bron?: string | null
          kostprijs_laatst_bijgewerkt?: string | null
          location_id: string
          max_voorraad?: number | null
          measure_class?: string | null
          min_voorraad?: number
          naam: string
          opslag_locatie?: string | null
          opslag_type?: string | null
          prefer_piece_display?: boolean
          recept_id?: string | null
          updated_at?: string
          voorraad?: number
          weight_per_piece_g?: number | null
          weight_per_piece_max_g?: number | null
          weight_per_piece_min_g?: number | null
          yield_percentage?: number
        }
        Update: {
          archived_at?: string | null
          base_unit?: string | null
          btw_percentage?: number | null
          categorie?: string
          conversion_confidence?: number | null
          conversion_source?: string | null
          created_at?: string
          created_by_source?: string | null
          density_g_per_ml?: number | null
          eenheid?: string
          haccp_categorie?:
            | Database["public"]["Enums"]["haccp_categorie"]
            | null
          haccp_strict_temp_max?: number | null
          id?: string
          is_archived?: boolean
          is_halffabricaat?: boolean
          is_variable_weight?: boolean
          kostprijs?: number | null
          kostprijs_bron?: string | null
          kostprijs_laatst_bijgewerkt?: string | null
          location_id?: string
          max_voorraad?: number | null
          measure_class?: string | null
          min_voorraad?: number
          naam?: string
          opslag_locatie?: string | null
          opslag_type?: string | null
          prefer_piece_display?: boolean
          recept_id?: string | null
          updated_at?: string
          voorraad?: number
          weight_per_piece_g?: number | null
          weight_per_piece_max_g?: number | null
          weight_per_piece_min_g?: number | null
          yield_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingredienten_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredienten_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
        ]
      }
      interne_bestellingen: {
        Row: {
          aangevraagd_door: string | null
          aangevraagd_op: string
          created_at: string
          geaccepteerd_op: string | null
          gewenste_datum: string | null
          id: string
          naar_location_id: string
          notities: string | null
          ontvangen_op: string | null
          organization_id: string
          status: string
          updated_at: string
          van_location_id: string
          verzonden_op: string | null
        }
        Insert: {
          aangevraagd_door?: string | null
          aangevraagd_op?: string
          created_at?: string
          geaccepteerd_op?: string | null
          gewenste_datum?: string | null
          id?: string
          naar_location_id: string
          notities?: string | null
          ontvangen_op?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          van_location_id: string
          verzonden_op?: string | null
        }
        Update: {
          aangevraagd_door?: string | null
          aangevraagd_op?: string
          created_at?: string
          geaccepteerd_op?: string | null
          gewenste_datum?: string | null
          id?: string
          naar_location_id?: string
          notities?: string | null
          ontvangen_op?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          van_location_id?: string
          verzonden_op?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interne_bestellingen_aangevraagd_door_fkey"
            columns: ["aangevraagd_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interne_bestellingen_naar_location_id_fkey"
            columns: ["naar_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interne_bestellingen_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interne_bestellingen_van_location_id_fkey"
            columns: ["van_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      interne_bestelregels: {
        Row: {
          bestelling_id: string
          created_at: string
          eenheid: string
          geaccepteerde_hoeveelheid: number | null
          gevraagde_hoeveelheid: number
          id: string
          ingredient_id: string | null
          omschrijving: string
          ontvangen_hoeveelheid: number | null
          recept_id: string | null
          verzonden_hoeveelheid: number | null
        }
        Insert: {
          bestelling_id: string
          created_at?: string
          eenheid: string
          geaccepteerde_hoeveelheid?: number | null
          gevraagde_hoeveelheid: number
          id?: string
          ingredient_id?: string | null
          omschrijving: string
          ontvangen_hoeveelheid?: number | null
          recept_id?: string | null
          verzonden_hoeveelheid?: number | null
        }
        Update: {
          bestelling_id?: string
          created_at?: string
          eenheid?: string
          geaccepteerde_hoeveelheid?: number | null
          gevraagde_hoeveelheid?: number
          id?: string
          ingredient_id?: string | null
          omschrijving?: string
          ontvangen_hoeveelheid?: number | null
          recept_id?: string | null
          verzonden_hoeveelheid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interne_bestelregels_bestelling_id_fkey"
            columns: ["bestelling_id"]
            isOneToOne: false
            referencedRelation: "interne_bestellingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interne_bestelregels_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interne_bestelregels_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
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
      label_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          label_breedte_mm: number | null
          label_hoogte_mm: number | null
          location_id: string
          naam: string
          type: string
          velden: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label_breedte_mm?: number | null
          label_hoogte_mm?: number | null
          location_id: string
          naam: string
          type: string
          velden?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label_breedte_mm?: number | null
          label_hoogte_mm?: number | null
          location_id?: string
          naam?: string
          type?: string
          velden?: Json
        }
        Relationships: [
          {
            foreignKeyName: "label_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      leverancier_aliassen: {
        Row: {
          alias_naam: string
          bron: string
          created_at: string
          id: string
          leverancier_id: string
          updated_at: string
        }
        Insert: {
          alias_naam: string
          bron?: string
          created_at?: string
          id?: string
          leverancier_id: string
          updated_at?: string
        }
        Update: {
          alias_naam?: string
          bron?: string
          created_at?: string
          id?: string
          leverancier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leverancier_aliassen_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
        ]
      }
      leverancier_prompt_examples: {
        Row: {
          approved_by: string | null
          created_at: string
          example_pakbon_storage_url: string
          expected_output: Json
          id: string
          is_active: boolean
          leverancier_id: string
          quality_score: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          example_pakbon_storage_url: string
          expected_output: Json
          id?: string
          is_active?: boolean
          leverancier_id: string
          quality_score?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          example_pakbon_storage_url?: string
          expected_output?: Json
          id?: string
          is_active?: boolean
          leverancier_id?: string
          quality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leverancier_prompt_examples_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
        ]
      }
      leveranciers: {
        Row: {
          api_type: string | null
          bestelmethode_default: Database["public"]["Enums"]["bestel_methode"]
          contactpersoon: string | null
          created_at: string
          email: string | null
          email_domains: string[] | null
          id: string
          is_actief: boolean
          klantnummer: string | null
          koppeling_type: string
          location_id: string
          naam: string
          notities: string | null
          telefoon: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          api_type?: string | null
          bestelmethode_default?: Database["public"]["Enums"]["bestel_methode"]
          contactpersoon?: string | null
          created_at?: string
          email?: string | null
          email_domains?: string[] | null
          id?: string
          is_actief?: boolean
          klantnummer?: string | null
          koppeling_type?: string
          location_id: string
          naam: string
          notities?: string | null
          telefoon?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          api_type?: string | null
          bestelmethode_default?: Database["public"]["Enums"]["bestel_methode"]
          contactpersoon?: string | null
          created_at?: string
          email?: string | null
          email_domains?: string[] | null
          id?: string
          is_actief?: boolean
          klantnummer?: string | null
          koppeling_type?: string
          location_id?: string
          naam?: string
          notities?: string | null
          telefoon?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leveranciers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      leveranciers_artikelen: {
        Row: {
          artikel_naam: string
          artikel_nummer: string | null
          confirmation_count: number
          created_at: string
          ean_code: string | null
          factor_source: string
          id: string
          import_bestandsnaam: string | null
          ingredient_id: string
          is_actief: boolean
          is_weighted: boolean
          laatst_geimporteerd: string | null
          laatst_gesynchroniseerd: string | null
          last_confirmed_at: string | null
          leverancier_id: string
          prijs_per_eenheid: number | null
          prijs_per_verpakking: number | null
          type: string | null
          updated_at: string
          verpakking_eenheid: string | null
          verpakking_hoeveelheid: number | null
          verpakking_label: string | null
        }
        Insert: {
          artikel_naam: string
          artikel_nummer?: string | null
          confirmation_count?: number
          created_at?: string
          ean_code?: string | null
          factor_source?: string
          id?: string
          import_bestandsnaam?: string | null
          ingredient_id: string
          is_actief?: boolean
          is_weighted?: boolean
          laatst_geimporteerd?: string | null
          laatst_gesynchroniseerd?: string | null
          last_confirmed_at?: string | null
          leverancier_id: string
          prijs_per_eenheid?: number | null
          prijs_per_verpakking?: number | null
          type?: string | null
          updated_at?: string
          verpakking_eenheid?: string | null
          verpakking_hoeveelheid?: number | null
          verpakking_label?: string | null
        }
        Update: {
          artikel_naam?: string
          artikel_nummer?: string | null
          confirmation_count?: number
          created_at?: string
          ean_code?: string | null
          factor_source?: string
          id?: string
          import_bestandsnaam?: string | null
          ingredient_id?: string
          is_actief?: boolean
          is_weighted?: boolean
          laatst_geimporteerd?: string | null
          laatst_gesynchroniseerd?: string | null
          last_confirmed_at?: string | null
          leverancier_id?: string
          prijs_per_eenheid?: number | null
          prijs_per_verpakking?: number | null
          type?: string | null
          updated_at?: string
          verpakking_eenheid?: string | null
          verpakking_hoeveelheid?: number | null
          verpakking_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leveranciers_artikelen_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leveranciers_artikelen_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
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
      location_operating_exceptions: {
        Row: {
          close_time: string | null
          created_at: string
          exception_date: string
          exception_type: Database["public"]["Enums"]["operating_exception_type"]
          id: string
          label: string | null
          location_id: string
          open_time: string | null
          service_type: string
          source: string
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          exception_date: string
          exception_type: Database["public"]["Enums"]["operating_exception_type"]
          id?: string
          label?: string | null
          location_id: string
          open_time?: string | null
          service_type?: string
          source?: string
        }
        Update: {
          close_time?: string | null
          created_at?: string
          exception_date?: string
          exception_type?: Database["public"]["Enums"]["operating_exception_type"]
          id?: string
          label?: string | null
          location_id?: string
          open_time?: string | null
          service_type?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_operating_exceptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_operating_hours: {
        Row: {
          close_time: string
          created_at: string
          day_of_week: number
          id: string
          location_id: string
          open_time: string
          service_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          close_time: string
          created_at?: string
          day_of_week: number
          id?: string
          location_id: string
          open_time: string
          service_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          close_time?: string
          created_at?: string
          day_of_week?: number
          id?: string
          location_id?: string
          open_time?: string
          service_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_operating_hours_location_id_fkey"
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
          ai_bevoegdheden_keuken: Json | null
          assistent_min_waarde_overschot: number | null
          assistent_min_waarde_verlopen: number | null
          besteladvies_buffer_percentage: number | null
          brand_color_accent: string | null
          brand_color_primary: string | null
          brand_color_secondary: string | null
          created_at: string
          description_short: string | null
          einde_dienst_evaluatie_tijd: string | null
          gerecht_categorieen: Json | null
          google_place_id: string | null
          guest_greeting: string | null
          haccp_freeze_tijd: string | null
          haccp_kern_min: number | null
          haccp_koeling_max: number | null
          haccp_vriezer_max: number | null
          haccp_warmhouden_min: number | null
          hero_image_url: string | null
          id: string
          ingredient_categorieen: Json | null
          is_active: boolean
          logo_url: string | null
          name: string
          organization_id: string
          pakbon_cc_addresses: string[] | null
          pakbon_klacht_cc: string[]
          pakbon_klacht_email: string | null
          pakbon_slug: string | null
          recept_categorieen: Json | null
          role_in_organization: string | null
          slug: string
          standaard_tijden_per_type: Json | null
          start_dag_evaluatie_tijd: string | null
          timezone: string
          tone_of_voice: string | null
          tripadvisor_url: string | null
          updated_at: string
          whatsapp_business_account_id: string | null
          whatsapp_enabled: boolean | null
          whatsapp_phone_number_id: string | null
        }
        Insert: {
          ai_bevoegdheden_keuken?: Json | null
          assistent_min_waarde_overschot?: number | null
          assistent_min_waarde_verlopen?: number | null
          besteladvies_buffer_percentage?: number | null
          brand_color_accent?: string | null
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          created_at?: string
          description_short?: string | null
          einde_dienst_evaluatie_tijd?: string | null
          gerecht_categorieen?: Json | null
          google_place_id?: string | null
          guest_greeting?: string | null
          haccp_freeze_tijd?: string | null
          haccp_kern_min?: number | null
          haccp_koeling_max?: number | null
          haccp_vriezer_max?: number | null
          haccp_warmhouden_min?: number | null
          hero_image_url?: string | null
          id?: string
          ingredient_categorieen?: Json | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          organization_id: string
          pakbon_cc_addresses?: string[] | null
          pakbon_klacht_cc?: string[]
          pakbon_klacht_email?: string | null
          pakbon_slug?: string | null
          recept_categorieen?: Json | null
          role_in_organization?: string | null
          slug: string
          standaard_tijden_per_type?: Json | null
          start_dag_evaluatie_tijd?: string | null
          timezone?: string
          tone_of_voice?: string | null
          tripadvisor_url?: string | null
          updated_at?: string
          whatsapp_business_account_id?: string | null
          whatsapp_enabled?: boolean | null
          whatsapp_phone_number_id?: string | null
        }
        Update: {
          ai_bevoegdheden_keuken?: Json | null
          assistent_min_waarde_overschot?: number | null
          assistent_min_waarde_verlopen?: number | null
          besteladvies_buffer_percentage?: number | null
          brand_color_accent?: string | null
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          created_at?: string
          description_short?: string | null
          einde_dienst_evaluatie_tijd?: string | null
          gerecht_categorieen?: Json | null
          google_place_id?: string | null
          guest_greeting?: string | null
          haccp_freeze_tijd?: string | null
          haccp_kern_min?: number | null
          haccp_koeling_max?: number | null
          haccp_vriezer_max?: number | null
          haccp_warmhouden_min?: number | null
          hero_image_url?: string | null
          id?: string
          ingredient_categorieen?: Json | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          organization_id?: string
          pakbon_cc_addresses?: string[] | null
          pakbon_klacht_cc?: string[]
          pakbon_klacht_email?: string | null
          pakbon_slug?: string | null
          recept_categorieen?: Json | null
          role_in_organization?: string | null
          slug?: string
          standaard_tijden_per_type?: Json | null
          start_dag_evaluatie_tijd?: string | null
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
      medewerkers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_actief: boolean | null
          laatst_actief: string | null
          location_id: string
          naam: string
          rol: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_actief?: boolean | null
          laatst_actief?: string | null
          location_id: string
          naam: string
          rol?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_actief?: boolean | null
          laatst_actief?: string | null
          location_id?: string
          naam?: string
          rol?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medewerkers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mep_favorieten: {
        Row: {
          category: string
          created_at: string
          id: string
          location_id: string
          methode_id: string | null
          recept_id: string | null
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          location_id: string
          methode_id?: string | null
          recept_id?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          location_id?: string
          methode_id?: string | null
          recept_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mep_favorieten_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mep_favorieten_methode_id_fkey"
            columns: ["methode_id"]
            isOneToOne: false
            referencedRelation: "halffabricaat_methodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mep_favorieten_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
        ]
      }
      mep_task_completions: {
        Row: {
          batch_nummer: string | null
          completed_at: string
          id: string
          kok_medewerker_id: string | null
          medewerker_id: string
          notitie: string | null
          output_base_unit: string | null
          task_id: string
          temperatuur: number | null
          units_gemaakt: number
          verwachte_output_base: number | null
          verwachte_output_gram: number | null
          werkelijke_output_base: number | null
          werkelijke_output_gram: number | null
          yield_percentage: number | null
        }
        Insert: {
          batch_nummer?: string | null
          completed_at?: string
          id?: string
          kok_medewerker_id?: string | null
          medewerker_id: string
          notitie?: string | null
          output_base_unit?: string | null
          task_id: string
          temperatuur?: number | null
          units_gemaakt?: number
          verwachte_output_base?: number | null
          verwachte_output_gram?: number | null
          werkelijke_output_base?: number | null
          werkelijke_output_gram?: number | null
          yield_percentage?: number | null
        }
        Update: {
          batch_nummer?: string | null
          completed_at?: string
          id?: string
          kok_medewerker_id?: string | null
          medewerker_id?: string
          notitie?: string | null
          output_base_unit?: string | null
          task_id?: string
          temperatuur?: number | null
          units_gemaakt?: number
          verwachte_output_base?: number | null
          verwachte_output_gram?: number | null
          werkelijke_output_base?: number | null
          werkelijke_output_gram?: number | null
          yield_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mep_task_completions_kok_medewerker_id_fkey"
            columns: ["kok_medewerker_id"]
            isOneToOne: false
            referencedRelation: "medewerkers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mep_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mep_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mep_tasks: {
        Row: {
          assigned_to: string | null
          bron: string | null
          bron_details: Json | null
          category: string
          created_at: string
          deadline: string | null
          id: string
          location_id: string
          methode_id: string | null
          notes: string | null
          prioriteit: string
          recept_id: string | null
          status: string
          target_eenheid: string | null
          task_date: string
          title: string
          units: number | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          bron?: string | null
          bron_details?: Json | null
          category: string
          created_at?: string
          deadline?: string | null
          id?: string
          location_id: string
          methode_id?: string | null
          notes?: string | null
          prioriteit?: string
          recept_id?: string | null
          status?: string
          target_eenheid?: string | null
          task_date: string
          title: string
          units?: number | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          bron?: string | null
          bron_details?: Json | null
          category?: string
          created_at?: string
          deadline?: string | null
          id?: string
          location_id?: string
          methode_id?: string | null
          notes?: string | null
          prioriteit?: string
          recept_id?: string | null
          status?: string
          target_eenheid?: string | null
          task_date?: string
          title?: string
          units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mep_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mep_tasks_methode_id_fkey"
            columns: ["methode_id"]
            isOneToOne: false
            referencedRelation: "halffabricaat_methodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mep_tasks_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
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
          application_id: string | null
          applied_at: string
          availability_start: string | null
          created_at: string
          current_phase_id: string | null
          email: string
          first_name: string
          hours_preference: string | null
          id: string
          last_name: string
          location_id: string
          motivation: string | null
          notes: string | null
          phone: string | null
          positions: Json | null
          source: string | null
          source_tag: string | null
          status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          applied_at?: string
          availability_start?: string | null
          created_at?: string
          current_phase_id?: string | null
          email: string
          first_name: string
          hours_preference?: string | null
          id?: string
          last_name: string
          location_id: string
          motivation?: string | null
          notes?: string | null
          phone?: string | null
          positions?: Json | null
          source?: string | null
          source_tag?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          applied_at?: string
          availability_start?: string | null
          created_at?: string
          current_phase_id?: string | null
          email?: string
          first_name?: string
          hours_preference?: string | null
          id?: string
          last_name?: string
          location_id?: string
          motivation?: string | null
          notes?: string | null
          phone?: string | null
          positions?: Json | null
          source?: string | null
          source_tag?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_candidates_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "public_applications"
            referencedColumns: ["id"]
          },
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
          interne_bestellingen_enabled: boolean | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_contact?: string | null
          created_at?: string
          id?: string
          interne_bestellingen_enabled?: boolean | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_contact?: string | null
          created_at?: string
          id?: string
          interne_bestellingen_enabled?: boolean | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pakbon_email_intake: {
        Row: {
          ai_parse_status: Database["public"]["Enums"]["pakbon_intake_status"]
          attachments_urls: string[] | null
          created_at: string
          error_reason: string | null
          from_address: string
          goods_receipt_id: string | null
          id: string
          matched_leverancier_id: string | null
          matched_location_id: string | null
          raw_email_url: string | null
          received_at: string
          resend_message_id: string | null
          sender_match_leverancier_ids: string[]
          subject: string | null
          to_address: string
        }
        Insert: {
          ai_parse_status?: Database["public"]["Enums"]["pakbon_intake_status"]
          attachments_urls?: string[] | null
          created_at?: string
          error_reason?: string | null
          from_address: string
          goods_receipt_id?: string | null
          id?: string
          matched_leverancier_id?: string | null
          matched_location_id?: string | null
          raw_email_url?: string | null
          received_at?: string
          resend_message_id?: string | null
          sender_match_leverancier_ids?: string[]
          subject?: string | null
          to_address: string
        }
        Update: {
          ai_parse_status?: Database["public"]["Enums"]["pakbon_intake_status"]
          attachments_urls?: string[] | null
          created_at?: string
          error_reason?: string | null
          from_address?: string
          goods_receipt_id?: string | null
          id?: string
          matched_leverancier_id?: string | null
          matched_location_id?: string | null
          raw_email_url?: string | null
          received_at?: string
          resend_message_id?: string | null
          sender_match_leverancier_ids?: string[]
          subject?: string | null
          to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "pakbon_email_intake_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pakbon_email_intake_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts_chef_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pakbon_email_intake_matched_leverancier_id_fkey"
            columns: ["matched_leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pakbon_email_intake_matched_location_id_fkey"
            columns: ["matched_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
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
      print_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          label_data: Json
          location_id: string
          medewerker_id: string | null
          printer_id: string | null
          status: string | null
          template_id: string | null
          zpl_output: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          label_data: Json
          location_id: string
          medewerker_id?: string | null
          printer_id?: string | null
          status?: string | null
          template_id?: string | null
          zpl_output?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          label_data?: Json
          location_id?: string
          medewerker_id?: string | null
          printer_id?: string | null
          status?: string | null
          template_id?: string | null
          zpl_output?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_logs_medewerker_id_fkey"
            columns: ["medewerker_id"]
            isOneToOne: false
            referencedRelation: "medewerkers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_logs_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printer_configuraties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "label_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      printer_configuraties: {
        Row: {
          created_at: string | null
          id: string
          is_actief: boolean | null
          laatst_geprint: string | null
          label_breedte_mm: number | null
          label_hoogte_mm: number | null
          location_id: string
          naam: string
          print_bridge_url: string | null
          print_darkness: number | null
          print_speed: number | null
          printer_ip: string | null
          printer_port: number | null
          printer_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_actief?: boolean | null
          laatst_geprint?: string | null
          label_breedte_mm?: number | null
          label_hoogte_mm?: number | null
          location_id: string
          naam?: string
          print_bridge_url?: string | null
          print_darkness?: number | null
          print_speed?: number | null
          printer_ip?: string | null
          printer_port?: number | null
          printer_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_actief?: boolean | null
          laatst_geprint?: string | null
          label_breedte_mm?: number | null
          label_hoogte_mm?: number | null
          location_id?: string
          naam?: string
          print_bridge_url?: string | null
          print_darkness?: number | null
          print_speed?: number | null
          printer_ip?: string | null
          printer_port?: number | null
          printer_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "printer_configuraties_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      productie_batches: {
        Row: {
          batch_nummer: string
          created_at: string
          eenheid: string
          hoeveelheid: number
          houdbaar_tot: string | null
          id: string
          location_id: string
          medewerker_id: string | null
          methode_id: string | null
          notitie: string | null
          productie_datum: string
          recept_id: string
          status: string
          task_completion_id: string | null
          unit_cost_eur: number | null
        }
        Insert: {
          batch_nummer: string
          created_at?: string
          eenheid: string
          hoeveelheid: number
          houdbaar_tot?: string | null
          id?: string
          location_id: string
          medewerker_id?: string | null
          methode_id?: string | null
          notitie?: string | null
          productie_datum?: string
          recept_id: string
          status?: string
          task_completion_id?: string | null
          unit_cost_eur?: number | null
        }
        Update: {
          batch_nummer?: string
          created_at?: string
          eenheid?: string
          hoeveelheid?: number
          houdbaar_tot?: string | null
          id?: string
          location_id?: string
          medewerker_id?: string | null
          methode_id?: string | null
          notitie?: string | null
          productie_datum?: string
          recept_id?: string
          status?: string
          task_completion_id?: string | null
          unit_cost_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "productie_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productie_batches_methode_id_fkey"
            columns: ["methode_id"]
            isOneToOne: false
            referencedRelation: "halffabricaat_methodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productie_batches_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productie_batches_task_completion_id_fkey"
            columns: ["task_completion_id"]
            isOneToOne: false
            referencedRelation: "mep_task_completions"
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
      public_application_settings: {
        Row: {
          available_positions: Json
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          show_hours: boolean
          show_start_date: boolean
          slug: string
          success_message: string
          updated_at: string
          welcome_text: string | null
          welcome_title: string
        }
        Insert: {
          available_positions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          show_hours?: boolean
          show_start_date?: boolean
          slug: string
          success_message?: string
          updated_at?: string
          welcome_text?: string | null
          welcome_title?: string
        }
        Update: {
          available_positions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          show_hours?: boolean
          show_start_date?: boolean
          slug?: string
          success_message?: string
          updated_at?: string
          welcome_text?: string | null
          welcome_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_application_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_applications: {
        Row: {
          availability_start: string | null
          candidate_id: string | null
          created_at: string
          email: string
          first_name: string
          hours_preference: string | null
          id: string
          ip_hash: string | null
          last_name: string
          location_id: string
          motivation: string | null
          phone: string | null
          positions: Json
          source: string
          source_tag: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          availability_start?: string | null
          candidate_id?: string | null
          created_at?: string
          email: string
          first_name: string
          hours_preference?: string | null
          id?: string
          ip_hash?: string | null
          last_name: string
          location_id: string
          motivation?: string | null
          phone?: string | null
          positions?: Json
          source?: string
          source_tag?: string | null
          status?: string
          user_agent?: string | null
        }
        Update: {
          availability_start?: string | null
          candidate_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          hours_preference?: string | null
          id?: string
          ip_hash?: string | null
          last_name?: string
          location_id?: string
          motivation?: string | null
          phone?: string | null
          positions?: Json
          source?: string
          source_tag?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "onboarding_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_applications_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      recept_allergenen: {
        Row: {
          allergeen_id: string
          berekend_op: string | null
          id: string
          recept_id: string
          status: string
        }
        Insert: {
          allergeen_id: string
          berekend_op?: string | null
          id?: string
          recept_id: string
          status?: string
        }
        Update: {
          allergeen_id?: string
          berekend_op?: string | null
          id?: string
          recept_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recept_allergenen_allergeen_id_fkey"
            columns: ["allergeen_id"]
            isOneToOne: false
            referencedRelation: "allergenen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recept_allergenen_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
        ]
      }
      recept_ingredienten: {
        Row: {
          created_at: string | null
          eenheid: string | null
          hoeveelheid: number
          id: string
          ingredient_id: string
          kostprijs_snapshot: number | null
          recept_id: string
          sort_order: number | null
          yield_snapshot: number | null
        }
        Insert: {
          created_at?: string | null
          eenheid?: string | null
          hoeveelheid: number
          id?: string
          ingredient_id: string
          kostprijs_snapshot?: number | null
          recept_id: string
          sort_order?: number | null
          yield_snapshot?: number | null
        }
        Update: {
          created_at?: string | null
          eenheid?: string | null
          hoeveelheid?: number
          id?: string
          ingredient_id?: string
          kostprijs_snapshot?: number | null
          recept_id?: string
          sort_order?: number | null
          yield_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recept_ingredienten_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recept_ingredienten_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
        ]
      }
      recepten: {
        Row: {
          actieve_bereidingstijd: number | null
          arbeidskostprijs: number | null
          archived_at: string | null
          bereiding: string | null
          categorie: string
          created_at: string | null
          id: string
          is_archived: boolean | null
          kostprijs_berekend_op: string | null
          kostprijs_per_portie: number | null
          location_id: string
          naam: string
          passieve_bereidingstijd: number | null
          porties: number
          productie_location_id: string | null
          totale_ingredientkostprijs: number | null
          totale_kostprijs: number | null
          type: string
          updated_at: string | null
          verkoopprijs: number | null
          versie: number | null
        }
        Insert: {
          actieve_bereidingstijd?: number | null
          arbeidskostprijs?: number | null
          archived_at?: string | null
          bereiding?: string | null
          categorie: string
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          kostprijs_berekend_op?: string | null
          kostprijs_per_portie?: number | null
          location_id: string
          naam: string
          passieve_bereidingstijd?: number | null
          porties?: number
          productie_location_id?: string | null
          totale_ingredientkostprijs?: number | null
          totale_kostprijs?: number | null
          type?: string
          updated_at?: string | null
          verkoopprijs?: number | null
          versie?: number | null
        }
        Update: {
          actieve_bereidingstijd?: number | null
          arbeidskostprijs?: number | null
          archived_at?: string | null
          bereiding?: string | null
          categorie?: string
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          kostprijs_berekend_op?: string | null
          kostprijs_per_portie?: number | null
          location_id?: string
          naam?: string
          passieve_bereidingstijd?: number | null
          porties?: number
          productie_location_id?: string | null
          totale_ingredientkostprijs?: number | null
          totale_kostprijs?: number | null
          type?: string
          updated_at?: string | null
          verkoopprijs?: number | null
          versie?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recepten_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepten_productie_location_id_fkey"
            columns: ["productie_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_yield: {
        Row: {
          assertion_period: unknown
          correction_reason: string | null
          created_at: string
          created_by: string | null
          effective_period: unknown
          halffabricaat_methode_id: string
          id: string
          source: string
          yield_pct: number
        }
        Insert: {
          assertion_period: unknown
          correction_reason?: string | null
          created_at?: string
          created_by?: string | null
          effective_period: unknown
          halffabricaat_methode_id: string
          id?: string
          source: string
          yield_pct: number
        }
        Update: {
          assertion_period?: unknown
          correction_reason?: string | null
          created_at?: string
          created_by?: string | null
          effective_period?: unknown
          halffabricaat_methode_id?: string
          id?: string
          source?: string
          yield_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_yield_halffabricaat_methode_id_fkey"
            columns: ["halffabricaat_methode_id"]
            isOneToOne: false
            referencedRelation: "halffabricaat_methodes"
            referencedColumns: ["id"]
          },
        ]
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
      staff_members: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          location_id: string | null
          metadata: Json | null
          organization_id: string
          role: Database["public"]["Enums"]["location_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          metadata?: Json | null
          organization_id: string
          role?: Database["public"]["Enums"]["location_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          metadata?: Json | null
          organization_id?: string
          role?: Database["public"]["Enums"]["location_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_lots: {
        Row: {
          base_unit: string
          created_at: string
          expires_at: string | null
          goods_receipt_id: string | null
          goods_receipt_line_id: string | null
          id: string
          ingredient_id: string
          initial_base: number
          notes: string | null
          packaging_id: string | null
          received_at: string
          remaining_base: number
          unit_cost_eur: number | null
          updated_at: string
        }
        Insert: {
          base_unit: string
          created_at?: string
          expires_at?: string | null
          goods_receipt_id?: string | null
          goods_receipt_line_id?: string | null
          id?: string
          ingredient_id: string
          initial_base: number
          notes?: string | null
          packaging_id?: string | null
          received_at?: string
          remaining_base: number
          unit_cost_eur?: number | null
          updated_at?: string
        }
        Update: {
          base_unit?: string
          created_at?: string
          expires_at?: string | null
          goods_receipt_id?: string | null
          goods_receipt_line_id?: string | null
          id?: string
          ingredient_id?: string
          initial_base?: number
          notes?: string | null
          packaging_id?: string | null
          received_at?: string
          remaining_base?: number
          unit_cost_eur?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_lots_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_lots_goods_receipt_id_fkey"
            columns: ["goods_receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts_chef_inbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_lots_goods_receipt_line_id_fkey"
            columns: ["goods_receipt_line_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_lots_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_lots_packaging_id_fkey"
            columns: ["packaging_id"]
            isOneToOne: false
            referencedRelation: "ingredient_packagings"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          base_unit: string
          created_at: string
          created_by: string | null
          delta_base: number
          id: number
          ingredient_id: string
          notes: string | null
          occurred_at: string
          reason: string
          reference_id: string | null
          reference_type: string | null
          stock_lot_id: string | null
        }
        Insert: {
          base_unit: string
          created_at?: string
          created_by?: string | null
          delta_base: number
          id?: number
          ingredient_id: string
          notes?: string | null
          occurred_at?: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          stock_lot_id?: string | null
        }
        Update: {
          base_unit?: string
          created_at?: string
          created_by?: string | null
          delta_base?: number
          id?: number
          ingredient_id?: string
          notes?: string | null
          occurred_at?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          stock_lot_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_lot_id_fkey"
            columns: ["stock_lot_id"]
            isOneToOne: false
            referencedRelation: "stock_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          bestelling_id: string | null
          created_at: string
          from_location_id: string
          id: string
          notes: string | null
          organization_id: string
          requested_at: string
          requested_by_id: string | null
          requested_by_type: Database["public"]["Enums"]["actor_type_enum"]
          status: string
          to_location_id: string
          updated_at: string
        }
        Insert: {
          bestelling_id?: string | null
          created_at?: string
          from_location_id: string
          id?: string
          notes?: string | null
          organization_id: string
          requested_at?: string
          requested_by_id?: string | null
          requested_by_type?: Database["public"]["Enums"]["actor_type_enum"]
          status?: string
          to_location_id: string
          updated_at?: string
        }
        Update: {
          bestelling_id?: string | null
          created_at?: string
          from_location_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          requested_at?: string
          requested_by_id?: string | null
          requested_by_type?: Database["public"]["Enums"]["actor_type_enum"]
          status?: string
          to_location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_bestelling_id_fkey"
            columns: ["bestelling_id"]
            isOneToOne: false
            referencedRelation: "interne_bestellingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      temperatuur_registraties: {
        Row: {
          actie_beschrijving: string | null
          actie_vereist: boolean
          created_at: string
          gemeten_door: string | null
          gemeten_op: string
          id: string
          in_range: boolean
          locatie_naam: string
          location_id: string
          max_temp: number | null
          min_temp: number | null
          temperatuur: number
          type: string
        }
        Insert: {
          actie_beschrijving?: string | null
          actie_vereist?: boolean
          created_at?: string
          gemeten_door?: string | null
          gemeten_op?: string
          id?: string
          in_range?: boolean
          locatie_naam: string
          location_id: string
          max_temp?: number | null
          min_temp?: number | null
          temperatuur: number
          type: string
        }
        Update: {
          actie_beschrijving?: string | null
          actie_vereist?: boolean
          created_at?: string
          gemeten_door?: string | null
          gemeten_op?: string
          id?: string
          in_range?: boolean
          locatie_naam?: string
          location_id?: string
          max_temp?: number | null
          min_temp?: number | null
          temperatuur?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "temperatuur_registraties_gemeten_door_fkey"
            columns: ["gemeten_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperatuur_registraties_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_cache: {
        Row: {
          created_at: string
          fingerprint: string
          hit_count: number
          id: string
          last_used_at: string | null
          leverancier_id: string | null
          leverancier_naam: string | null
          location_id: string | null
          template_data: Json
        }
        Insert: {
          created_at?: string
          fingerprint: string
          hit_count?: number
          id?: string
          last_used_at?: string | null
          leverancier_id?: string | null
          leverancier_naam?: string | null
          location_id?: string | null
          template_data: Json
        }
        Update: {
          created_at?: string
          fingerprint?: string
          hit_count?: number
          id?: string
          last_used_at?: string | null
          leverancier_id?: string | null
          leverancier_naam?: string | null
          location_id?: string | null
          template_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "template_cache_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_cache_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      transfer_items: {
        Row: {
          created_at: string
          eenheid: string
          id: string
          ingredient_id: string | null
          notes: string | null
          product_naam: string
          quantity: number
          recept_id: string | null
          transfer_id: string
        }
        Insert: {
          created_at?: string
          eenheid: string
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          product_naam: string
          quantity: number
          recept_id?: string | null
          transfer_id: string
        }
        Update: {
          created_at?: string
          eenheid?: string
          id?: string
          ingredient_id?: string | null
          notes?: string | null
          product_naam?: string
          quantity?: number
          recept_id?: string | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
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
      voorraad_bewegingen: {
        Row: {
          bron: string | null
          created_at: string
          hoeveelheid: number
          id: string
          ingredient_id: string
          medewerker_id: string | null
          opmerking: string | null
          referentie_id: string | null
          referentie_type: string | null
          type: string
        }
        Insert: {
          bron?: string | null
          created_at?: string
          hoeveelheid: number
          id?: string
          ingredient_id: string
          medewerker_id?: string | null
          opmerking?: string | null
          referentie_id?: string | null
          referentie_type?: string | null
          type: string
        }
        Update: {
          bron?: string | null
          created_at?: string
          hoeveelheid?: number
          id?: string
          ingredient_id?: string
          medewerker_id?: string | null
          opmerking?: string | null
          referentie_id?: string | null
          referentie_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "voorraad_bewegingen_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voorraad_bewegingen_medewerker_id_fkey"
            columns: ["medewerker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      waste_registraties: {
        Row: {
          categorie: string
          created_at: string
          eenheid: string
          geregistreerd_door: string | null
          geschatte_kosten: number | null
          hoeveelheid: number
          id: string
          ingredient_id: string | null
          location_id: string
          omschrijving: string | null
          recept_id: string | null
          reden: string | null
          waste_datum: string
        }
        Insert: {
          categorie: string
          created_at?: string
          eenheid: string
          geregistreerd_door?: string | null
          geschatte_kosten?: number | null
          hoeveelheid: number
          id?: string
          ingredient_id?: string | null
          location_id: string
          omschrijving?: string | null
          recept_id?: string | null
          reden?: string | null
          waste_datum?: string
        }
        Update: {
          categorie?: string
          created_at?: string
          eenheid?: string
          geregistreerd_door?: string | null
          geschatte_kosten?: number | null
          hoeveelheid?: number
          id?: string
          ingredient_id?: string | null
          location_id?: string
          omschrijving?: string | null
          recept_id?: string | null
          reden?: string | null
          waste_datum?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_registraties_geregistreerd_door_fkey"
            columns: ["geregistreerd_door"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_registraties_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_registraties_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_registraties_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
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
      gedeelde_halffabricaten_cross_locatie: {
        Row: {
          actief: boolean | null
          created_at: string | null
          gedeeld_product_id: string | null
          ingredient_id: string | null
          ontvangende_locatie_id: string | null
          ontvangende_locatie_naam: string | null
          product_type: string | null
          productie_locatie_id: string | null
          productie_locatie_naam: string | null
          recept_id: string | null
          recept_naam: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gedeelde_producten_per_locatie_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredienten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gedeelde_producten_per_locatie_locatie_id_fkey"
            columns: ["ontvangende_locatie_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gedeelde_producten_per_locatie_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recepten_location_id_fkey"
            columns: ["productie_locatie_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts_chef_inbox: {
        Row: {
          ai_generated: boolean | null
          ai_parse_confidence: number | null
          ai_parse_status:
            | Database["public"]["Enums"]["pakbon_ai_parse_status"]
            | null
          bestelling_id: string | null
          created_at: string | null
          has_gekoeld: boolean | null
          has_risicogroep: boolean | null
          has_vries: boolean | null
          id: string | null
          leverancier_id: string | null
          leverancier_naam: string | null
          leverancier_warning: boolean | null
          leverancier_warning_reason: string | null
          levering_datum: string | null
          location_id: string | null
          notities: string | null
          ontvangst_status:
            | Database["public"]["Enums"]["goods_receipt_status"]
            | null
          organization_id: string | null
          pakbon_nummer: string | null
          regels_count: number | null
          totaal_regels_afwijking: number | null
          totaal_regels_akkoord: number | null
          totaal_regels_verwacht: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_bestelling_id_fkey"
            columns: ["bestelling_id"]
            isOneToOne: false
            referencedRelation: "interne_bestellingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_leverancier_id_fkey"
            columns: ["leverancier_id"]
            isOneToOne: false
            referencedRelation: "leveranciers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      _seed_default_onboarding_phases: {
        Args: { p_location_id: string }
        Returns: undefined
      }
      advance_onboarding_phase: {
        Args: { _candidate_id: string; _user_id: string }
        Returns: Json
      }
      apply_yield_correction: {
        Args: {
          p_correction_reason?: string
          p_effective_from?: string
          p_methode_id: string
          p_new_yield_pct: number
        }
        Returns: string
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
      complete_mep_task: {
        Args: {
          _kok_medewerker_id?: string
          _task_id: string
          _temperatuur?: number
          _units_gemaakt: number
          _werkelijke_output?: number
          _werkelijke_output_unit?: string
        }
        Returns: Json
      }
      confirm_goods_receipt: {
        Args: {
          _lines: Json
          _receipt_id: string
          _temp_gekoeld?: number
          _temp_skip?: Json
          _temp_vries?: number
          _user_id: string
        }
        Returns: Json
      }
      convert_qty: {
        Args: {
          _density_g_per_ml: number
          _from_unit: string
          _qty: number
          _to_unit: string
          _weight_per_piece_g: number
        }
        Returns: number
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
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      default_voorraad_eenheid: {
        Args: { p_categorie: string }
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
      fuzzy_match_ingredient: {
        Args: { p_location_id: string; p_naam: string }
        Returns: {
          eenheid: string
          id: string
          kostprijs: number
          naam: string
          similarity: number
        }[]
      }
      fuzzy_match_leverancier: {
        Args: { p_location_id: string; p_naam: string }
        Returns: {
          id: string
          naam: string
          similarity: number
        }[]
      }
      generate_batch_nummer: {
        Args: { p_location_id: string }
        Returns: string
      }
      generate_bestelnummer: {
        Args: { p_location_id: string }
        Returns: string
      }
      generate_daily_checklist_runs: { Args: never; Returns: undefined }
      generate_daily_checklist_runs_for_date: {
        Args: { _target_date: string }
        Returns: undefined
      }
      generate_unique_slug: { Args: { _base_name: string }; Returns: string }
      get_attention_conversations: {
        Args: { p_location_id: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      get_current_yield: {
        Args: {
          p_asserted_at?: string
          p_effective_at?: string
          p_methode_id: string
        }
        Returns: {
          assertion_period: unknown
          effective_period: unknown
          source: string
          yield_id: string
          yield_pct: number
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
      get_operating_hours: {
        Args: { _date: string; _location_id: string; _service?: string }
        Returns: {
          close_time: string
          exception_type: string
          label: string
          open_time: string
        }[]
      }
      get_operating_schedule: {
        Args: {
          _from: string
          _location_id: string
          _service?: string
          _to: string
        }
        Returns: {
          close_time: string
          date: string
          is_closed: boolean
          label: string
          open_time: string
          service_type: string
          source: string
        }[]
      }
      get_overdue_items: {
        Args: { today: string; tpl_id: string }
        Returns: Json
      }
      get_public_branding: {
        Args: { _slug: string }
        Returns: {
          available_positions: Json
          brand_color: string
          location_name: string
          logo_url: string
          show_hours: boolean
          show_start_date: boolean
          success_message: string
          welcome_text: string
          welcome_title: string
        }[]
      }
      get_recent_inbox_conversations: {
        Args: { p_location_id: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: false
          isSetofReturn: true
        }
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
      get_yield_history: {
        Args: { p_methode_id: string }
        Returns: {
          assertion_period: unknown
          correction_reason: string
          created_at: string
          created_by: string
          created_by_name: string
          effective_period: unknown
          id: string
          source: string
          yield_pct: number
        }[]
      }
      has_unanswered_inbound: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      increment_knowledge_hit: {
        Args: { loc_id: string; question_text: string }
        Returns: undefined
      }
      increment_marketing_analytics: {
        Args: { p_campaign_id: string; p_field: string; p_location_id: string }
        Returns: undefined
      }
      is_employee_at_location: {
        Args: { _location_id: string; _user_id: string }
        Returns: boolean
      }
      is_frequentie_due: {
        Args: { check_date: string; config: Json; freq: string }
        Returns: boolean
      }
      is_location_open: {
        Args: { _at?: string; _location_id: string; _service?: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_platform_user: { Args: { _user_id: string }; Returns: boolean }
      koppel_extra_leverancier: {
        Args: {
          p_artikel_naam: string
          p_artikel_nummer?: string
          p_ean_code?: string
          p_ingredient_id: string
          p_leverancier_id: string
          p_prijs_per_eenheid?: number
          p_prijs_per_verpakking?: number
          p_verpakking_eenheid?: string
          p_verpakking_hoeveelheid?: number
        }
        Returns: string
      }
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
      match_ingredienten_by_names: {
        Args: {
          p_leverancier_id: string
          p_location_id: string
          p_namen: string[]
        }
        Returns: {
          artikel_nummer: string
          confidence: number
          ingredient_id: string
          naam_key: string
          tier: number
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
      record_factuur_correction: {
        Args: {
          p_alias_naam: string
          p_artikelnummer?: string
          p_ingredient_id: string
          p_leverancier_id?: string
        }
        Returns: undefined
      }
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
      sync_run_with_template: {
        Args: { today?: string; tpl_id: string }
        Returns: undefined
      }
      to_base_unit: {
        Args: {
          _density_g_per_ml: number
          _qty: number
          _target_base: string
          _unit: string
          _weight_per_piece_g: number
        }
        Returns: number
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
      unaccent: { Args: { "": string }; Returns: string }
      unit_to_base: {
        Args: { _unit: string }
        Returns: {
          base: string
          factor: number
        }[]
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
      actor_type_enum: "device" | "user" | "system"
      audit_action_enum:
        | "haccp.temperature_logged"
        | "haccp.checklist_completed"
        | "haccp.corrective_action"
        | "invoice.approved"
        | "invoice.rejected"
        | "inventory.large_adjustment"
        | "cash.reconciled"
        | "transfer.recorded"
        | "transfer.cancelled"
        | "device.paired"
        | "device.deactivated"
      bestel_methode: "email" | "api" | "portal" | "handmatig"
      credit_note_resolved_via:
        | "alsnog_geleverd"
        | "credit_nota"
        | "handmatig"
        | "verlopen"
      credit_note_status:
        | "open"
        | "email_verzonden"
        | "alsnog_geleverd"
        | "credit_ontvangen"
        | "handmatig_afgewikkeld"
        | "verlopen"
      credit_note_type:
        | "missing"
        | "beschadigd"
        | "verkeerd"
        | "meer_dan_besteld"
      device_role_enum:
        | "kitchen_station"
        | "service_station"
        | "bar_station"
        | "reception_station"
      employee_status: "invited" | "active" | "archived"
      fill_order_type: "first_available" | "round_robin" | "priority" | "custom"
      goods_receipt_line_status:
        | "verwacht"
        | "akkoord"
        | "afwijking_missing"
        | "afwijking_beschadigd"
        | "afwijking_verkeerd"
        | "afwijking_meer"
        | "emballage_skip"
      goods_receipt_status:
        | "verwachten"
        | "ontvangen_compleet"
        | "ontvangen_met_afwijking"
        | "geannuleerd"
      haccp_categorie: "ambient" | "gekoeld" | "vries" | "vis_op_ijs"
      location_role:
        | "owner"
        | "manager"
        | "service"
        | "kitchen"
        | "finance"
        | "marketing"
        | "employee"
      module_key:
        | "reservations"
        | "kitchen"
        | "finance"
        | "hrm"
        | "marketing"
        | "settings"
        | "onboarding"
        | "inkoop"
      onboarding_status:
        | "active"
        | "hired"
        | "rejected"
        | "withdrawn"
        | "no_response"
        | "expired"
      operating_exception_type: "closed" | "modified" | "extra"
      pakbon_ai_parse_status: "pending" | "success" | "failed" | "partial"
      pakbon_intake_status:
        | "pending"
        | "success"
        | "failed"
        | "rejected_unknown_sender"
        | "rejected_unknown_location"
        | "rejected_duplicate"
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
      actor_type_enum: ["device", "user", "system"],
      audit_action_enum: [
        "haccp.temperature_logged",
        "haccp.checklist_completed",
        "haccp.corrective_action",
        "invoice.approved",
        "invoice.rejected",
        "inventory.large_adjustment",
        "cash.reconciled",
        "transfer.recorded",
        "transfer.cancelled",
        "device.paired",
        "device.deactivated",
      ],
      bestel_methode: ["email", "api", "portal", "handmatig"],
      credit_note_resolved_via: [
        "alsnog_geleverd",
        "credit_nota",
        "handmatig",
        "verlopen",
      ],
      credit_note_status: [
        "open",
        "email_verzonden",
        "alsnog_geleverd",
        "credit_ontvangen",
        "handmatig_afgewikkeld",
        "verlopen",
      ],
      credit_note_type: [
        "missing",
        "beschadigd",
        "verkeerd",
        "meer_dan_besteld",
      ],
      device_role_enum: [
        "kitchen_station",
        "service_station",
        "bar_station",
        "reception_station",
      ],
      employee_status: ["invited", "active", "archived"],
      fill_order_type: ["first_available", "round_robin", "priority", "custom"],
      goods_receipt_line_status: [
        "verwacht",
        "akkoord",
        "afwijking_missing",
        "afwijking_beschadigd",
        "afwijking_verkeerd",
        "afwijking_meer",
        "emballage_skip",
      ],
      goods_receipt_status: [
        "verwachten",
        "ontvangen_compleet",
        "ontvangen_met_afwijking",
        "geannuleerd",
      ],
      haccp_categorie: ["ambient", "gekoeld", "vries", "vis_op_ijs"],
      location_role: [
        "owner",
        "manager",
        "service",
        "kitchen",
        "finance",
        "marketing",
        "employee",
      ],
      module_key: [
        "reservations",
        "kitchen",
        "finance",
        "hrm",
        "marketing",
        "settings",
        "onboarding",
        "inkoop",
      ],
      onboarding_status: [
        "active",
        "hired",
        "rejected",
        "withdrawn",
        "no_response",
        "expired",
      ],
      operating_exception_type: ["closed", "modified", "extra"],
      pakbon_ai_parse_status: ["pending", "success", "failed", "partial"],
      pakbon_intake_status: [
        "pending",
        "success",
        "failed",
        "rejected_unknown_sender",
        "rejected_unknown_location",
        "rejected_duplicate",
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
