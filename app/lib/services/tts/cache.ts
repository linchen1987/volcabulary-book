import type { AudioUrlCache } from './types';

const DB_NAME = 'vocab-book-tts-cache';
const STORE_NAME = 'audio-url';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains(STORE_NAME)) {
        idb.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const idbAudioUrlCache: AudioUrlCache = {
  async get(word: string): Promise<string | null> {
    const idb = await openDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(word);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  },

  async set(word: string, audioUrl: string): Promise<void> {
    const idb = await openDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(audioUrl, word);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
};
