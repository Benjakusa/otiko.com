import { initializeApp as initFirebase, cert } from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    console.error("FIREBASE_SERVICE_ACCOUNT_PATH not set");
    process.exit(1);
  }
  const fullPath = path.resolve(__dirname, "..", serviceAccountPath);
  const sa = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  initFirebase({ credential: cert(sa) });
  const db = getFirestore();
  const snap = await db.collection("organizers").get();
  if (snap.empty) {
    console.log("No organizers found");
  } else {
    snap.docs.forEach(d => console.log(d.id, JSON.stringify(d.data())));
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
