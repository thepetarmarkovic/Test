const DB_NAME = 'empire_os';
const STORE = 'backup';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSnapshot(data: Record<string, unknown>): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, 'snapshot');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function loadSnapshot(): Promise<Record<string, unknown> | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get('snapshot');
      req.onsuccess = () => resolve((req.result as Record<string, unknown>) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export function requestPersistentStorage(): void {
  if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {});
  }
}
