export * from './database';
export * from './discogs';

export interface UserProfile {
  id: string;
  email: string | null;
  hasDiscogsToken: boolean;
  discogsUsername: string | null;
}

export type MediaFormatCategory = 'Vinyl' | 'CD' | 'Cassette' | 'All';
