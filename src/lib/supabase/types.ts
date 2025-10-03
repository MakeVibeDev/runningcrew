export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          crew_role: "member" | "admin";
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          crew_role?: "member" | "admin";
          bio?: string | null;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          crew_role?: "member" | "admin";
          bio?: string | null;
        };
      };
      crews: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          intro: string | null;
          logo_image_url: string | null;
          activity_region: string;
          location_lat: number | null;
          location_lng: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          intro?: string | null;
          logo_image_url?: string | null;
          activity_region: string;
          location_lat?: number | null;
          location_lng?: number | null;
        };
        Update: {
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          intro?: string | null;
          logo_image_url?: string | null;
          activity_region?: string;
          location_lat?: number | null;
          location_lng?: number | null;
        };
      };
      crew_members: {
        Row: {
          crew_id: string;
          profile_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          crew_id: string;
          profile_id: string;
          role?: "owner" | "admin" | "member";
        };
        Update: {
          role?: "owner" | "admin" | "member";
        };
      };
      missions: {
        Row: {
          id: string;
          crew_id: string;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string;
          target_distance_km: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          crew_id: string;
          title: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          target_distance_km?: number | null;
        };
        Update: {
          crew_id?: string;
          title?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          target_distance_km?: number | null;
        };
      };
      record_ocr_results: {
        Row: {
          id: string;
          profile_id: string;
          storage_path: string;
          raw_text: string | null;
          distance_km: number | null;
          duration_seconds: number | null;
          recorded_at: string | null;
          confidence: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          storage_path: string;
          raw_text?: string | null;
          distance_km?: number | null;
          duration_seconds?: number | null;
          recorded_at?: string | null;
          confidence?: number | null;
        };
        Update: {
          profile_id?: string;
          storage_path?: string;
          raw_text?: string | null;
          distance_km?: number | null;
          duration_seconds?: number | null;
          recorded_at?: string | null;
          confidence?: number | null;
        };
      };
      records: {
        Row: {
          id: string;
          profile_id: string;
          mission_id: string;
          ocr_result_id: string | null;
          recorded_at: string;
          distance_km: number;
          duration_seconds: number;
          pace_seconds_per_km: number | null;
          visibility: "public" | "private";
          notes: string | null;
          image_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          mission_id: string;
          ocr_result_id?: string | null;
          recorded_at: string;
          distance_km: number;
          duration_seconds: number;
          pace_seconds_per_km?: number | null;
          visibility?: "public" | "private";
          notes?: string | null;
          image_path?: string | null;
        };
        Update: {
          profile_id?: string;
          mission_id?: string;
          ocr_result_id?: string | null;
          recorded_at?: string;
          distance_km?: number;
          duration_seconds?: number;
          pace_seconds_per_km?: number | null;
          visibility?: "public" | "private";
          notes?: string | null;
          image_path?: string | null;
        };
      };
      mission_participants: {
        Row: {
          id: string;
          mission_id: string;
          profile_id: string;
          status: "joined" | "left";
          joined_at: string;
          left_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mission_id: string;
          profile_id: string;
          status?: "joined" | "left";
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          mission_id?: string;
          profile_id?: string;
          status?: "joined" | "left";
          joined_at?: string;
          left_at?: string | null;
        };
      };
    };
  };
};

export type CrewRow = Database["public"]["Tables"]["crews"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type MissionRow = Database["public"]["Tables"]["missions"]["Row"];
export type RecordRow = Database["public"]["Tables"]["records"]["Row"];
export type RecordOcrResultRow = Database["public"]["Tables"]["record_ocr_results"]["Row"];
export type MissionParticipantRow = Database["public"]["Tables"]["mission_participants"]["Row"];
