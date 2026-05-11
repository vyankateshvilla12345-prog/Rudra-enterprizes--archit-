import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// CRITICAL CONSTRAINT: Validate Connection to Firestore
async function testConnection() {
  try {
    // Attempt to read a dummy document to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified.");
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else if (error.message?.includes('insufficient permissions')) {
      // If we got a permission error, we actually successfully reached the server!
      console.log("Firestore reachability verified (though document access was denied).");
    } else {
      console.error("Firestore connectivity issue:", error);
    }
  }
}
testConnection();
