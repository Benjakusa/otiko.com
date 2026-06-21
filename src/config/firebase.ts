import { initializeApp as initFirebase, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

export let firestore: Firestore | null = null;
export let firebaseAuth: ReturnType<typeof getAuth> | null = null;

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "";

export function initFirebaseAdmin() {
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      if (getApps().length === 0) {
        initFirebase({ credential: cert(serviceAccount) });
      }
      firestore = getFirestore() as Firestore;
      firebaseAuth = getAuth();
      console.log("[Firebase] Admin SDK initialized successfully");
    } catch (err) {
      console.error("[Firebase] Admin SDK init failed:", err);
    }
  } else {
    console.log("[Firebase] No service account found");
  }
}

initFirebaseAdmin();
