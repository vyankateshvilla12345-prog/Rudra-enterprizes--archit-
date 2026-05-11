import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Configuration
let firebaseConfig: any = {};
try {
  const configPath = path.join(__dirname, "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } else {
    console.warn("firebase-applet-config.json not found, using environment variables.");
    firebaseConfig = {
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || "(default)"
    };
  }
} catch (e) {
  console.error("Error loading Firebase config:", e);
}

// --- Firebase Admin Initialization ---
const configProjectId = firebaseConfig.projectId;
const envProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID;
console.log("Config Project ID:", configProjectId);
console.log("Environment Project ID:", envProjectId);

let adminApp;
try {
  if (!admin.apps.length) {
    // Try to initialize with the project ID from config
    // If we're on GCP, ADC will handle authentication.
    adminApp = admin.initializeApp({
      projectId: configProjectId
    });
    console.log(`Initialzed Firebase Admin for Project: ${configProjectId}`);
  } else {
    adminApp = admin.app();
  }
} catch (e: any) {
  console.warn("Failed to initialize with config project ID, falling back to default:", e.message);
  adminApp = !admin.apps.length ? admin.initializeApp() : admin.app();
}

const auth = admin.auth(adminApp);
const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

const db = getFirestore(adminApp, dbId || "(default)");
db.settings({ ignoreUndefinedProperties: true });

console.log(`Targeting Firestore database ID: ${dbId || "(default)"}`);
console.log("-------------------------------------");

async function testAdminWrite() {
  try {
    console.log(`[Test] Writing to Firestore...`);
    const testDoc = db.collection("_system_test_").doc("ping");
    await testDoc.set({
      timestamp: new Date().toISOString(),
      source: "server.ts",
      configProject: firebaseConfig.projectId
    });
    console.log("[Test] Admin Firestore write test SUCCESSFUL");
  } catch (e: any) {
    console.error("[Test] Admin Firestore write test FAILED:", e.message);
    if (e.message.includes("PERMISSION_DENIED")) {
       console.error("HINT: This usually means the Service Account lacks 'Cloud Datastore User' permissions on project " + firebaseConfig.projectId + " or the project ID is incorrect.");
    } else if (e.message.includes("NOT_FOUND")) {
       console.error("HINT: The database instance might not exist or the project ID is wrong.");
    }
  }
}
testAdminWrite();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to link an existing Firebase User by UID
  app.post("/api/admin/assign-role", async (req, res) => {
    try {
      const { uid, role, displayName, username, email, phoneNumber, vehicleNumber } = req.body;
      
      if (!uid) return res.status(400).json({ error: "UID is required" });

      // Create or Update in Firestore 'users' collection
      await db.collection("users").doc(uid).set({
        uid,
        email: email || "",
        username: username || "",
        displayName: displayName || "New Staff",
        role, // admin, driver, accountant
        phoneNumber: phoneNumber || "",
        vehicleNumber: vehicleNumber || "",
        activeDispatchId: null,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      res.json({ success: true, uid });
    } catch (error: any) {
      console.error("Error linking user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Keep old endpoint but make it more robust (optional)
  app.post("/api/admin/create-user", async (req, res) => {
    try {
      const { email, password, displayName, role, username, phoneNumber, vehicleNumber } = req.body;
      
      // Basic sanitization for phone number (E.164 requires + and digits)
      const sanitizedPhone = phoneNumber ? phoneNumber.replace(/[^\d+]/g, "") : null;

      if (sanitizedPhone && !sanitizedPhone.startsWith('+')) {
        throw new Error("Phone number must start with '+' (E.164 format). Example: +11234567890");
      }

      // 1. Create in Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
        ...(sanitizedPhone && { phoneNumber: sanitizedPhone }),
      });

      // 2. Create in Firestore 'users' collection
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        username,
        displayName,
        role, // admin, driver, accountant
        phoneNumber: sanitizedPhone || phoneNumber,
        vehicleNumber: vehicleNumber || "",
        activeDispatchId: null,
        createdAt: new Date().toISOString(),
      });

      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      let message = error.message;
      if (message.includes("E.164")) {
        message = "Invalid Phone Format: Use E.164 (e.g. +11234567890). Include the '+' sign.";
      } else if (message.includes("identitytoolkit.googleapis.com")) {
        message = "Identity Toolkit API is disabled. Please enable it in Google Cloud Console to create users: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=" + firebaseConfig.projectId;
      }
      res.status(500).json({ error: message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
