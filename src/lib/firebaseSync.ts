import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, off, Database, DataSnapshot } from 'firebase/database';
import type { CompetitorProfile } from '../types';

let app: FirebaseApp | null = null;
let db: Database | null = null;

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function initFirebase(config: FirebaseConfig): boolean {
  try {
    if (!config.databaseURL) return false;
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApps()[0];
    }
    db = getDatabase(app);
    return true;
  } catch {
    return false;
  }
}

export function isFirebaseReady(): boolean {
  return db !== null;
}

export function publishProfile(operatorId: string, profile: CompetitorProfile): Promise<void> {
  if (!db) return Promise.reject(new Error('Firebase not initialized'));
  const r = ref(db, `empire_operators/${operatorId}`);
  return set(r, { ...profile, lastSync: new Date().toISOString() });
}

export function subscribeToOperator(
  operatorId: string,
  callback: (profile: CompetitorProfile | null) => void
): () => void {
  if (!db) return () => {};
  const r = ref(db, `empire_operators/${operatorId}`);
  const handler = (snap: DataSnapshot) => {
    callback(snap.exists() ? (snap.val() as CompetitorProfile) : null);
  };
  onValue(r, handler);
  return () => off(r, 'value', handler);
}
