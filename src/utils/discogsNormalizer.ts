import type { DiscogsReleaseDetail, NormalizedMediaItem, DiscogsSearchResult } from '../types/discogs';

/**
 * Normalizes a raw Discogs release detail response into a clean NormalizedMediaItem.
 */
export function normalizeDiscogsRelease(release: DiscogsReleaseDetail): NormalizedMediaItem {
  // Extract primary format
  const rawFormat = release.formats?.[0]?.name?.toLowerCase() || '';
  let format: NormalizedMediaItem['format'] = 'Other';
  if (rawFormat.includes('vinyl') || rawFormat.includes('lp') || rawFormat.includes('12"')) {
    format = 'Vinyl';
  } else if (rawFormat.includes('cd')) {
    format = 'CD';
  } else if (rawFormat.includes('cassette')) {
    format = 'Cassette';
  }

  // Format descriptions (e.g. ['LP', 'Album', 'Stereo'])
  const format_details = release.formats?.[0]?.descriptions || [];

  // Artist name
  const artist = release.artists?.map((a) => a.name.replace(/\s*\(\d+\)$/, '')).join(', ') || 'Artiste inconnu';

  // Label & Catno
  const primaryLabel = release.labels?.[0];
  const label = primaryLabel?.name || null;
  const catno = primaryLabel?.catno || null;

  // Cover image: primary image or first image uri or thumb
  const primaryImage = release.images?.find((img) => img.type === 'primary') || release.images?.[0];
  const cover_url_official = primaryImage?.uri || release.thumb || null;

  // Clean tracklist
  const tracklist = (release.tracklist || [])
    .filter((t) => t.title && t.type_ !== 'heading')
    .map((t) => ({
      position: t.position || '',
      title: t.title,
      duration: t.duration || '',
    }));

  return {
    release_id: release.id,
    master_id: release.master_id ?? null,
    title: release.title || 'Sans titre',
    artist,
    year: release.year || null,
    format,
    format_details,
    label,
    catno,
    genres: release.genres || [],
    styles: release.styles || [],
    cover_url_official,
    tracklist,
    notes: release.notes || null,
    rating: null,
    shelf_section: format,
    shelf_position: 0,
  };
}

/**
 * Normalizes a Discogs search result into basic preview card info.
 */
export function normalizeSearchResult(item: DiscogsSearchResult) {
  // Parse artist and title from Discogs "Artist - Title" format
  let artist = 'Artiste inconnu';
  let title = item.title;

  if (item.title && item.title.includes(' - ')) {
    const parts = item.title.split(' - ');
    artist = parts[0].trim().replace(/\s*\(\d+\)$/, '');
    title = parts.slice(1).join(' - ').trim();
  }

  const formatStr = (item.format || []).join(', ');
  let formatType: NormalizedMediaItem['format'] = 'Other';
  const lowerFormat = formatStr.toLowerCase();
  if (lowerFormat.includes('vinyl') || lowerFormat.includes('lp')) {
    formatType = 'Vinyl';
  } else if (lowerFormat.includes('cd')) {
    formatType = 'CD';
  } else if (lowerFormat.includes('cassette')) {
    formatType = 'Cassette';
  }

  return {
    id: item.id,
    type: item.type,
    artist,
    title,
    year: item.year ? parseInt(item.year, 10) : null,
    format: formatType,
    formatDetails: item.format || [],
    label: item.label?.[0] || null,
    catno: item.catno || null,
    thumb: item.thumb || item.cover_image || null,
  };
}
