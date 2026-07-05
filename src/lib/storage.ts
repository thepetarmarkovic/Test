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

// --- Binary asset store (exhibit photos, uploaded .glb models) -------------
const ASSET_DB = 'empire_assets';
const ASSET_STORE = 'assets';

async function openAssetDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ASSET_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(ASSET_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAsset(key: string, blob: Blob): Promise<void> {
  const db = await openAssetDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE, 'readwrite');
      tx.objectStore(ASSET_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function loadAsset(key: string): Promise<Blob | null> {
  try {
    const db = await openAssetDB();
    try {
      return await new Promise((resolve) => {
        const tx = db.transaction(ASSET_STORE, 'readonly');
        const req = tx.objectStore(ASSET_STORE).get(key);
        req.onsuccess = () => resolve((req.result as Blob) ?? null);
        req.onerror = () => resolve(null);
      });
    } finally { db.close(); }
  } catch { return null; }
}

export async function deleteAsset(key: string): Promise<void> {
  try {
    const db = await openAssetDB();
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(ASSET_STORE, 'readwrite');
        tx.objectStore(ASSET_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } finally { db.close(); }
  } catch { /* ignore */ }
}
