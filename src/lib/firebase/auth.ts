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

// Fallback runtime in case Firebase is not configured in environment variables
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
let realAuth: FirebaseAuth | null = null;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    realAuth = getAuth(app);
  } catch (error) {
    console.error("Firebase SDK initialization error, falling back to simulator:", error);
  }
}

// IN-MEMORY USER REGISTER FOR THE MOCK SIMULATOR
interface MockUser {
  uid: string;
  email: string;
  displayName: string;
}

const mockUsers: MockUser[] = [
  {
    uid: "user-default-uid",
    email: "events@solfest.co.ke",
    displayName: "Sol Generational Group"
  }
];

export const isFirebaseProxyActive = isConfigured && realAuth !== null;

/**
 * Robust wrapper to allow seamless real Firebase or seamless local simulation sandbox.
 */
export const authService = {
  createUser: async (email: string, password: string, displayName: string): Promise<{ uid: string; email: string }> => {
    if (isFirebaseProxyActive && realAuth) {
      const userCred = await fbCreateUser(realAuth, email, password);
      return {
        uid: userCred.user.uid,
        email: userCred.user.email || email,
      };
    } else {
      // Simulator: Register user locally
      const existing = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        throw { code: "auth/email-already-in-use", message: "The email address is already in use by another account." };
      }
      const newUser: MockUser = {
        uid: `sim-uid-${Math.random().toString(36).substring(2, 11)}`,
        email,
        displayName
      };
      mockUsers.push(newUser);
      return { uid: newUser.uid, email: newUser.email };
    }
  },

  signIn: async (email: string, password: string): Promise<{ uid: string; email: string }> => {
    if (isFirebaseProxyActive && realAuth) {
      const userCred = await fbSignIn(realAuth, email, password);
      return {
        uid: userCred.user.uid,
        email: userCred.user.email || email,
      };
    } else {
      // Simulator: Check user credentials
      const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw { code: "auth/user-not-found", message: "No organizer account found with this email." };
      }
      // Simulate generic error on bad credentials or specific verification
      if (password.length < 8) {
        throw { code: "auth/wrong-password", message: "Incorrect password." };
      }
      return { uid: user.uid, email: user.email };
    }
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
    } else {
      // Mock logic: checks if account exists or logs success regardless (best practice for security)
      console.log(`[Simulator] Password reset link sent to: ${email}`);
      return true;
    }
  }
};
