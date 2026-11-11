import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { NormalizedMediaItem, DiscogsSearchResult } from '../types/discogs';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  searchDiscogs,
  getDiscogsRelease,
  getDiscogsReleaseOrMaster,
  checkUserDiscogsToken,
  saveUserDiscogsToken,
  removeUserDiscogsToken,
  MOCK_DISCOGS_RELEASES,
  type SearchOptions,
} from '../lib/discogsProxyClient';
import { normalizeDiscogsRelease } from '../utils/discogsNormalizer';
import {
  saveLocalCover,
  saveLocalCoverFromDataUrl,
  deleteLocalCover,
  getAllLocalCovers,
  clearAllLocalCovers,
} from '../lib/localCoverStorage';

export type ShelfFilter = 'All' | 'Vinyl' | 'CD' | 'Cassette';

interface ShelfContextType {
  collection: NormalizedMediaItem[];
  filteredCollection: NormalizedMediaItem[];
  filterSection: ShelfFilter;
  setFilterSection: (filter: ShelfFilter) => void;
  isLoadingCollection: boolean;
  addToCollection: (item: NormalizedMediaItem) => Promise<void>;
  removeFromCollection: (releaseId: number) => Promise<void>;
  clearCollection: () => Promise<void>;
  updateItemNotesAndRating: (releaseId: number, notes: string, rating: number | null) => Promise<void>;
  uploadCustomCover: (releaseId: number, file: File) => Promise<string>;
  removeCustomCover: (releaseId: number) => Promise<void>;

  // Supabase Auth & Cloud Sync
  supabaseUser: User | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string; needConfirmation?: boolean }>;
  signOutSupabase: () => Promise<void>;
  isCloudSyncing: boolean;
  syncCollectionWithCloud: () => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: DiscogsSearchResult[];
  isSearching: boolean;
  searchError: string | null;
  executeSearch: (query: string, options?: string | SearchOptions) => Promise<void>;
  importFromDiscogs: (id: number, type?: 'release' | 'master') => Promise<NormalizedMediaItem>;

  // Token & Account
  hasToken: boolean;
  discogsUsername: string | null;
  saveToken: (token: string, username?: string) => Promise<void>;
  deleteToken: () => Promise<void>;
  reloadCredentials: () => Promise<void>;

  // Appearance & Shelf Style
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  shelfStyle: 'skeuomorphic' | 'modern';
  setShelfStyle: (style: 'skeuomorphic' | 'modern') => void;
  realisticSpineEnabled: boolean;
  setRealisticSpineEnabled: (enabled: boolean) => void;

  // Modal & Onboarding
  selectedItem: NormalizedMediaItem | null;
  setSelectedItem: (item: NormalizedMediaItem | null) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
}

const ShelfContext = createContext<ShelfContextType | null>(null);

const STORAGE_KEY_COLLECTION = 'shelfapp_user_collection';
const STORAGE_KEY_ONBOARDING = 'shelfapp_has_seen_onboarding';
const STORAGE_KEY_THEME = 'shelfapp_theme';
const STORAGE_KEY_SHELF_STYLE = 'shelfapp_shelf_style';
const STORAGE_KEY_SPINE = 'shelfapp_realistic_spine';

export function ShelfProvider({ children }: { children: React.ReactNode }) {
  const [collection, setCollection] = useState<NormalizedMediaItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLLECTION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item: NormalizedMediaItem) => ![1, 2, 3, 4].includes(item.release_id))
            .map((item: NormalizedMediaItem) => {
              // Hydrate custom cover immediately on first render from localStorage
              const directCover = localStorage.getItem(`shelfapp_cover_${item.release_id}`);
              if (directCover) {
                return { ...item, cover_url_custom: directCover };
              }
              if (item.cover_url_custom && item.cover_url_custom !== 'local') {
                return item;
              }
              return { ...item, cover_url_custom: undefined };
            });
        }
      }
    } catch {
      /* ignore */
    }
    return [];
  });

  const [filterSection, setFilterSection] = useState<ShelfFilter>('All');
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NormalizedMediaItem | null>(null);

  // Supabase Auth State
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Refs to prevent circular sync loops and duplicate DB writes
  const collectionRef = useRef<NormalizedMediaItem[]>(collection);
  collectionRef.current = collection;
  const isSyncingRef = useRef(false);

  // Onboarding
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    return !localStorage.getItem(STORAGE_KEY_ONBOARDING);
  });

  // Appearance & Theme settings
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* ignore */
    }
    return 'dark';
  });

  const [shelfStyle, setShelfStyle] = useState<'skeuomorphic' | 'modern'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHELF_STYLE);
      if (saved === 'skeuomorphic' || saved === 'modern') return saved;
    } catch {
      /* ignore */
    }
    return 'skeuomorphic';
  });

  const [realisticSpineEnabled, setRealisticSpineEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SPINE);
      if (saved !== null) return saved === 'true';
    } catch {
      /* ignore */
    }
    return true;
  });

  // Sync theme to DOM & localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
  }, [theme]);

  // Sync shelfStyle to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHELF_STYLE, shelfStyle);
    } catch {
      /* ignore */
    }
  }, [shelfStyle]);

  // Sync realisticSpineEnabled to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SPINE, String(realisticSpineEnabled));
    } catch {
      /* ignore */
    }
  }, [realisticSpineEnabled]);

  // Token status initialized synchronously from localStorage for instant availability
  const [hasToken, setHasToken] = useState<boolean>(() => {
    try {
      const local =
        localStorage.getItem('shelfapp_discogs_token') ||
        localStorage.getItem('shelfapp_demo_token');
      return Boolean(local && local.trim().length > 5);
    } catch {
      return false;
    }
  });
  const [discogsUsername, setDiscogsUsername] = useState<string | null>(() => {
    try {
      return localStorage.getItem('shelfapp_discogs_username') || null;
    } catch {
      return null;
    }
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscogsSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Hydrate local custom covers from IndexedDB on startup
  useEffect(() => {
    getAllLocalCovers()
      .then((localCovers) => {
        const coverKeys = Object.keys(localCovers);
        if (coverKeys.length > 0) {
          setCollection((prev) =>
            prev.map((item) => {
              const localUrl = localCovers[item.release_id];
              return localUrl ? { ...item, cover_url_custom: localUrl } : item;
            })
          );
        }
      })
      .catch((err) => {
        console.warn('Could not hydrate local covers:', err);
      });
  }, []);

  // Sync collection with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLLECTION, JSON.stringify(collection));
    } catch {
      /* ignore */
    }
  }, [collection]);

  // Cloud Sync method with automatic deduplication & guard against infinite loops
  const syncCollectionWithCloud = useCallback(async (overrideUserId?: string) => {
    if (!isSupabaseConfigured) return;
    const targetUserId = overrideUserId || supabaseUser?.id;
    if (!targetUserId) return;

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsCloudSyncing(true);

    try {
      // 1. Fetch remote rows from Supabase (oldest first)
      const { data: remoteRows, error } = await supabase
        .from('collection_items')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // 2. Identify duplicate rows in Supabase and purge them immediately
      const seenReleaseIds = new Set<number>();
      const duplicateRowIdsToDelete: string[] = [];
      const uniqueRemoteRows: any[] = [];

      if (remoteRows) {
        for (const row of remoteRows) {
          const relId = Number(row.release_id);
          if (seenReleaseIds.has(relId)) {
            duplicateRowIdsToDelete.push(row.id);
          } else {
            seenReleaseIds.add(relId);
            uniqueRemoteRows.push(row);
          }
        }
      }

      if (duplicateRowIdsToDelete.length > 0) {
        console.warn(`[ShelfApp] Nettoyage de ${duplicateRowIdsToDelete.length} doublons dans Supabase...`);
        await supabase
          .from('collection_items')
          .delete()
          .in('id', duplicateRowIdsToDelete);
      }

      // 3. Hydrate with local custom covers & sync bidirectional with Supabase
      const localCovers = await getAllLocalCovers();

      const mappedRemote: NormalizedMediaItem[] = uniqueRemoteRows.map((row: any) => {
        const releaseId = Number(row.release_id);
        let customCover = localCovers[releaseId];

        // If local storage didn't have it, but Supabase has a custom cover saved:
        if (!customCover && row.cover_url_custom) {
          customCover = row.cover_url_custom;
          saveLocalCoverFromDataUrl(releaseId, customCover);
        }

        // If local storage has it, but Supabase doesn't have it recorded yet:
        if (customCover && !row.cover_url_custom && targetUserId) {
          (supabase.from('collection_items' as any) as any)
            .update({ cover_url_custom: customCover, updated_at: new Date().toISOString() })
            .eq('id', row.id)
            .then(() => { })
            .catch(() => { });
        }

        return {
          release_id: releaseId,
          master_id: row.master_id ? Number(row.master_id) : undefined,
          title: row.title,
          artist: row.artist,
          year: row.year,
          format: row.format,
          format_details: row.format_details || [],
          label: row.label,
          catno: row.catno,
          genres: row.genres || [],
          styles: row.styles || [],
          cover_url_official: row.cover_url_official,
          cover_url_custom: customCover || undefined,
          tracklist: row.tracklist || [],
          notes: row.notes || undefined,
          rating: row.rating || undefined,
          shelf_section: row.shelf_section,
          shelf_position: row.shelf_position || 0,
        };
      });

      // 4. Check which items from local collection need to be uploaded to Supabase
      const localItems = collectionRef.current;
      const itemsToUpload: any[] = [];
      const mergedList = [...mappedRemote];

      for (const localItem of localItems) {
        if (!seenReleaseIds.has(localItem.release_id)) {
          seenReleaseIds.add(localItem.release_id);
          mergedList.push(localItem);
          itemsToUpload.push({
            user_id: targetUserId,
            release_id: localItem.release_id,
            master_id: localItem.master_id || null,
            title: localItem.title,
            artist: localItem.artist,
            year: localItem.year || null,
            format: localItem.format,
            format_details: localItem.format_details || [],
            label: localItem.label || null,
            catno: localItem.catno || null,
            genres: localItem.genres || [],
            styles: localItem.styles || [],
            cover_url_official: localItem.cover_url_official || null,
            cover_url_custom: localItem.cover_url_custom || localCovers[localItem.release_id] || null,
            tracklist: localItem.tracklist || [],
            notes: localItem.notes || null,
            rating: localItem.rating || null,
            shelf_section: localItem.shelf_section || localItem.format,
            shelf_position: 0,
          });
        }
      }

      // Batch insert any local items missing in cloud
      if (itemsToUpload.length > 0) {
        await (supabase.from('collection_items' as any) as any).insert(itemsToUpload);
      }

      // 5. Update local state once with the clean deduplicated merged list
      setCollection(mergedList);
    } catch (err) {
      console.warn('Erreur de synchronisation cloud:', err);
    } finally {
      setIsCloudSyncing(false);
      isSyncingRef.current = false;
    }
  }, [supabaseUser?.id]);

  // Listen to Supabase Auth State changes & initial session
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // 1. Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setSupabaseUser(user);
      if (user) {
        syncCollectionWithCloud(user.id);
        checkUserDiscogsToken(user.id).then(({ hasToken, username }) => {
          setHasToken(hasToken);
          setDiscogsUsername(username);
        });
      }
    }).catch(() => { });

    // 2. Auth state subscription (only triggers on explicit sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      setSupabaseUser(user);

      if (event === 'SIGNED_IN' && user) {
        await syncCollectionWithCloud(user.id);
        const { hasToken, username } = await checkUserDiscogsToken(user.id);
        setHasToken(hasToken);
        setDiscogsUsername(username);
      } else if (event === 'SIGNED_OUT') {
        const { hasToken, username } = await checkUserDiscogsToken('local_user');
        setHasToken(hasToken);
        setDiscogsUsername(username);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Run ONCE on mount

  // Load user token status on mount for guest/local mode
  useEffect(() => {
    async function loadTokenStatus() {
      try {
        let userId = 'local_user';
        if (isSupabaseConfigured) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) userId = user.id;
        }
        const { hasToken, username } = await checkUserDiscogsToken(userId);
        setHasToken(hasToken);
        setDiscogsUsername(username);
      } catch {
        /* ignore */
      }
    }
    loadTokenStatus();
  }, []);

  // Filtered collection based on active shelf tab
  const filteredCollection = collection.filter((item) => {
    if (filterSection === 'All') return true;
    return item.format === filterSection;
  });

  // Add an item to the collection (with Supabase deduplication guard)
  const addToCollection = useCallback(async (item: NormalizedMediaItem) => {
    setCollection((prev) => {
      const exists = prev.some((i) => i.release_id === item.release_id);
      if (exists) return prev;
      return [item, ...prev];
    });

    if (isSupabaseConfigured && supabaseUser) {
      try {
        // Guard against duplicate insert in Supabase
        const { data: existing } = await supabase
          .from('collection_items')
          .select('id')
          .eq('user_id', supabaseUser.id)
          .eq('release_id', item.release_id)
          .maybeSingle();

        if (!existing) {
          await (supabase.from('collection_items' as any) as any).insert({
            user_id: supabaseUser.id,
            release_id: item.release_id,
            master_id: item.master_id || null,
            title: item.title,
            artist: item.artist,
            year: item.year || null,
            format: item.format,
            format_details: item.format_details || [],
            label: item.label || null,
            catno: item.catno || null,
            genres: item.genres || [],
            styles: item.styles || [],
            cover_url_official: item.cover_url_official || null,
            cover_url_custom: item.cover_url_custom || null,
            tracklist: item.tracklist || [],
            notes: item.notes || null,
            rating: item.rating || null,
            shelf_section: item.shelf_section || item.format,
            shelf_position: 0,
          });
        }
      } catch (err) {
        console.warn('Failed to insert item into Supabase:', err);
      }
    }
  }, [supabaseUser]);

  // Remove an item from collection
  const removeFromCollection = useCallback(async (releaseId: number) => {
    setCollection((prev) => prev.filter((i) => i.release_id !== releaseId));
    if (selectedItem?.release_id === releaseId) {
      setSelectedItem(null);
    }

    // Clean up local cover
    await deleteLocalCover(releaseId);

    if (isSupabaseConfigured && supabaseUser) {
      await supabase
        .from('collection_items')
        .delete()
        .eq('user_id', supabaseUser.id)
        .eq('release_id', releaseId);
    }
  }, [selectedItem, supabaseUser]);

  // Clear all items from the collection
  const clearCollection = useCallback(async () => {
    setCollection([]);
    setSelectedItem(null);
    try {
      localStorage.removeItem(STORAGE_KEY_COLLECTION);
    } catch {
      // ignore
    }

    // Clean up all stored custom covers
    await clearAllLocalCovers();

    if (isSupabaseConfigured && supabaseUser) {
      try {
        await supabase.from('collection_items').delete().eq('user_id', supabaseUser.id);
      } catch {
        // ignore
      }
    }
  }, [supabaseUser]);

  // Update notes & rating
  const updateItemNotesAndRating = useCallback(async (
    releaseId: number,
    notes: string,
    rating: number | null
  ) => {
    setCollection((prev) =>
      prev.map((i) => (i.release_id === releaseId ? { ...i, notes, rating } : i))
    );
    if (selectedItem && selectedItem.release_id === releaseId) {
      setSelectedItem((prev) => (prev ? { ...prev, notes, rating } : null));
    }

    if (isSupabaseConfigured && supabaseUser) {
      await (supabase
        .from('collection_items' as any) as any)
        .update({ notes, rating })
        .eq('user_id', supabaseUser.id)
        .eq('release_id', releaseId);
    }
  }, [selectedItem, supabaseUser]);

  // Upload custom cover — Compressed (~25KB), stored locally & registered in Supabase DB
  const uploadCustomCover = useCallback(async (releaseId: number, file: File): Promise<string> => {
    // 1. Compress to ~512px WebP and save to localStorage + IndexedDB
    const localDataUrl = await saveLocalCover(releaseId, file);

    // 2. Update React in-memory state
    setCollection((prev) =>
      prev.map((i) => (i.release_id === releaseId ? { ...i, cover_url_custom: localDataUrl } : i))
    );

    if (selectedItem?.release_id === releaseId) {
      setSelectedItem((prev) => (prev ? { ...prev, cover_url_custom: localDataUrl } : null));
    }

    collectionRef.current = collectionRef.current.map((i) =>
      i.release_id === releaseId ? { ...i, cover_url_custom: localDataUrl } : i
    );

    // 3. Répertorier dans la base de données Supabase si l'utilisateur est connecté
    if (isSupabaseConfigured && supabaseUser) {
      try {
        await (supabase
          .from('collection_items' as any) as any)
          .update({
            cover_url_custom: localDataUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', supabaseUser.id)
          .eq('release_id', releaseId);
      } catch (err) {
        console.warn('Impossible de répertorier la cover sur Supabase:', err);
      }
    }

    return localDataUrl;
  }, [selectedItem, supabaseUser]);

  // Remove custom cover (reverts to official Discogs cover)
  const removeCustomCover = useCallback(async (releaseId: number) => {
    await deleteLocalCover(releaseId);

    setCollection((prev) =>
      prev.map((i) => (i.release_id === releaseId ? { ...i, cover_url_custom: undefined } : i))
    );

    if (selectedItem?.release_id === releaseId) {
      setSelectedItem((prev) => (prev ? { ...prev, cover_url_custom: undefined } : null));
    }

    collectionRef.current = collectionRef.current.map((i) =>
      i.release_id === releaseId ? { ...i, cover_url_custom: undefined } : i
    );

    // Réinitialiser également dans la base de données Supabase
    if (isSupabaseConfigured && supabaseUser) {
      try {
        await (supabase
          .from('collection_items' as any) as any)
          .update({
            cover_url_custom: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', supabaseUser.id)
          .eq('release_id', releaseId);
      } catch (err) {
        console.warn('Impossible de réinitialiser la cover sur Supabase:', err);
      }
    }
  }, [selectedItem, supabaseUser]);

  // Search Discogs
  const executeSearch = useCallback(async (query: string, options?: string | SearchOptions) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    let formatOption: string | undefined = undefined;
    let barcodeOption: string | undefined = undefined;

    if (typeof options === 'string') {
      formatOption = options !== 'All' ? options : undefined;
    } else if (typeof options === 'object' && options !== null) {
      formatOption = options.format !== 'All' ? options.format : undefined;
      barcodeOption = options.barcode;
    }

    try {
      const searchOptions: SearchOptions = {};
      if (formatOption) searchOptions.format = formatOption;
      if (barcodeOption) searchOptions.barcode = barcodeOption;

      const results = await searchDiscogs(query, searchOptions);
      setSearchResults(results.results);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de recherche Discogs.';
      setSearchError(msg);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Import from Discogs (detailed release or master)
  const importFromDiscogs = useCallback(
    async (id: number, type: 'release' | 'master' = 'release'): Promise<NormalizedMediaItem> => {
      const raw = await getDiscogsReleaseOrMaster(id, type);
      const normalized = normalizeDiscogsRelease(raw);
      await addToCollection(normalized);
      return normalized;
    },
    [addToCollection]
  );

  // Supabase Auth Methods
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase n’est pas configuré.' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      let frenchMsg = error.message;
      if (error.message.includes('Invalid login credentials')) {
        frenchMsg = 'Adresse email ou mot de passe incorrect.';
      } else if (error.message.includes('Email not confirmed')) {
        frenchMsg = 'Veuillez confirmer votre adresse email avant de vous connecter.';
      }
      return { success: false, error: frenchMsg };
    }
    setSupabaseUser(data.user);
    return { success: true };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase n’est pas configuré.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      let frenchMsg = error.message;
      if (error.message.includes('User already registered')) {
        frenchMsg = 'Un compte existe déjà avec cette adresse email.';
      } else if (error.message.includes('Password should be at least')) {
        frenchMsg = 'Le mot de passe doit contenir au moins 6 caractères.';
      }
      return { success: false, error: frenchMsg };
    }
    setSupabaseUser(data.user);
    const needConfirmation = !data.session && Boolean(data.user);
    return { success: true, needConfirmation };
  }, []);

  const signOutSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    setSupabaseUser(null);
  }, []);

  // Save Discogs Token
  const saveToken = useCallback(async (token: string, username?: string) => {
    let userId = supabaseUser?.id || 'local_user';
    await saveUserDiscogsToken(userId, token, username);
    setHasToken(true);
    if (username) setDiscogsUsername(username);
  }, [supabaseUser]);

  // Delete Discogs Token
  const deleteToken = useCallback(async () => {
    let userId = supabaseUser?.id || 'local_user';
    await removeUserDiscogsToken(userId);
    setHasToken(false);
    setDiscogsUsername(null);
  }, [supabaseUser]);

  // Reload Credentials
  const reloadCredentials = useCallback(async () => {
    let userId = supabaseUser?.id || 'local_user';
    const { hasToken, username } = await checkUserDiscogsToken(userId);
    setHasToken(hasToken);
    setDiscogsUsername(username);
  }, [supabaseUser]);

  return (
    <ShelfContext.Provider
      value={{
        collection,
        filteredCollection,
        filterSection,
        setFilterSection,
        isLoadingCollection,
        addToCollection,
        removeFromCollection,
        clearCollection,
        updateItemNotesAndRating,
        uploadCustomCover,
        removeCustomCover,
        supabaseUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        signInWithEmail,
        signUpWithEmail,
        signOutSupabase,
        isCloudSyncing,
        syncCollectionWithCloud: () => syncCollectionWithCloud(),
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchError,
        executeSearch,
        importFromDiscogs,
        hasToken,
        discogsUsername,
        saveToken,
        deleteToken,
        reloadCredentials,
        theme,
        setTheme,
        shelfStyle,
        setShelfStyle,
        realisticSpineEnabled,
        setRealisticSpineEnabled,
        selectedItem,
        setSelectedItem,
        isOnboardingOpen,
        setIsOnboardingOpen,
      }}
    >
      {children}
    </ShelfContext.Provider>
  );
}

export function useShelf() {
  const context = useContext(ShelfContext);
  if (!context) {
    throw new Error('useShelf must be used within a ShelfProvider');
  }
  return context;
}
