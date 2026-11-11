import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'shelfapp_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_covers';
const LOCAL_STORAGE_PREFIX = 'shelfapp_cover_';

const memoryStore = new Map<number, string>();

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Resizes and heavily compresses an image client-side to ensure lightweight storage
 * (~20KB - 35KB) for instant loading, minimal local storage use, and light database rows.
 */
export async function optimizeCoverImage(
  file: File | Blob,
  maxDimension = 512,
  quality = 0.76
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Crop or resize maintaining aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Attempt high compression WebP first (~20KB)
      try {
        const webpData = canvas.toDataURL('image/webp', quality);
        if (webpData.startsWith('data:image/webp')) {
          resolve(webpData);
          return;
        }
      } catch {
        // Fallback to JPEG
      }

      const jpegData = canvas.toDataURL('image/jpeg', quality);
      resolve(jpegData);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(err);
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Saves a compressed custom cover in BOTH localStorage and IndexedDB.
 */
export async function saveLocalCover(releaseId: number | string, file: File | Blob): Promise<string> {
  const cleanId = Number(releaseId);
  const dataUrl = await optimizeCoverImage(file, 512, 0.76);
  return saveLocalCoverFromDataUrl(cleanId, dataUrl);
}

/**
 * Saves an existing dataUrl into local storage (localStorage + IndexedDB + memory).
 */
export async function saveLocalCoverFromDataUrl(releaseId: number | string, dataUrl: string): Promise<string> {
  const cleanId = Number(releaseId);
  
  // 1. In-memory
  memoryStore.set(cleanId, dataUrl);

  // 2. localStorage (instant synchronous fallback)
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${cleanId}`, dataUrl);
  } catch (err) {
    console.warn('localStorage full or quota exceeded for cover:', err);
  }

  // 3. IndexedDB (persistent asynchronous database)
  if (isIndexedDBAvailable()) {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, dataUrl, cleanId);
    } catch (err) {
      console.warn('Failed to save cover in IndexedDB:', err);
    }
  }

  return dataUrl;
}

/**
 * Retrieves a custom cover by releaseId from memory, localStorage or IndexedDB.
 */
export async function getLocalCover(releaseId: number | string): Promise<string | null> {
  const cleanId = Number(releaseId);

  // 1. Memory check
  if (memoryStore.has(cleanId)) {
    return memoryStore.get(cleanId) || null;
  }

  // 2. localStorage check
  try {
    const fromLocal = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${cleanId}`);
    if (fromLocal) {
      memoryStore.set(cleanId, fromLocal);
      return fromLocal;
    }
  } catch {
    // ignore
  }

  // 3. IndexedDB check
  if (isIndexedDBAvailable()) {
    try {
      const db = await getDB();
      const fromDB = await db.get(STORE_NAME, cleanId);
      if (fromDB) {
        memoryStore.set(cleanId, fromDB);
        return fromDB;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Deletes a custom cover from all local storages.
 */
export async function deleteLocalCover(releaseId: number | string): Promise<void> {
  const cleanId = Number(releaseId);
  memoryStore.delete(cleanId);

  try {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${cleanId}`);
  } catch {
    // ignore
  }

  if (isIndexedDBAvailable()) {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, cleanId);
    } catch (err) {
      console.warn('Failed to delete cover from IndexedDB:', err);
    }
  }
}

/**
 * Returns all custom covers in one dictionary: { [releaseId]: dataUrl }
 * Combines localStorage and IndexedDB.
 */
export async function getAllLocalCovers(): Promise<Record<number, string>> {
  const result: Record<number, string> = {};

  // 1. Memory Store
  for (const [key, value] of memoryStore.entries()) {
    result[key] = value;
  }

  // 2. LocalStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
        const id = Number(key.replace(LOCAL_STORAGE_PREFIX, ''));
        if (!isNaN(id)) {
          const val = localStorage.getItem(key);
          if (val) {
            result[id] = val;
            memoryStore.set(id, val);
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. IndexedDB
  if (isIndexedDBAvailable()) {
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const keys = await store.getAllKeys();
      const values = await store.getAll();
      for (let i = 0; i < keys.length; i++) {
        const id = Number(keys[i]);
        if (!isNaN(id) && values[i]) {
          result[id] = values[i] as string;
          memoryStore.set(id, values[i] as string);
        }
      }
    } catch {
      // ignore
    }
  }

  return result;
}

/**
 * Clears all stored covers from all local storages.
 */
export async function clearAllLocalCovers(): Promise<void> {
  memoryStore.clear();

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }

  if (isIndexedDBAvailable()) {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    } catch (err) {
      console.warn('Failed to clear covers in IndexedDB:', err);
    }
  }
}
