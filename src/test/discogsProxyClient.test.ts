import { describe, it, expect, beforeEach } from 'vitest';
import {
  searchDiscogs,
  getDiscogsRelease,
  getRateLimit,
  saveUserDiscogsToken,
  removeUserDiscogsToken,
  checkUserDiscogsToken,
} from '../lib/discogsProxyClient';

describe('discogsProxyClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('searches releases via fallback mock when offline/unconfigured', async () => {
    const res = await searchDiscogs('daft punk');
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].title.toLowerCase()).toContain('daft punk');
  });

  it('retrieves detailed release by id', async () => {
    const release = await getDiscogsRelease(123456);
    expect(release.id).toBe(123456);
    expect(release.title).toBeTruthy();
    expect(release.tracklist.length).toBeGreaterThan(0);
  });

  it('throws an error for non-existent release id', async () => {
    await expect(getDiscogsRelease(9999999999)).rejects.toThrow();
  });

  it('tracks rate limit state correctly', () => {
    const rl = getRateLimit();
    expect(rl.limit).toBeGreaterThan(0);
    expect(rl.remaining).toBeLessThanOrEqual(rl.limit);
  });

  it('manages token storage in demo/offline mode', async () => {
    let check = await checkUserDiscogsToken('user-1');
    expect(check.hasToken).toBe(false);

    await saveUserDiscogsToken('user-1', 'fake-discogs-token-12345');
    check = await checkUserDiscogsToken('user-1');
    expect(check.hasToken).toBe(true);

    await removeUserDiscogsToken('user-1');
    check = await checkUserDiscogsToken('user-1');
    expect(check.hasToken).toBe(false);
  });
});
