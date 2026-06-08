export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      circuit_standings: {
        Row: {
          circuit_id: string
          id: string
          points: number
          profile_id: string
          rank: number | null
          tournaments_played: number
          updated_at: string
        }
        Insert: {
          circuit_id: string
          id?: string
          points?: number
          profile_id: string
          rank?: number | null
          tournaments_played?: number
          updated_at?: string
        }
        Update: {
          circuit_id?: string
          id?: string
          points?: number
          profile_id?: string
          rank?: number | null
          tournaments_played?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circuit_standings_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuit_standings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuit_standings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      circuits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organizer_id: string
          points_config: Json
          season: string | null
          sport_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organizer_id: string
          points_config?: Json
          season?: string | null
          sport_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organizer_id?: string
          points_config?: Json
          season?: string | null
          sport_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circuits_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuits_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuits_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          match_id: string | null
          title: string | null
          tournament_id: string | null
          type: Database["public"]["Enums"]["conversation_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          match_id?: string | null
          title?: string | null
          tournament_id?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          match_id?: string | null
          title?: string | null
          tournament_id?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_responses: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          message: string
          responded_at: string | null
          responder_id: string
          status: Database["public"]["Enums"]["response_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          message: string
          responded_at?: string | null
          responder_id: string
          status?: Database["public"]["Enums"]["response_status"]
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          message?: string
          responded_at?: string | null
          responder_id?: string
          status?: Database["public"]["Enums"]["response_status"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_responses_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_responses_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_responses_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          body: string
          closed_at: string | null
          created_at: string
          creator_id: string
          details: Json
          id: string
          location: unknown
          sport_id: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          body: string
          closed_at?: string | null
          created_at?: string
          creator_id: string
          details?: Json
          id?: string
          location?: unknown
          sport_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          body?: string
          closed_at?: string | null
          created_at?: string
          creator_id?: string
          details?: Json
          id?: string
          location?: unknown
          sport_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participants: {
        Row: {
          id: string
          left_at: string | null
          match_id: string
          message: string | null
          profile_id: string
          requested_at: string
          responded_at: string | null
          status: Database["public"]["Enums"]["participant_status"]
          was_late_withdrawal: boolean
          was_removed_by_host: boolean
        }
        Insert: {
          id?: string
          left_at?: string | null
          match_id: string
          message?: string | null
          profile_id: string
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["participant_status"]
          was_late_withdrawal?: boolean
          was_removed_by_host?: boolean
        }
        Update: {
          id?: string
          left_at?: string | null
          match_id?: string
          message?: string | null
          profile_id?: string
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["participant_status"]
          was_late_withdrawal?: boolean
          was_removed_by_host?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          duration_minutes: number
          host_id: string
          id: string
          is_public: boolean
          late_withdrawal_threshold: string
          location: unknown
          skill_max: Database["public"]["Enums"]["skill_level"] | null
          skill_min: Database["public"]["Enums"]["skill_level"] | null
          sport_id: string
          starts_at: string
          status: Database["public"]["Enums"]["match_status"]
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          capacity: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_id: string
          id?: string
          is_public?: boolean
          late_withdrawal_threshold?: string
          location: unknown
          skill_max?: Database["public"]["Enums"]["skill_level"] | null
          skill_min?: Database["public"]["Enums"]["skill_level"] | null
          sport_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["match_status"]
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_id?: string
          id?: string
          is_public?: boolean
          late_withdrawal_threshold?: string
          location?: unknown
          skill_max?: Database["public"]["Enums"]["skill_level"] | null
          skill_min?: Database["public"]["Enums"]["skill_level"] | null
          sport_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["match_status"]
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
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
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_sports: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          profile_id: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          sport_id: string
          years_playing: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_id: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          sport_id: string
          years_playing?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          sport_id?: string
          years_playing?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_sports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_sports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          home_location: unknown
          id: string
          rating_avg: number | null
          rating_count: number
          search_radius_m: number
          updated_at: string
          username: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          home_location?: unknown
          id: string
          rating_avg?: number | null
          rating_count?: number
          search_radius_m?: number
          updated_at?: string
          username?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          home_location?: unknown
          id?: string
          rating_avg?: number | null
          rating_count?: number
          search_radius_m?: number
          updated_at?: string
          username?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          context: Database["public"]["Enums"]["rating_context"]
          created_at: string
          id: string
          match_id: string
          ratee_id: string
          rater_id: string
          stars: number
          tags: string[]
        }
        Insert: {
          comment?: string | null
          context?: Database["public"]["Enums"]["rating_context"]
          created_at?: string
          id?: string
          match_id: string
          ratee_id: string
          rater_id: string
          stars: number
          tags?: string[]
        }
        Update: {
          comment?: string | null
          context?: Database["public"]["Enums"]["rating_context"]
          created_at?: string
          id?: string
          match_id?: string
          ratee_id?: string
          rater_id?: string
          stars?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "ratings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_ratee_id_fkey"
            columns: ["ratee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_rater_id_fkey"
            columns: ["rater_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          created_at: string
          default_scoring_config: Json
          icon: string | null
          id: string
          is_active: boolean
          min_players: number
          name: string
          players_per_side: number
          slug: string
        }
        Insert: {
          created_at?: string
          default_scoring_config?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          min_players?: number
          name: string
          players_per_side?: number
          slug: string
        }
        Update: {
          created_at?: string
          default_scoring_config?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          min_players?: number
          name?: string
          players_per_side?: number
          slug?: string
        }
        Relationships: []
      }
      tournament_courts: {
        Row: {
          id: string
          label: string
          sort_order: number
          tournament_id: string
        }
        Insert: {
          id?: string
          label: string
          sort_order?: number
          tournament_id: string
        }
        Update: {
          id?: string
          label?: string
          sort_order?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_courts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          bracket_position: number
          completed_at: string | null
          court_id: string | null
          created_at: string
          id: string
          next_match_id: string | null
          next_match_slot: number | null
          round_number: number
          scheduled_at: string | null
          score: Json
          side_a_registration_id: string | null
          side_b_registration_id: string | null
          stage_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["tournament_match_status"]
          updated_at: string
          winner_side: number | null
        }
        Insert: {
          bracket_position: number
          completed_at?: string | null
          court_id?: string | null
          created_at?: string
          id?: string
          next_match_id?: string | null
          next_match_slot?: number | null
          round_number: number
          scheduled_at?: string | null
          score?: Json
          side_a_registration_id?: string | null
          side_b_registration_id?: string | null
          stage_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["tournament_match_status"]
          updated_at?: string
          winner_side?: number | null
        }
        Update: {
          bracket_position?: number
          completed_at?: string | null
          court_id?: string | null
          created_at?: string
          id?: string
          next_match_id?: string | null
          next_match_slot?: number | null
          round_number?: number
          scheduled_at?: string | null
          score?: Json
          side_a_registration_id?: string | null
          side_b_registration_id?: string | null
          stage_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["tournament_match_status"]
          updated_at?: string
          winner_side?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "tournament_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_side_a_registration_id_fkey"
            columns: ["side_a_registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_side_b_registration_id_fkey"
            columns: ["side_b_registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          id: string
          partner_name: string | null
          payment_reviewed_at: string | null
          payment_reviewed_by: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          profile_id: string
          receipt_storage_path: string | null
          registered_at: string
          seed: number | null
          status: Database["public"]["Enums"]["registration_status"]
          team_name: string | null
          tournament_id: string
        }
        Insert: {
          id?: string
          partner_name?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          profile_id: string
          receipt_storage_path?: string | null
          registered_at?: string
          seed?: number | null
          status?: Database["public"]["Enums"]["registration_status"]
          team_name?: string | null
          tournament_id: string
        }
        Update: {
          id?: string
          partner_name?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          profile_id?: string
          receipt_storage_path?: string | null
          registered_at?: string
          seed?: number | null
          status?: Database["public"]["Enums"]["registration_status"]
          team_name?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_payment_reviewed_by_fkey"
            columns: ["payment_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_payment_reviewed_by_fkey"
            columns: ["payment_reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_stages: {
        Row: {
          created_at: string
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          name: string
          stage_number: number
          tournament_id: string
        }
        Insert: {
          created_at?: string
          format: Database["public"]["Enums"]["tournament_format"]
          id?: string
          name?: string
          stage_number: number
          tournament_id: string
        }
        Update: {
          created_at?: string
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          name?: string
          stage_number?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_stages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_standings: {
        Row: {
          games_lost: number
          games_won: number
          id: string
          matches_lost: number
          matches_played: number
          matches_won: number
          points: number
          rank: number | null
          registration_id: string
          sets_lost: number
          sets_won: number
          stage_id: string
          updated_at: string
        }
        Insert: {
          games_lost?: number
          games_won?: number
          id?: string
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          points?: number
          rank?: number | null
          registration_id: string
          sets_lost?: number
          sets_won?: number
          stage_id: string
          updated_at?: string
        }
        Update: {
          games_lost?: number
          games_won?: number
          id?: string
          matches_lost?: number
          matches_played?: number
          matches_won?: number
          points?: number
          rank?: number | null
          registration_id?: string
          sets_lost?: number
          sets_won?: number
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_standings_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_standings_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          circuit_id: string | null
          created_at: string
          currency: string
          description: string | null
          entry_fee: number
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          is_local: boolean
          location: unknown
          max_registrations: number | null
          name: string
          organizer_id: string
          registration_closes_at: string | null
          registration_opens_at: string | null
          scoring_config: Json
          source_match_id: string | null
          sport_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          circuit_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entry_fee?: number
          format: Database["public"]["Enums"]["tournament_format"]
          id?: string
          is_local?: boolean
          location?: unknown
          max_registrations?: number | null
          name: string
          organizer_id: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          scoring_config?: Json
          source_match_id?: string | null
          sport_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          circuit_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entry_fee?: number
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          is_local?: boolean
          location?: unknown
          max_registrations?: number | null
          name?: string
          organizer_id?: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          scoring_config?: Json
          source_match_id?: string | null
          sport_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_circuit_id_fkey"
            columns: ["circuit_id"]
            isOneToOne: false
            referencedRelation: "circuits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_source_match_id_fkey"
            columns: ["source_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          rating_avg: number | null
          rating_count: number | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_report_score: {
        Args: { p_tournament_match_id: string }
        Returns: boolean
      }
      generate_round_robin: {
        Args: { p_tournament_id: string }
        Returns: string
      }
      generate_single_elimination_bracket: {
        Args: { p_tournament_id: string }
        Returns: string
      }
      has_match_relationship: { Args: { p_match_id: string }; Returns: boolean }
      is_circuit_organizer: { Args: { p_circuit_id: string }; Returns: boolean }
      is_conversation_creator: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_listing_open: { Args: { p_listing_id: string }; Returns: boolean }
      is_listing_owner: { Args: { p_listing_id: string }; Returns: boolean }
      is_match_host: { Args: { p_match_id: string }; Returns: boolean }
      is_match_member: { Args: { p_match_id: string }; Returns: boolean }
      is_match_member_of: {
        Args: { p_match_id: string; p_profile_id: string }
        Returns: boolean
      }
      is_match_open: { Args: { p_match_id: string }; Returns: boolean }
      is_registration_open: {
        Args: { p_tournament_id: string }
        Returns: boolean
      }
      is_stage_organizer: { Args: { p_stage_id: string }; Returns: boolean }
      is_stage_visible: { Args: { p_stage_id: string }; Returns: boolean }
      is_tournament_organizer: {
        Args: { p_tournament_id: string }
        Returns: boolean
      }
      is_tournament_visible: {
        Args: { p_tournament_id: string }
        Returns: boolean
      }
      match_contact_details: {
        Args: { p_match_id: string }
        Returns: {
          display_name: string
          profile_id: string
          whatsapp_link: string
          whatsapp_phone: string
        }[]
      }
      nearby_listings: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_m?: number
          p_sport_id?: string
          p_type?: Database["public"]["Enums"]["listing_type"]
        }
        Returns: {
          created_at: string
          creator_id: string
          distance_m: number
          id: string
          sport_id: string
          title: string
          type: Database["public"]["Enums"]["listing_type"]
          venue_name: string
        }[]
      }
      nearby_matches: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_m?: number
          p_sport_id?: string
        }
        Returns: {
          capacity: number
          distance_m: number
          host_id: string
          id: string
          lat: number
          lng: number
          sport_id: string
          starts_at: string
          status: Database["public"]["Enums"]["match_status"]
          title: string
          venue_name: string
        }[]
      }
      nearby_tournaments: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_m?: number
          p_sport_id?: string
        }
        Returns: {
          distance_m: number
          entry_fee: number
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          name: string
          sport_id: string
          starts_at: string
          status: Database["public"]["Enums"]["tournament_status"]
        }[]
      }
      recompute_stage_standings: {
        Args: { p_stage_id: string }
        Returns: undefined
      }
    }
    Enums: {
      conversation_type: "match" | "direct" | "tournament"
      listing_status: "open" | "closed" | "archived"
      listing_type: "training_partner" | "team_search" | "coaching_offer"
      match_status: "open" | "full" | "in_progress" | "completed" | "cancelled"
      participant_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "removed"
      payment_status:
        | "not_required"
        | "pending_proof"
        | "under_review"
        | "verified"
        | "rejected"
      rating_context: "standard" | "late_withdrawal" | "host_removal"
      registration_status: "pending" | "approved" | "rejected" | "withdrawn"
      response_status: "pending" | "accepted" | "declined"
      skill_level: "beginner" | "intermediate" | "advanced" | "expert" | "pro"
      tournament_format:
        | "single_elimination"
        | "round_robin"
        | "group_stage_knockout"
      tournament_match_status:
        | "scheduled"
        | "on_court"
        | "completed"
        | "walkover"
        | "cancelled"
      tournament_status:
        | "draft"
        | "registration_open"
        | "registration_closed"
        | "in_progress"
        | "completed"
        | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      conversation_type: ["match", "direct", "tournament"],
      listing_status: ["open", "closed", "archived"],
      listing_type: ["training_partner", "team_search", "coaching_offer"],
      match_status: ["open", "full", "in_progress", "completed", "cancelled"],
      participant_status: [
        "pending",
        "accepted",
        "rejected",
        "withdrawn",
        "removed",
      ],
      payment_status: [
        "not_required",
        "pending_proof",
        "under_review",
        "verified",
        "rejected",
      ],
      rating_context: ["standard", "late_withdrawal", "host_removal"],
      registration_status: ["pending", "approved", "rejected", "withdrawn"],
      response_status: ["pending", "accepted", "declined"],
      skill_level: ["beginner", "intermediate", "advanced", "expert", "pro"],
      tournament_format: [
        "single_elimination",
        "round_robin",
        "group_stage_knockout",
      ],
      tournament_match_status: [
        "scheduled",
        "on_court",
        "completed",
        "walkover",
        "cancelled",
      ],
      tournament_status: [
        "draft",
        "registration_open",
        "registration_closed",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const

