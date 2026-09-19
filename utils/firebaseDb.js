const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
    } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64 env variable");
    }
} else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    serviceAccount = {
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL
    };
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env variable");
    }
} else {
    try {
        serviceAccount = require('../serviceAccountKey.json');
    } catch (e) {
        console.warn("serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT not set.");
    }
}

if (!getApps().length && serviceAccount) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();

// Migrate functionality helper
// Read a collection fully
async function readData(collectionName) {
    try {
        const snapshot = await db.collection(collectionName).get();
        if (snapshot.empty) {
            return [];
        }
        const data = [];
        snapshot.forEach(doc => {
            data.push(doc.data());
        });
        return data;
    } catch (error) {
        console.error(`Error reading ${collectionName} from Firestore:`, error);
        return [];
    }
}

// Write/Overwrite a collection safely (Handles array replacements properly by deleting removed items)
async function writeData(collectionName, dataArray) {
    try {
        const batch = db.batch();
        const collectionRef = db.collection(collectionName);
        
        // 1. Fetch existing documents
        const snapshot = await collectionRef.get();
        
        // 2. Track which IDs are in the new array
        const newIds = new Set();
        
        dataArray.forEach(item => {
            const docId = item.id || item.identifier || collectionRef.doc().id;
            if (!item.id && !item.identifier) {
                item.id = docId;
            }
            newIds.add(String(docId));
            
            const docRef = collectionRef.doc(String(docId));
            batch.set(docRef, item, { merge: false }); // Overwrite completely
        });
        
        // 3. Delete documents that are no longer in the new array
        snapshot.docs.forEach(doc => {
            if (!newIds.has(doc.id)) {
                batch.delete(doc.ref);
            }
        });
        
        await batch.commit();
        return true;
    } catch (error) {
        console.error(`Error writing to ${collectionName} in Firestore:`, error);
        return false;
    }
}

// Write a single document
async function writeSingleDocument(collectionName, docId, data) {
    try {
        await db.collection(collectionName).doc(String(docId)).set(data, { merge: true });
        return true;
    } catch (error) {
        console.error(`Error writing single doc in ${collectionName}:`, error);
        return false;
    }
}

// Delete a single document
async function deleteDocument(collectionName, docId) {
    try {
        await db.collection(collectionName).doc(String(docId)).delete();
        return true;
    } catch (error) {
        console.error(`Error deleting doc in ${collectionName}:`, error);
        return false;
    }
}

const { getAuth } = require('firebase-admin/auth');

module.exports = {
    getAuth,
    db,
    readData,
    writeData,
    writeSingleDocument,
    deleteDocument
};
