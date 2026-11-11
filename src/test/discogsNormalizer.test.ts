import { describe, it, expect } from 'vitest';
import { normalizeDiscogsRelease, normalizeSearchResult } from '../utils/discogsNormalizer';
import type { DiscogsReleaseDetail, DiscogsSearchResult } from '../types/discogs';

describe('discogsNormalizer', () => {
  it('correctly normalizes a vinyl release detail', () => {
    const mockRelease: DiscogsReleaseDetail = {
      id: 123456,
      master_id: 654321,
      title: 'Random Access Memories',
      artists: [{ id: 1, name: 'Daft Punk (2)', resource_url: '' }],
      year: 2013,
      formats: [
        {
          name: 'Vinyl',
          qty: '2',
          descriptions: ['LP', 'Album', 'Gatefold'],
        },
      ],
      labels: [{ id: 1, name: 'Columbia', catno: '88883716861', entity_type: '', entity_type_name: '', resource_url: '' }],
      genres: ['Electronic', 'Funk / Soul'],
      styles: ['Disco', 'Synth-pop'],
      tracklist: [
        { position: 'A1', type_: 'track', title: 'Give Life Back to Music', duration: '4:34' },
        { position: '', type_: 'heading', title: 'Side B', duration: '' },
        { position: 'B1', type_: 'track', title: 'Giorgio by Moroder', duration: '9:04' },
      ],
      images: [
        {
          type: 'primary',
          uri: 'https://img.discogs.com/ram.jpg',
          resource_url: '',
          uri150: '',
          width: 600,
          height: 600,
        },
      ],
      uri: 'https://www.discogs.com/release/123456',
    };

    const normalized = normalizeDiscogsRelease(mockRelease);

    expect(normalized.release_id).toBe(123456);
    expect(normalized.artist).toBe('Daft Punk'); // cleaned parentheses
    expect(normalized.title).toBe('Random Access Memories');
    expect(normalized.format).toBe('Vinyl');
    expect(normalized.format_details).toEqual(['LP', 'Album', 'Gatefold']);
    expect(normalized.label).toBe('Columbia');
    expect(normalized.catno).toBe('88883716861');
    expect(normalized.cover_url_official).toBe('https://img.discogs.com/ram.jpg');
    expect(normalized.tracklist).toHaveLength(2); // heading excluded
    expect(normalized.tracklist[0].title).toBe('Give Life Back to Music');
    expect(normalized.tracklist[1].title).toBe('Giorgio by Moroder');
  });

  it('correctly normalizes search results with "Artist - Title" strings', () => {
    const mockSearchResult: DiscogsSearchResult = {
      id: 99999,
      type: 'release',
      title: 'Pink Floyd - The Dark Side of the Moon',
      uri: '',
      thumb: 'https://img.discogs.com/thumb.jpg',
      cover_image: 'https://img.discogs.com/full.jpg',
      year: '1973',
      format: ['Vinyl', 'LP', 'Album'],
      label: ['Harvest'],
      catno: 'SHVL 804',
    };

    const parsed = normalizeSearchResult(mockSearchResult);
    expect(parsed.artist).toBe('Pink Floyd');
    expect(parsed.title).toBe('The Dark Side of the Moon');
    expect(parsed.year).toBe(1973);
    expect(parsed.format).toBe('Vinyl');
    expect(parsed.label).toBe('Harvest');
  });
});
