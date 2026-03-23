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
      active_sessions: {
        Row: {
          created_at: string
          current_route: string | null
          id: string
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_route?: string | null
          id?: string
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_route?: string | null
          id?: string
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      agencies: {
        Row: {
          accent_color: string | null
          address: string | null
          asta_number: string | null
          clia_number: string | null
          created_at: string
          email: string | null
          iata_number: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string
          phone: string | null
          primary_color: string | null
          tagline: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          asta_number?: string | null
          clia_number?: string | null
          created_at?: string
          email?: string | null
          iata_number?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id: string
          phone?: string | null
          primary_color?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          asta_number?: string | null
          clia_number?: string | null
          created_at?: string
          email?: string | null
          iata_number?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          phone?: string | null
          primary_color?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      agency_settings: {
        Row: {
          approval_threshold: number
          commission_holdback_pct: number
          created_at: string
          evaluation_period_months: number
          id: string
          tier_1_threshold: number
          tier_2_threshold: number
          tier_auto_promote: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_threshold?: number
          commission_holdback_pct?: number
          created_at?: string
          evaluation_period_months?: number
          id?: string
          tier_1_threshold?: number
          tier_2_threshold?: number
          tier_auto_promote?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_threshold?: number
          commission_holdback_pct?: number
          created_at?: string
          evaluation_period_months?: number
          id?: string
          tier_1_threshold?: number
          tier_2_threshold?: number
          tier_auto_promote?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_id: string | null
          sender_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_id?: string | null
          sender_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      agent_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          trip_id: string | null
          trip_payment_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          trip_id?: string | null
          trip_payment_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          trip_id?: string | null
          trip_payment_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notifications_trip_payment_id_fkey"
            columns: ["trip_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_notifications_trip_payment_id_fkey"
            columns: ["trip_payment_id"]
            isOneToOne: false
            referencedRelation: "trip_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_onboarding_progress: {
        Row: {
          branding_configured: boolean
          created_at: string
          first_booking_added: boolean
          first_client_added: boolean
          first_trip_created: boolean
          id: string
          onboarding_completed_at: string | null
          profile_completed: boolean
          training_started: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          branding_configured?: boolean
          created_at?: string
          first_booking_added?: boolean
          first_client_added?: boolean
          first_trip_created?: boolean
          id?: string
          onboarding_completed_at?: string | null
          profile_completed?: boolean
          training_started?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          branding_configured?: boolean
          created_at?: string
          first_booking_added?: boolean
          first_client_added?: boolean
          first_trip_created?: boolean
          id?: string
          onboarding_completed_at?: string | null
          profile_completed?: boolean
          training_started?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          notes: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          notes?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          content_html: string | null
          content_markdown: string | null
          created_at: string | null
          faq_schema: Json | null
          hero_image_alt: string | null
          hero_image_url: string | null
          id: number
          infographic_url: string | null
          language: string | null
          meta_description: string | null
          meta_keywords: string | null
          published_at: string | null
          reading_time: number | null
          received_at: string | null
          slug: string
          tags: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string | null
          faq_schema?: Json | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id: number
          infographic_url?: string | null
          language?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          published_at?: string | null
          reading_time?: number | null
          received_at?: string | null
          slug: string
          tags?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string | null
          faq_schema?: Json | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: number
          infographic_url?: string | null
          language?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          published_at?: string | null
          reading_time?: number | null
          received_at?: string | null
          slug?: string
          tags?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      booking_commission_lines: {
        Row: {
          amount: number
          booking_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          description: string
          id: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          description: string
          id?: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          description?: string
          id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_commission_lines_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_travelers: {
        Row: {
          booking_id: string
          companion_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          booking_id: string
          companion_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          companion_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_travelers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_travelers_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "client_companions"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          calculated_commission: number | null
          commission_estimate: number | null
          commission_override_amount: number | null
          commission_revenue: number
          commissionable_amount: number
          confirmation_number: string
          created_at: string
          gross_sales: number
          id: string
          net_sales: number
          override_approved: boolean | null
          override_approved_at: string | null
          override_approved_by: string | null
          override_notes: string | null
          override_pending_approval: boolean | null
          status: string
          supplier_id: string | null
          supplier_payout: number | null
          total_price: number
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calculated_commission?: number | null
          commission_estimate?: number | null
          commission_override_amount?: number | null
          commission_revenue?: number
          commissionable_amount?: number
          confirmation_number: string
          created_at?: string
          gross_sales?: number
          id?: string
          net_sales?: number
          override_approved?: boolean | null
          override_approved_at?: string | null
          override_approved_by?: string | null
          override_notes?: string | null
          override_pending_approval?: boolean | null
          status?: string
          supplier_id?: string | null
          supplier_payout?: number | null
          total_price?: number
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calculated_commission?: number | null
          commission_estimate?: number | null
          commission_override_amount?: number | null
          commission_revenue?: number
          commissionable_amount?: number
          confirmation_number?: string
          created_at?: string
          gross_sales?: number
          id?: string
          net_sales?: number
          override_approved?: boolean | null
          override_approved_at?: string | null
          override_approved_by?: string | null
          override_notes?: string | null
          override_pending_approval?: boolean | null
          status?: string
          supplier_id?: string | null
          supplier_payout?: number | null
          total_price?: number
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          accent_color: string | null
          address: string | null
          agency_name: string | null
          created_at: string
          email_address: string | null
          facebook: string | null
          from_email: string | null
          from_name: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          tagline: string | null
          updated_at: string
          user_id: string
          video_intro_url: string | null
          website: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          agency_name?: string | null
          created_at?: string
          email_address?: string | null
          facebook?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          tagline?: string | null
          updated_at?: string
          user_id: string
          video_intro_url?: string | null
          website?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          agency_name?: string | null
          created_at?: string
          email_address?: string | null
          facebook?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          tagline?: string | null
          updated_at?: string
          user_id?: string
          video_intro_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      cc_authorizations: {
        Row: {
          access_token: string
          authorization_amount: number
          authorization_description: string | null
          authorized_at: string | null
          auto_delete_at: string | null
          billing_zip: string | null
          booking_id: string
          cardholder_name: string | null
          client_id: string
          created_at: string
          encrypted_card_number: string | null
          encrypted_cvv: string | null
          encrypted_expiry: string | null
          expires_at: string | null
          id: string
          last_four: string | null
          signature_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string
          authorization_amount?: number
          authorization_description?: string | null
          authorized_at?: string | null
          auto_delete_at?: string | null
          billing_zip?: string | null
          booking_id: string
          cardholder_name?: string | null
          client_id: string
          created_at?: string
          encrypted_card_number?: string | null
          encrypted_cvv?: string | null
          encrypted_expiry?: string | null
          expires_at?: string | null
          id?: string
          last_four?: string | null
          signature_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          authorization_amount?: number
          authorization_description?: string | null
          authorized_at?: string | null
          auto_delete_at?: string | null
          billing_zip?: string | null
          booking_id?: string
          cardholder_name?: string | null
          client_id?: string
          created_at?: string
          encrypted_card_number?: string | null
          encrypted_cvv?: string | null
          encrypted_expiry?: string | null
          expires_at?: string | null
          id?: string
          last_four?: string | null
          signature_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cc_authorizations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cc_authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_payments: {
        Row: {
          affirm_charge_id: string | null
          amount_cents: number
          booking_ref: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          late_fees_applied: number | null
          late_fees_charged: number | null
          metadata: Json | null
          missed_payments: number | null
          months_paid: number | null
          notes: string | null
          payment_method: string
          payment_type: string | null
          plan_cancelled: boolean | null
          plan_cancelled_at: string | null
          plan_cancelled_reason: string | null
          plan_months: number | null
          status: string | null
          stripe_client_secret: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          total_months: number | null
          travel_date: string | null
          trip_name: string | null
          updated_at: string | null
        }
        Insert: {
          affirm_charge_id?: string | null
          amount_cents: number
          booking_ref?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          late_fees_applied?: number | null
          late_fees_charged?: number | null
          metadata?: Json | null
          missed_payments?: number | null
          months_paid?: number | null
          notes?: string | null
          payment_method: string
          payment_type?: string | null
          plan_cancelled?: boolean | null
          plan_cancelled_at?: string | null
          plan_cancelled_reason?: string | null
          plan_months?: number | null
          status?: string | null
          stripe_client_secret?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          total_months?: number | null
          travel_date?: string | null
          trip_name?: string | null
          updated_at?: string | null
        }
        Update: {
          affirm_charge_id?: string | null
          amount_cents?: number
          booking_ref?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          late_fees_applied?: number | null
          late_fees_charged?: number | null
          metadata?: Json | null
          missed_payments?: number | null
          months_paid?: number | null
          notes?: string | null
          payment_method?: string
          payment_type?: string | null
          plan_cancelled?: boolean | null
          plan_cancelled_at?: string | null
          plan_cancelled_reason?: string | null
          plan_months?: number | null
          status?: string | null
          stripe_client_secret?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          total_months?: number | null
          travel_date?: string | null
          trip_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      client_companions: {
        Row: {
          birthday: string | null
          client_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          known_traveler_number: string | null
          last_name: string | null
          notes: string | null
          passport_info: string | null
          phone: string | null
          redress_number: string | null
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday?: string | null
          client_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          known_traveler_number?: string | null
          last_name?: string | null
          notes?: string | null
          passport_info?: string | null
          phone?: string | null
          redress_number?: string | null
          relationship?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday?: string | null
          client_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          known_traveler_number?: string | null
          last_name?: string | null
          notes?: string | null
          passport_info?: string | null
          phone?: string | null
          redress_number?: string | null
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_companions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_document_checklist: {
        Row: {
          checked_at: string | null
          client_id: string
          created_at: string
          id: string
          is_checked: boolean
          item_key: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_checked?: boolean
          item_key: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_checked?: boolean
          item_key?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_document_checklist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_checklist_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      client_option_selections: {
        Row: {
          agent_confirmed: boolean
          agent_confirmed_at: string | null
          client_id: string
          created_at: string
          id: string
          option_block_id: string
          selected_item_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          agent_confirmed?: boolean
          agent_confirmed_at?: string | null
          client_id: string
          created_at?: string
          id?: string
          option_block_id: string
          selected_item_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          agent_confirmed?: boolean
          agent_confirmed_at?: string | null
          client_id?: string
          created_at?: string
          id?: string
          option_block_id?: string
          selected_item_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_option_selections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_option_selections_option_block_id_fkey"
            columns: ["option_block_id"]
            isOneToOne: false
            referencedRelation: "option_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_option_selections_selected_item_id_fkey"
            columns: ["selected_item_id"]
            isOneToOne: false
            referencedRelation: "itinerary_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_option_selections_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_sessions: {
        Row: {
          client_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          verified_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          verified_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          auth_user_id: string
          client_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          client_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          client_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_update_tokens: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_update_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          activities_interests: string | null
          address_city: string | null
          address_country: string | null
          address_line_1: string | null
          address_line_2: string | null
          address_state: string | null
          address_zip_code: string | null
          advisor_id: string | null
          anniversary: string | null
          birthday: string | null
          created_at: string
          cruise_cabin_floor_preference: string | null
          cruise_cabin_location_preference: string | null
          email: string | null
          first_name: string | null
          flight_bulkhead_preference: string | null
          flight_seating_preference: string | null
          food_drink_allergies: string | null
          id: string
          known_traveler_number: string | null
          last_name: string | null
          lead_source: string | null
          location: string | null
          lodging_elevator_preference: string | null
          lodging_floor_preference: string | null
          loyalty_programs: string | null
          name: string
          notes: string | null
          passport_info: string | null
          phone: string | null
          preferred_first_name: string | null
          redress_number: string | null
          secondary_email: string | null
          secondary_phone: string | null
          status: string
          tags: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activities_interests?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          address_state?: string | null
          address_zip_code?: string | null
          advisor_id?: string | null
          anniversary?: string | null
          birthday?: string | null
          created_at?: string
          cruise_cabin_floor_preference?: string | null
          cruise_cabin_location_preference?: string | null
          email?: string | null
          first_name?: string | null
          flight_bulkhead_preference?: string | null
          flight_seating_preference?: string | null
          food_drink_allergies?: string | null
          id?: string
          known_traveler_number?: string | null
          last_name?: string | null
          lead_source?: string | null
          location?: string | null
          lodging_elevator_preference?: string | null
          lodging_floor_preference?: string | null
          loyalty_programs?: string | null
          name: string
          notes?: string | null
          passport_info?: string | null
          phone?: string | null
          preferred_first_name?: string | null
          redress_number?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          status?: string
          tags?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activities_interests?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          address_state?: string | null
          address_zip_code?: string | null
          advisor_id?: string | null
          anniversary?: string | null
          birthday?: string | null
          created_at?: string
          cruise_cabin_floor_preference?: string | null
          cruise_cabin_location_preference?: string | null
          email?: string | null
          first_name?: string | null
          flight_bulkhead_preference?: string | null
          flight_seating_preference?: string | null
          food_drink_allergies?: string | null
          id?: string
          known_traveler_number?: string | null
          last_name?: string | null
          lead_source?: string | null
          location?: string | null
          lodging_elevator_preference?: string | null
          lodging_floor_preference?: string | null
          loyalty_programs?: string | null
          name?: string
          notes?: string | null
          passport_info?: string | null
          phone?: string | null
          preferred_first_name?: string | null
          redress_number?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          status?: string
          tags?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          expected_commission: number | null
          holdback_amount: number | null
          holdback_released: boolean | null
          holdback_released_at: string | null
          id: string
          paid_date: string | null
          rate: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          expected_commission?: number | null
          holdback_amount?: number | null
          holdback_released?: boolean | null
          holdback_released_at?: string | null
          id?: string
          paid_date?: string | null
          rate: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          expected_commission?: number | null
          holdback_amount?: number | null
          holdback_released?: boolean | null
          holdback_released_at?: string | null
          id?: string
          paid_date?: string | null
          rate?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_audit_log: {
        Row: {
          client_name: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          signature: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signature?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          client_name?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signature?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          client_id: string
          created_at: string
          id: string
          sent_at: string
          status: string
          subject: string
          template: string
          to_email: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          sent_at?: string
          status?: string
          subject: string
          template: string
          to_email: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          sent_at?: string
          status?: string
          subject?: string
          template?: string
          to_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_trips: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          destination: string
          difficulty: string | null
          duration: string | null
          excluded: string[] | null
          gallery_images: string[] | null
          group_size: string | null
          highlights: string[] | null
          id: string
          included: string[] | null
          itinerary: Json | null
          overview: string | null
          popular: boolean | null
          published: boolean | null
          rating: number | null
          review_count: number | null
          slug: string | null
          starting_from: string | null
          tagline: string | null
          trip_name: string
          trip_type: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          destination: string
          difficulty?: string | null
          duration?: string | null
          excluded?: string[] | null
          gallery_images?: string[] | null
          group_size?: string | null
          highlights?: string[] | null
          id?: string
          included?: string[] | null
          itinerary?: Json | null
          overview?: string | null
          popular?: boolean | null
          published?: boolean | null
          rating?: number | null
          review_count?: number | null
          slug?: string | null
          starting_from?: string | null
          tagline?: string | null
          trip_name: string
          trip_type?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          destination?: string
          difficulty?: string | null
          duration?: string | null
          excluded?: string[] | null
          gallery_images?: string[] | null
          group_size?: string | null
          highlights?: string[] | null
          id?: string
          included?: string[] | null
          itinerary?: Json | null
          overview?: string | null
          popular?: boolean | null
          published?: boolean | null
          rating?: number | null
          review_count?: number | null
          slug?: string | null
          starting_from?: string | null
          tagline?: string | null
          trip_name?: string
          trip_type?: string | null
        }
        Relationships: []
      }
      group_signups: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          number_of_travelers: number
          phone: string | null
          status: string
          sub_trip_id: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          number_of_travelers?: number
          phone?: string | null
          status?: string
          sub_trip_id?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          number_of_travelers?: number
          phone?: string | null
          status?: string
          sub_trip_id?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_signups_sub_trip_id_fkey"
            columns: ["sub_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_signups_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_details: Json | null
          file_name: string | null
          id: string
          import_type: string
          records_failed: number | null
          records_imported: number | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          file_name?: string | null
          id?: string
          import_type: string
          records_failed?: number | null
          records_imported?: number | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          file_name?: string | null
          id?: string
          import_type?: string
          records_failed?: number | null
          records_imported?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          commission_tier: Database["public"]["Enums"]["commission_tier"]
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          commission_tier?: Database["public"]["Enums"]["commission_tier"]
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          commission_tier?: Database["public"]["Enums"]["commission_tier"]
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_sequences: {
        Row: {
          created_at: string
          current_number: number
          id: string
          prefix: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_number?: number
          id?: string
          prefix?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_number?: number
          id?: string
          prefix?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_paid: number
          amount_remaining: number
          client_id: string | null
          client_name: string | null
          created_at: string
          id: string
          invoice_date: string
          invoice_number: string
          status: string
          total_amount: number
          trip_id: string | null
          trip_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          amount_remaining?: number
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          status?: string
          total_amount?: number
          trip_id?: string | null
          trip_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          amount_remaining?: number
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          status?: string
          total_amount?: number
          trip_id?: string | null
          trip_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itineraries: {
        Row: {
          cover_image_url: string | null
          created_at: string
          depart_date: string | null
          id: string
          name: string
          overview: string | null
          return_date: string | null
          sort_order: number
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          depart_date?: string | null
          id?: string
          name?: string
          overview?: string | null
          return_date?: string | null
          sort_order?: number
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          depart_date?: string | null
          id?: string
          name?: string
          overview?: string | null
          return_date?: string | null
          sort_order?: number
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          arrival_city_code: string | null
          booking_id: string | null
          category: string
          created_at: string
          day_number: number
          departure_city_code: string | null
          description: string | null
          end_time: string | null
          flight_number: string | null
          id: string
          item_date: string | null
          itinerary_id: string | null
          location: string | null
          notes: string | null
          option_block_id: string | null
          sort_order: number
          start_time: string | null
          title: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_city_code?: string | null
          booking_id?: string | null
          category?: string
          created_at?: string
          day_number: number
          departure_city_code?: string | null
          description?: string | null
          end_time?: string | null
          flight_number?: string | null
          id?: string
          item_date?: string | null
          itinerary_id?: string | null
          location?: string | null
          notes?: string | null
          option_block_id?: string | null
          sort_order?: number
          start_time?: string | null
          title: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_city_code?: string | null
          booking_id?: string | null
          category?: string
          created_at?: string
          day_number?: number
          departure_city_code?: string | null
          description?: string | null
          end_time?: string | null
          flight_number?: string | null
          id?: string
          item_date?: string | null
          itinerary_id?: string | null
          location?: string | null
          notes?: string | null
          option_block_id?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_option_block_id_fkey"
            columns: ["option_block_id"]
            isOneToOne: false
            referencedRelation: "option_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_applications: {
        Row: {
          address_line1: string
          address_line2: string | null
          agent_notes: string | null
          alt_phone: string | null
          application_number: string | null
          approved_amount: number | null
          approved_rate: number | null
          approved_term_months: number | null
          assigned_to: string | null
          autopay_active: boolean | null
          autopay_esignature: string | null
          autopay_method: string | null
          autopay_signed_at: string | null
          autopay_start_date: string | null
          bankruptcy_details: string | null
          bankruptcy_history: boolean | null
          checking_account: boolean | null
          city: string
          consent_autopay: boolean | null
          consent_credit_check: boolean
          consent_terms: boolean
          created_at: string | null
          date_of_birth: string
          decision_date: string | null
          decision_notes: string | null
          down_payment: number | null
          email: string
          employer_name: string | null
          employment_status: string
          esignature: string | null
          first_name: string
          housing_status: string | null
          id: string
          ip_address: string | null
          job_title: string | null
          last_name: string
          loan_amount_requested: number
          loan_purpose: string | null
          monthly_car_payment: number | null
          monthly_income: number | null
          monthly_other_debt: number | null
          monthly_rent_mortgage: number | null
          other_income: number | null
          other_income_source: string | null
          phone: string
          preferred_term_months: number | null
          qbo_customer_id: string | null
          qbo_synced_at: string | null
          reference1_name: string | null
          reference1_phone: string | null
          reference1_relation: string | null
          reference2_name: string | null
          reference2_phone: string | null
          reference2_relation: string | null
          savings_account: boolean | null
          signed_at: string | null
          ssn_last_four: string | null
          state: string
          status: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          stripe_subscription_id: string | null
          travel_date: string | null
          trip_description: string | null
          updated_at: string | null
          user_agent: string | null
          years_at_address: string | null
          years_employed: string | null
          zip_code: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          agent_notes?: string | null
          alt_phone?: string | null
          application_number?: string | null
          approved_amount?: number | null
          approved_rate?: number | null
          approved_term_months?: number | null
          assigned_to?: string | null
          autopay_active?: boolean | null
          autopay_esignature?: string | null
          autopay_method?: string | null
          autopay_signed_at?: string | null
          autopay_start_date?: string | null
          bankruptcy_details?: string | null
          bankruptcy_history?: boolean | null
          checking_account?: boolean | null
          city: string
          consent_autopay?: boolean | null
          consent_credit_check?: boolean
          consent_terms?: boolean
          created_at?: string | null
          date_of_birth: string
          decision_date?: string | null
          decision_notes?: string | null
          down_payment?: number | null
          email: string
          employer_name?: string | null
          employment_status: string
          esignature?: string | null
          first_name: string
          housing_status?: string | null
          id?: string
          ip_address?: string | null
          job_title?: string | null
          last_name: string
          loan_amount_requested: number
          loan_purpose?: string | null
          monthly_car_payment?: number | null
          monthly_income?: number | null
          monthly_other_debt?: number | null
          monthly_rent_mortgage?: number | null
          other_income?: number | null
          other_income_source?: string | null
          phone: string
          preferred_term_months?: number | null
          qbo_customer_id?: string | null
          qbo_synced_at?: string | null
          reference1_name?: string | null
          reference1_phone?: string | null
          reference1_relation?: string | null
          reference2_name?: string | null
          reference2_phone?: string | null
          reference2_relation?: string | null
          savings_account?: boolean | null
          signed_at?: string | null
          ssn_last_four?: string | null
          state: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_subscription_id?: string | null
          travel_date?: string | null
          trip_description?: string | null
          updated_at?: string | null
          user_agent?: string | null
          years_at_address?: string | null
          years_employed?: string | null
          zip_code: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          agent_notes?: string | null
          alt_phone?: string | null
          application_number?: string | null
          approved_amount?: number | null
          approved_rate?: number | null
          approved_term_months?: number | null
          assigned_to?: string | null
          autopay_active?: boolean | null
          autopay_esignature?: string | null
          autopay_method?: string | null
          autopay_signed_at?: string | null
          autopay_start_date?: string | null
          bankruptcy_details?: string | null
          bankruptcy_history?: boolean | null
          checking_account?: boolean | null
          city?: string
          consent_autopay?: boolean | null
          consent_credit_check?: boolean
          consent_terms?: boolean
          created_at?: string | null
          date_of_birth?: string
          decision_date?: string | null
          decision_notes?: string | null
          down_payment?: number | null
          email?: string
          employer_name?: string | null
          employment_status?: string
          esignature?: string | null
          first_name?: string
          housing_status?: string | null
          id?: string
          ip_address?: string | null
          job_title?: string | null
          last_name?: string
          loan_amount_requested?: number
          loan_purpose?: string | null
          monthly_car_payment?: number | null
          monthly_income?: number | null
          monthly_other_debt?: number | null
          monthly_rent_mortgage?: number | null
          other_income?: number | null
          other_income_source?: string | null
          phone?: string
          preferred_term_months?: number | null
          qbo_customer_id?: string | null
          qbo_synced_at?: string | null
          reference1_name?: string | null
          reference1_phone?: string | null
          reference1_relation?: string | null
          reference2_name?: string | null
          reference2_phone?: string | null
          reference2_relation?: string | null
          savings_account?: boolean | null
          signed_at?: string | null
          ssn_last_four?: string | null
          state?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_subscription_id?: string | null
          travel_date?: string | null
          trip_description?: string | null
          updated_at?: string | null
          user_agent?: string | null
          years_at_address?: string | null
          years_employed?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      loan_payment_schedules: {
        Row: {
          created_at: string
          due_date: string
          id: string
          interest_amount: number
          loan_application_id: string
          paid_date: string | null
          payment_number: number
          principal_amount: number
          qbo_invoice_id: string | null
          qbo_synced_at: string | null
          status: string
          total_payment: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          interest_amount?: number
          loan_application_id: string
          paid_date?: string | null
          payment_number: number
          principal_amount?: number
          qbo_invoice_id?: string | null
          qbo_synced_at?: string | null
          status?: string
          total_payment?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          interest_amount?: number
          loan_application_id?: string
          paid_date?: string | null
          payment_number?: number
          principal_amount?: number
          qbo_invoice_id?: string | null
          qbo_synced_at?: string | null
          status?: string
          total_payment?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payment_schedules_loan_application_id_fkey"
            columns: ["loan_application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          id: string
          is_active: boolean
          mentee_user_id: string
          mentor_user_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          id?: string
          is_active?: boolean
          mentee_user_id: string
          mentor_user_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          id?: string
          is_active?: boolean
          mentee_user_id?: string
          mentor_user_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          id: string
          source: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          client_messages: boolean
          commission_updates: boolean
          created_at: string
          id: string
          marketing_emails: boolean
          new_booking_alerts: boolean
          training_reminders: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          client_messages?: boolean
          commission_updates?: boolean
          created_at?: string
          id?: string
          marketing_emails?: boolean
          new_booking_alerts?: boolean
          training_reminders?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          client_messages?: boolean
          commission_updates?: boolean
          created_at?: string
          id?: string
          marketing_emails?: boolean
          new_booking_alerts?: boolean
          training_reminders?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      option_blocks: {
        Row: {
          created_at: string
          day_number: number
          id: string
          itinerary_id: string | null
          sort_order: number
          title: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_number?: number
          id?: string
          itinerary_id?: string | null
          sort_order?: number
          title?: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          itinerary_id?: string | null
          sort_order?: number
          title?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_blocks_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "option_blocks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_messages: {
        Row: {
          agent_user_id: string
          client_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_type: string
        }
        Insert: {
          agent_user_id: string
          client_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_type: string
        }
        Update: {
          agent_user_id?: string
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_name: string | null
          asta_number: string | null
          avatar_url: string | null
          ccra_number: string | null
          clia_number: string | null
          commission_rate: number | null
          commission_tier: Database["public"]["Enums"]["commission_tier"] | null
          created_at: string
          embarc_number: string | null
          full_name: string | null
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_name?: string | null
          asta_number?: string | null
          avatar_url?: string | null
          ccra_number?: string | null
          clia_number?: string | null
          commission_rate?: number | null
          commission_tier?:
            | Database["public"]["Enums"]["commission_tier"]
            | null
          created_at?: string
          embarc_number?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_name?: string | null
          asta_number?: string | null
          avatar_url?: string | null
          ccra_number?: string | null
          clia_number?: string | null
          commission_rate?: number | null
          commission_tier?:
            | Database["public"]["Enums"]["commission_tier"]
            | null
          created_at?: string
          embarc_number?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qbo_client_mappings: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_synced_at: string
          qbo_customer_id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_synced_at?: string
          qbo_customer_id: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string
          qbo_customer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qbo_client_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      qbo_connections: {
        Row: {
          access_token: string
          company_name: string | null
          created_at: string
          id: string
          is_active: boolean
          realm_id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          company_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          realm_id: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          company_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          realm_id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qbo_invoice_mappings: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          last_synced_at: string
          qbo_invoice_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          last_synced_at?: string
          qbo_invoice_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          last_synced_at?: string
          qbo_invoice_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qbo_invoice_mappings_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      qbo_sync_logs: {
        Row: {
          created_at: string
          details: Json | null
          direction: string
          error_message: string | null
          id: string
          records_processed: number
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          direction?: string
          error_message?: string | null
          id?: string
          records_processed?: number
          status?: string
          sync_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          direction?: string
          error_message?: string | null
          id?: string
          records_processed?: number
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          budget: string | null
          created_at: string | null
          departure_date: string | null
          destination: string | null
          email: string
          first_name: string
          flexibility: string | null
          id: string
          last_name: string
          message: string | null
          phone: string | null
          status: string | null
          travelers_adults: number
          travelers_children: number
          trip_type: string
        }
        Insert: {
          budget?: string | null
          created_at?: string | null
          departure_date?: string | null
          destination?: string | null
          email: string
          first_name: string
          flexibility?: string | null
          id?: string
          last_name: string
          message?: string | null
          phone?: string | null
          status?: string | null
          travelers_adults?: number
          travelers_children?: number
          trip_type: string
        }
        Update: {
          budget?: string | null
          created_at?: string | null
          departure_date?: string | null
          destination?: string | null
          email?: string
          first_name?: string
          flexibility?: string | null
          id?: string
          last_name?: string
          message?: string | null
          phone?: string | null
          status?: string | null
          travelers_adults?: number
          travelers_children?: number
          trip_type?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          currency: string
          id: string
          price: number
          sent_at: string | null
          status: string
          supplier_id: string | null
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          price?: number
          sent_at?: string | null
          status?: string
          supplier_id?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          price?: number
          sent_at?: string | null
          status?: string
          supplier_id?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_links: {
        Row: {
          active: boolean | null
          amount: number | null
          booking_ref: string | null
          client_email: string
          client_name: string
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          link_type: string
          notes: string | null
          payment_type: string | null
          single_use: boolean | null
          token: string
          trip_name: string | null
          used_at: string | null
          used_ip: string | null
        }
        Insert: {
          active?: boolean | null
          amount?: number | null
          booking_ref?: string | null
          client_email: string
          client_name: string
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          link_type: string
          notes?: string | null
          payment_type?: string | null
          single_use?: boolean | null
          token: string
          trip_name?: string | null
          used_at?: string | null
          used_ip?: string | null
        }
        Update: {
          active?: boolean | null
          amount?: number | null
          booking_ref?: string | null
          client_email?: string
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          link_type?: string
          notes?: string | null
          payment_type?: string | null
          single_use?: boolean | null
          token?: string
          trip_name?: string | null
          used_at?: string | null
          used_ip?: string | null
        }
        Relationships: []
      }
      signup_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified?: boolean
        }
        Relationships: []
      }
      stripe_connected_accounts: {
        Row: {
          business_name: string | null
          card_issuing_status: string
          created_at: string
          id: string
          onboarding_status: string
          requirements_due: Json | null
          stripe_account_id: string
          transfers_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          card_issuing_status?: string
          created_at?: string
          id?: string
          onboarding_status?: string
          requirements_due?: Json | null
          stripe_account_id: string
          transfers_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          card_issuing_status?: string
          created_at?: string
          id?: string
          onboarding_status?: string
          requirements_due?: Json | null
          stripe_account_id?: string
          transfers_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          commission_rate: number
          commissionable_percentage: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          multi_line_commission: boolean
          name: string
          notes: string | null
          override_commission: boolean
          supplier_type: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          commission_rate?: number
          commissionable_percentage?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          multi_line_commission?: boolean
          name: string
          notes?: string | null
          override_commission?: boolean
          supplier_type?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          commission_rate?: number
          commissionable_percentage?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          multi_line_commission?: boolean
          name?: string
          notes?: string | null
          override_commission?: boolean
          supplier_type?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      training_modules: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          estimated_minutes: number | null
          id: string
          is_required: boolean
          resource_url: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_required?: boolean
          resource_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_required?: boolean
          resource_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      trip_insurance_quotes: {
        Row: {
          coverage_amount: number | null
          coverage_details: string | null
          created_at: string
          id: string
          is_recommended: boolean | null
          plan_name: string | null
          premium_amount: number
          provider_name: string
          quote_url: string | null
          sort_order: number | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coverage_amount?: number | null
          coverage_details?: string | null
          created_at?: string
          id?: string
          is_recommended?: boolean | null
          plan_name?: string | null
          premium_amount?: number
          provider_name: string
          quote_url?: string | null
          sort_order?: number | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coverage_amount?: number | null
          coverage_details?: string | null
          created_at?: string
          id?: string
          is_recommended?: boolean | null
          plan_name?: string | null
          premium_amount?: number
          provider_name?: string
          quote_url?: string | null
          sort_order?: number | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_insurance_quotes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_insurance_responses: {
        Row: {
          acknowledgment_text: string | null
          client_id: string
          created_at: string
          id: string
          ip_address: string | null
          responded_at: string
          response_type: string
          selected_quote_id: string | null
          trip_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          acknowledgment_text?: string | null
          client_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          responded_at?: string
          response_type: string
          selected_quote_id?: string | null
          trip_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          acknowledgment_text?: string | null
          client_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          responded_at?: string
          response_type?: string
          selected_quote_id?: string | null
          trip_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_insurance_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_insurance_responses_selected_quote_id_fkey"
            columns: ["selected_quote_id"]
            isOneToOne: false
            referencedRelation: "trip_insurance_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_insurance_responses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_insurance_settings: {
        Row: {
          agency_disclaimer: string | null
          allow_skip_selection: boolean | null
          amount_to_insure: number | null
          created_at: string
          id: string
          ready_for_client_review: boolean | null
          trip_id: string
          updated_at: string
          use_full_trip_cost: boolean | null
          user_id: string
        }
        Insert: {
          agency_disclaimer?: string | null
          allow_skip_selection?: boolean | null
          amount_to_insure?: number | null
          created_at?: string
          id?: string
          ready_for_client_review?: boolean | null
          trip_id: string
          updated_at?: string
          use_full_trip_cost?: boolean | null
          user_id: string
        }
        Update: {
          agency_disclaimer?: string | null
          allow_skip_selection?: boolean | null
          amount_to_insure?: number | null
          created_at?: string
          id?: string
          ready_for_client_review?: boolean | null
          trip_id?: string
          updated_at?: string
          use_full_trip_cost?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_insurance_settings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_payments: {
        Row: {
          acceptance_signature: string | null
          amount: number
          booking_id: string | null
          created_at: string
          details: string | null
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_method_choice: string | null
          payment_type: string
          status: string
          stripe_payment_url: string | null
          stripe_receipt_url: string | null
          stripe_session_id: string | null
          terms_accepted_at: string | null
          trip_id: string
          updated_at: string
          user_id: string
          virtual_card_id: string | null
          virtual_card_status: string | null
        }
        Insert: {
          acceptance_signature?: string | null
          amount?: number
          booking_id?: string | null
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_method_choice?: string | null
          payment_type?: string
          status?: string
          stripe_payment_url?: string | null
          stripe_receipt_url?: string | null
          stripe_session_id?: string | null
          terms_accepted_at?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
          virtual_card_id?: string | null
          virtual_card_status?: string | null
        }
        Update: {
          acceptance_signature?: string | null
          amount?: number
          booking_id?: string | null
          created_at?: string
          details?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_method_choice?: string | null
          payment_type?: string
          status?: string
          stripe_payment_url?: string | null
          stripe_receipt_url?: string | null
          stripe_session_id?: string | null
          terms_accepted_at?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
          virtual_card_id?: string | null
          virtual_card_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          destination: string | null
          duration_days: number | null
          id: string
          is_public: boolean
          name: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          destination?: string | null
          duration_days?: number | null
          id?: string
          is_public?: boolean
          name: string
          template_data?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          destination?: string | null
          duration_days?: number | null
          id?: string
          is_public?: boolean
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      trip_travelers: {
        Row: {
          birthday: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          known_traveler_number: string | null
          last_name: string | null
          notes: string | null
          passport_info: string | null
          phone: string | null
          relationship: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean | null
          known_traveler_number?: string | null
          last_name?: string | null
          notes?: string | null
          passport_info?: string | null
          phone?: string | null
          relationship?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          known_traveler_number?: string | null
          last_name?: string | null
          notes?: string | null
          passport_info?: string | null
          phone?: string | null
          relationship?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          advisor_id: string | null
          allow_pdf_downloads: boolean
          approved_itinerary_id: string | null
          budget_change_request_message: string | null
          budget_change_requested: boolean | null
          budget_change_requested_at: string | null
          budget_change_requested_by_client_id: string | null
          budget_confirmation_ip: string | null
          budget_confirmation_signature: string | null
          budget_confirmation_user_agent: string | null
          budget_confirmed: boolean | null
          budget_confirmed_at: string | null
          budget_confirmed_by_client_id: string | null
          budget_range: string | null
          client_id: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          depart_date: string | null
          departure_date: string | null
          deposit_amount: number | null
          deposit_override: boolean
          deposit_required: boolean | null
          destination: string | null
          follow_up_due_at: string | null
          group_landing_content: Json | null
          group_landing_description: string | null
          group_landing_enabled: boolean
          group_landing_headline: string | null
          group_landing_hero_url: string | null
          id: string
          itinerary_approved_at: string | null
          itinerary_approved_by_client_id: string | null
          itinerary_style: string
          notes: string | null
          parent_trip_id: string | null
          payment_mode: string
          post_trip_email_sent: boolean | null
          pricing_visibility: string
          proposal_sent_at: string | null
          published_at: string | null
          published_snapshot: Json | null
          readiness_score: Json | null
          return_date: string | null
          share_token: string
          status: string
          tags: string[] | null
          title: string | null
          total_commission_revenue: number
          total_commissionable_amount: number
          total_gross_sales: number
          total_net_sales: number
          total_supplier_payout: number
          trip_name: string
          trip_page_url: string | null
          trip_type: string | null
          updated_at: string
          upgrade_notes: string | null
          user_id: string
        }
        Insert: {
          advisor_id?: string | null
          allow_pdf_downloads?: boolean
          approved_itinerary_id?: string | null
          budget_change_request_message?: string | null
          budget_change_requested?: boolean | null
          budget_change_requested_at?: string | null
          budget_change_requested_by_client_id?: string | null
          budget_confirmation_ip?: string | null
          budget_confirmation_signature?: string | null
          budget_confirmation_user_agent?: string | null
          budget_confirmed?: boolean | null
          budget_confirmed_at?: string | null
          budget_confirmed_by_client_id?: string | null
          budget_range?: string | null
          client_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          depart_date?: string | null
          departure_date?: string | null
          deposit_amount?: number | null
          deposit_override?: boolean
          deposit_required?: boolean | null
          destination?: string | null
          follow_up_due_at?: string | null
          group_landing_content?: Json | null
          group_landing_description?: string | null
          group_landing_enabled?: boolean
          group_landing_headline?: string | null
          group_landing_hero_url?: string | null
          id?: string
          itinerary_approved_at?: string | null
          itinerary_approved_by_client_id?: string | null
          itinerary_style?: string
          notes?: string | null
          parent_trip_id?: string | null
          payment_mode?: string
          post_trip_email_sent?: boolean | null
          pricing_visibility?: string
          proposal_sent_at?: string | null
          published_at?: string | null
          published_snapshot?: Json | null
          readiness_score?: Json | null
          return_date?: string | null
          share_token?: string
          status?: string
          tags?: string[] | null
          title?: string | null
          total_commission_revenue?: number
          total_commissionable_amount?: number
          total_gross_sales?: number
          total_net_sales?: number
          total_supplier_payout?: number
          trip_name: string
          trip_page_url?: string | null
          trip_type?: string | null
          updated_at?: string
          upgrade_notes?: string | null
          user_id: string
        }
        Update: {
          advisor_id?: string | null
          allow_pdf_downloads?: boolean
          approved_itinerary_id?: string | null
          budget_change_request_message?: string | null
          budget_change_requested?: boolean | null
          budget_change_requested_at?: string | null
          budget_change_requested_by_client_id?: string | null
          budget_confirmation_ip?: string | null
          budget_confirmation_signature?: string | null
          budget_confirmation_user_agent?: string | null
          budget_confirmed?: boolean | null
          budget_confirmed_at?: string | null
          budget_confirmed_by_client_id?: string | null
          budget_range?: string | null
          client_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          depart_date?: string | null
          departure_date?: string | null
          deposit_amount?: number | null
          deposit_override?: boolean
          deposit_required?: boolean | null
          destination?: string | null
          follow_up_due_at?: string | null
          group_landing_content?: Json | null
          group_landing_description?: string | null
          group_landing_enabled?: boolean
          group_landing_headline?: string | null
          group_landing_hero_url?: string | null
          id?: string
          itinerary_approved_at?: string | null
          itinerary_approved_by_client_id?: string | null
          itinerary_style?: string
          notes?: string | null
          parent_trip_id?: string | null
          payment_mode?: string
          post_trip_email_sent?: boolean | null
          pricing_visibility?: string
          proposal_sent_at?: string | null
          published_at?: string | null
          published_snapshot?: Json | null
          readiness_score?: Json | null
          return_date?: string | null
          share_token?: string
          status?: string
          tags?: string[] | null
          title?: string | null
          total_commission_revenue?: number
          total_commissionable_amount?: number
          total_gross_sales?: number
          total_net_sales?: number
          total_supplier_payout?: number
          trip_name?: string
          trip_page_url?: string | null
          trip_type?: string | null
          updated_at?: string
          upgrade_notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_approved_itinerary_id_fkey"
            columns: ["approved_itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_budget_change_requested_by_client_id_fkey"
            columns: ["budget_change_requested_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_budget_confirmed_by_client_id_fkey"
            columns: ["budget_confirmed_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_itinerary_approved_by_client_id_fkey"
            columns: ["itinerary_approved_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_parent_trip_id_fkey"
            columns: ["parent_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_configurations: {
        Row: {
          created_at: string
          data_format: string
          http_method: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          data_format?: string
          http_method?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          data_format?: string
          http_method?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      webhook_leads: {
        Row: {
          budget: string | null
          created_at: string
          email: string | null
          id: string
          lead_id: string | null
          location: string | null
          name: string | null
          phone: string | null
          project_type: string | null
          raw_payload: Json | null
          received_at: string
          source: string
          status: string
          timeline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          name?: string | null
          phone?: string | null
          project_type?: string | null
          raw_payload?: Json | null
          received_at?: string
          source?: string
          status?: string
          timeline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          location?: string | null
          name?: string | null
          phone?: string | null
          project_type?: string | null
          raw_payload?: Json | null
          received_at?: string
          source?: string
          status?: string
          timeline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          status: string
          task_type: string
          title: string
          trip_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          status?: string
          task_type?: string
          title: string
          trip_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          status?: string
          task_type?: string
          title?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payments: {
        Row: {
          acceptance_signature: string | null
          amount: number | null
          booking_id: string | null
          created_at: string | null
          details: string | null
          due_date: string | null
          id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_method_choice: string | null
          payment_type: string | null
          status: string | null
          stripe_payment_url: string | null
          stripe_receipt_url: string | null
          stripe_session_id: string | null
          terms_accepted_at: string | null
          trip_id: string | null
          updated_at: string | null
          user_id: string | null
          virtual_card_id: string | null
          virtual_card_status: string | null
        }
        Insert: {
          acceptance_signature?: string | null
          amount?: number | null
          booking_id?: string | null
          created_at?: string | null
          details?: string | null
          due_date?: string | null
          id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_method_choice?: string | null
          payment_type?: string | null
          status?: string | null
          stripe_payment_url?: string | null
          stripe_receipt_url?: string | null
          stripe_session_id?: string | null
          terms_accepted_at?: string | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          virtual_card_id?: string | null
          virtual_card_status?: string | null
        }
        Update: {
          acceptance_signature?: string | null
          amount?: number | null
          booking_id?: string | null
          created_at?: string | null
          details?: string | null
          due_date?: string | null
          id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_method_choice?: string | null
          payment_type?: string | null
          status?: string | null
          stripe_payment_url?: string | null
          stripe_receipt_url?: string | null
          stripe_session_id?: string | null
          terms_accepted_at?: string | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          virtual_card_id?: string | null
          virtual_card_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_at: string | null
          id: string | null
          status: string | null
          task_type: string | null
          title: string | null
          trip_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string | null
          status?: string | null
          task_type?: string | null
          title?: string | null
          trip_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string | null
          status?: string | null
          task_type?: string | null
          title?: string | null
          trip_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { accepting_user_id: string; invitation_token: string }
        Returns: boolean
      }
      check_upcoming_payment_deadlines: { Args: never; Returns: undefined }
      get_next_invoice_number: { Args: { p_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "office_admin"
      commission_tier: "tier_1" | "tier_2" | "tier_3" | "none"
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
      app_role: ["admin", "moderator", "user", "office_admin"],
      commission_tier: ["tier_1", "tier_2", "tier_3", "none"],
    },
  },
} as const
