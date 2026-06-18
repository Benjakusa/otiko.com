import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword as fbCreateUser, 
  signInWithEmailAndPassword as fbSignIn, 
  sendPasswordResetEmail as fbResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  Auth as FirebaseAuth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const hostEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: hostEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: hostEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: hostEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: hostEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: hostEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: hostEnv.VITE_FIREBASE_APP_ID || ""
};

const isConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY";

let app;
let realAuth: ReturnType<typeof getAuth> | null = null;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    realAuth = getAuth(app);
  } catch (error) {
    console.error("Firebase SDK initialization error, falling back to simulator:", error);
  }
}

export const db = isConfigured ? getFirestore(app) : null;

export const isFirebaseProxyActive = isConfigured && realAuth !== null;

export interface AuthResult {
  uid: string;
  email: string;
  idToken: string;
}

export const authService = {
  createUser: async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    if (isFirebaseProxyActive && realAuth) {
      const userCred = await fbCreateUser(realAuth, email, password);
      const idToken = await userCred.user.getIdToken();
      return { uid: userCred.user.uid, email: userCred.user.email || email, idToken };
    }
    const uid = `sim-uid-${Math.random().toString(36).substring(2, 11)}`;
    return { uid, email, idToken: uid };
  },

  signIn: async (email: string, password: string): Promise<AuthResult> => {
    if (isFirebaseProxyActive && realAuth) {
      const userCred = await fbSignIn(realAuth, email, password);
      const idToken = await userCred.user.getIdToken();
      return { uid: userCred.user.uid, email: userCred.user.email || email, idToken };
    }
    if (email === "events@solfest.co.ke") {
      return { uid: "user-default-uid", email, idToken: "user-default-uid" };
    }
    throw { code: "auth/user-not-found", message: "No organizer account found with this email." };
  },

  signInWithGoogle: async (): Promise<{ uid: string; email: string; displayName: string }> => {
    if (isFirebaseProxyActive && realAuth) {
      const provider = new GoogleAuthProvider();
      // Enforce custom parameters to ensure prompt selection
      provider.setCustomParameters({ prompt: "select_account" });
      const userCred = await signInWithPopup(realAuth, provider);
      return {
        uid: userCred.user.uid,
        email: userCred.user.email || "",
        displayName: userCred.user.displayName || "Google Organizer"
      };
    } else {
      // Simulator: Sign in with mock Google credentials
      return {
        uid: "user-default-uid",
        email: "events@solfest.co.ke",
        displayName: "Sol Generational Group"
      };
    }
  },

  sendResetEmail: async (email: string): Promise<boolean> => {
    if (isFirebaseProxyActive && realAuth) {
      await fbResetEmail(realAuth, email);
      return true;
    }
    console.log(`[Simulator] Password reset link sent to: ${email}`);
    return true;
  }
};
