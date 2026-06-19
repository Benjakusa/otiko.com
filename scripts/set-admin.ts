import crypto from "crypto";
import { initializeApp as initFirebase, cert } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/set-admin.ts <email>");
    process.exit(1);
  }

  // Load .env from project root
  const envPath = path.resolve(__dirname, "..", ".env");
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    console.error("FIREBASE_SERVICE_ACCOUNT_PATH not set in .env");
    process.exit(1);
  }
  const fullPath = path.resolve(__dirname, "..", serviceAccountPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Service account not found at: ${fullPath}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  initFirebase({ credential: cert(serviceAccount) });
  const firestore = getFirestore();
  const auth = getAuth();

  // Look up the Firebase Auth user to get the UID
  let firebaseUid: string;
  try {
    const user = await auth.getUserByEmail(email);
    firebaseUid = user.uid;
    console.log(`Found Firebase Auth user: ${firebaseUid}`);
  } catch {
    console.error(`No Firebase Auth user found with email: ${email}`);
    console.error("They need to sign up first.");
    process.exit(1);
  }

  // Check if an organizer document already exists
  const snap = await firestore.collection("organizers").where("email", "==", email).get();

  if (snap.empty) {
    // Create the organizer document
    const id = `org-${crypto.randomUUID().slice(0, 8)}`;
    const docData = {
      id,
      firebaseUid,
      name: email.split("@")[0],
      email,
      phone: "",
      businessName: `${email.split("@")[0]} Events`,
      kycStatus: "verified",
      mpesaPayoutNumber: "",
      role: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await firestore.collection("organizers").doc(id).set(docData);
    console.log(`Created organizer document for ${email} with role: admin`);
  } else {
    const doc = snap.docs[0];
    await doc.ref.update({ role: "admin" });
    console.log(`Promoted ${email} to admin (document: ${doc.id})`);
  }

  console.log("Restart the server for the change to take effect.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
