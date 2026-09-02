// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAt7eZy9Y5YhgORngxfp2XOE-ouccgdlpQ",
  authDomain: "fusion-education-bd.firebaseapp.com",
  projectId: "fusion-education-bd",
  storageBucket: "fusion-education-bd.firebasestorage.app",
  messagingSenderId: "994662359124",
  appId: "1:994662359124:web:610596b416e2eb46528dc1",
  measurementId: "G-XFPG9M9XDP"
};

// Initialize Firebase using the Compat SDK (loaded via CDN in HTML)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Export to window so other scripts can use them without modules
window.db = db;
window.storage = storage;
window.auth = auth;
