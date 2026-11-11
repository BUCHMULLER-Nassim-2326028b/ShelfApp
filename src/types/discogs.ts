/**
 * Types representing Discogs API responses and structures.
 */

export interface DiscogsCommunity {
  have: number;
  want: number;
}

export interface DiscogsSearchResult {
  id: number;
  type: 'release' | 'master' | 'artist' | 'label';
  title: string;
  uri: string;
  thumb: string;
  cover_image: string;
  country?: string;
  year?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
  style?: string[];
  catno?: string;
  barcode?: string[];
  community?: DiscogsCommunity;
}

export interface DiscogsSearchResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
    urls: Record<string, string>;
  };
  results: DiscogsSearchResult[];
}

export interface DiscogsTrack {
  position: string;
  type_: string;
  title: string;
  duration: string;
  extraartists?: Array<{
    name: string;
    role: string;
    id: number;
  }>;
}

export interface DiscogsFormat {
  name: string;
  qty: string;
  descriptions?: string[];
  text?: string;
}

export interface DiscogsArtist {
  id: number;
  name: string;
  resource_url: string;
  role?: string;
  anv?: string;
}

export interface DiscogsLabel {
  id: number;
  name: string;
  catno: string;
  entity_type: string;
  entity_type_name: string;
  resource_url: string;
}

export interface DiscogsImage {
  type: 'primary' | 'secondary';
  uri: string;
  resource_url: string;
  uri150: string;
  width: number;
  height: number;
}

export interface DiscogsMasterDetail {
  id: number;
  main_release: number;
  most_recent_release?: number;
  title: string;
  artists?: DiscogsArtist[];
  year?: number;
  genres?: string[];
  styles?: string[];
  tracklist?: DiscogsTrack[];
  images?: DiscogsImage[];
  uri?: string;
  notes?: string;
}

export interface DiscogsReleaseDetail {
  id: number;
  master_id?: number;
  master_url?: string;
  title: string;
  artists: DiscogsArtist[];
  artists_sort?: string;
  year?: number;
  released?: string;
  released_formatted?: string;
  country?: string;
  notes?: string;
  formats: DiscogsFormat[];
  labels: DiscogsLabel[];
  genres: string[];
  styles: string[];
  tracklist: DiscogsTrack[];
  images?: DiscogsImage[];
  thumb?: string;
  uri: string;
  status?: string;
}

export interface NormalizedMediaItem {
  id?: string;
  release_id: number;
  master_id?: number | null;
  title: string;
  artist: string;
  year: number | null;
  format: 'Vinyl' | 'CD' | 'Cassette' | 'Other';
  format_details: string[];
  label: string | null;
  catno: string | null;
  genres: string[];
  styles: string[];
  cover_url_official: string | null;
  cover_url_custom?: string | null;
  tracklist: Array<{ position: string; title: string; duration: string }>;
  notes?: string | null;
  rating?: number | null;
  shelf_section?: string;
  shelf_position?: number;
  added_at?: string;
}
