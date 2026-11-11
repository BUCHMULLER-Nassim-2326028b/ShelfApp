import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ShelfProvider, useShelf } from '../context/ShelfContext';
import type { NormalizedMediaItem } from '../types/discogs';

const mockItem: NormalizedMediaItem = {
  release_id: 888123,
  title: 'Homework',
  artist: 'Daft Punk',
  year: 1997,
  format: 'Vinyl',
  format_details: ['2xLP', 'Album'],
  label: 'Virgin',
  catno: 'V2821',
  genres: ['Electronic'],
  styles: ['House'],
  cover_url_official: 'https://example.com/homework.jpg',
  tracklist: [{ position: 'A1', title: 'Daftendirekt', duration: '2:44' }],
  notes: 'First press',
  rating: 5,
  shelf_section: 'Vinyl',
  shelf_position: 0,
};

describe('ShelfContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ShelfProvider>{children}</ShelfProvider>
  );

  it('starts with an empty collection by default', () => {
    const { result } = renderHook(() => useShelf(), { wrapper });
    expect(result.current.collection).toEqual([]);
  });

  it('adds a new item to the collection', async () => {
    const { result } = renderHook(() => useShelf(), { wrapper });
    const initialCount = result.current.collection.length;

    await act(async () => {
      await result.current.addToCollection(mockItem);
    });

    expect(result.current.collection.length).toBe(initialCount + 1);
    expect(result.current.collection[0].title).toBe('Homework');
  });

  it('updates personal notes and rating of an album', async () => {
    const { result } = renderHook(() => useShelf(), { wrapper });

    await act(async () => {
      await result.current.addToCollection(mockItem);
    });

    await act(async () => {
      await result.current.updateItemNotesAndRating(888123, 'Updated collector note', 4);
    });

    const updated = result.current.collection.find((i) => i.release_id === 888123);
    expect(updated?.notes).toBe('Updated collector note');
    expect(updated?.rating).toBe(4);
  });

  it('filters collection by format (Vinyl vs CD)', async () => {
    const { result } = renderHook(() => useShelf(), { wrapper });

    await act(async () => {
      result.current.setFilterSection('CD');
    });

    expect(result.current.filterSection).toBe('CD');
    const allAreCD = result.current.filteredCollection.every((i) => i.format === 'CD');
    expect(allAreCD).toBe(true);
  });

  it('removes an item from the collection', async () => {
    const { result } = renderHook(() => useShelf(), { wrapper });

    await act(async () => {
      await result.current.addToCollection(mockItem);
    });

    await act(async () => {
      await result.current.removeFromCollection(888123);
    });

    const exists = result.current.collection.some((i) => i.release_id === 888123);
    expect(exists).toBe(false);
  });

  it('manages appearance settings (theme, shelfStyle, realisticSpine)', async () => {
    const { result } = renderHook(() => useShelf(), { wrapper });

    // Defaults
    expect(result.current.theme).toBe('light');
    expect(result.current.shelfStyle).toBe('skeuomorphic');
    expect(result.current.realisticSpineEnabled).toBe(true);

    // Toggle theme to light
    await act(async () => {
      result.current.setTheme('light');
    });
    expect(result.current.theme).toBe('light');

    // Toggle shelfStyle to modern
    await act(async () => {
      result.current.setShelfStyle('modern');
    });
    expect(result.current.shelfStyle).toBe('modern');

    // Toggle realisticSpineEnabled to false
    await act(async () => {
      result.current.setRealisticSpineEnabled(false);
    });
    expect(result.current.realisticSpineEnabled).toBe(false);
  });
});
