export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      discogs_tokens: {
        Row: {
          id: string;
          user_id: string;
          token_encrypted: string;
          discogs_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token_encrypted: string;
          discogs_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token_encrypted?: string;
          discogs_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      collection_items: {
        Row: {
          id: string;
          user_id: string;
          release_id: number;
          master_id: number | null;
          title: string;
          artist: string;
          year: number | null;
          format: string;
          format_details: Json;
          label: string | null;
          catno: string | null;
          genres: Json;
          styles: Json;
          cover_url_official: string | null;
          cover_url_custom: string | null;
          tracklist: Json;
          notes: string | null;
          rating: number | null;
          shelf_section: string;
          shelf_position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          release_id: number;
          master_id?: number | null;
          title: string;
          artist: string;
          year?: number | null;
          format?: string;
          format_details?: Json;
          label?: string | null;
          catno?: string | null;
          genres?: Json;
          styles?: Json;
          cover_url_official?: string | null;
          cover_url_custom?: string | null;
          tracklist?: Json;
          notes?: string | null;
          rating?: number | null;
          shelf_section?: string;
          shelf_position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          release_id?: number;
          master_id?: number | null;
          title?: string;
          artist?: string;
          year?: number | null;
          format?: string;
          format_details?: Json;
          label?: string | null;
          catno?: string | null;
          genres?: Json;
          styles?: Json;
          cover_url_official?: string | null;
          cover_url_custom?: string | null;
          tracklist?: Json;
          notes?: string | null;
          rating?: number | null;
          shelf_section?: string;
          shelf_position?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}

export type DiscogsTokenRow = Database['public']['Tables']['discogs_tokens']['Row'];
export type CollectionItemRow = Database['public']['Tables']['collection_items']['Row'];
export type CollectionItemInsert = Database['public']['Tables']['collection_items']['Insert'];
export type CollectionItemUpdate = Database['public']['Tables']['collection_items']['Update'];
