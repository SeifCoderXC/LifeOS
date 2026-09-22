import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

declare global {
  // eslint-disable-next-line no-var
  var __lifeosFirebaseApp: App | undefined;
}

function loadApp(): App {
  if (globalThis.__lifeosFirebaseApp) return globalThis.__lifeosFirebaseApp;
  if (getApps().length) {
    globalThis.__lifeosFirebaseApp = getApps()[0];
    return globalThis.__lifeosFirebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local " +
        "(Firebase console -> Project settings -> Service accounts -> Generate new private key).",
    );
  }

  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  globalThis.__lifeosFirebaseApp = app;
  return app;
}

let _db: Firestore | null = null;

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(loadApp());
  return _db;
}
