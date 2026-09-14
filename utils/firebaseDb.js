const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
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

// Write/Overwrite a collection (not recommended for large datasets, but keeping interface similar for now)
// A better way is to update specific documents.
async function writeData(collectionName, dataArray) {
    try {
        const batch = db.batch();
        const collectionRef = db.collection(collectionName);
        
        // Caution: To truly mimic writeData (which overwrites everything), we would need to delete all existing docs first.
        // For efficiency, we assume dataArray items have an 'id' property.
        dataArray.forEach(item => {
            // Ensure the item has the id set
            const docId = item.id || item.identifier || db.collection(collectionName).doc().id;
            if (!item.id && !item.identifier) {
                item.id = docId;
            }
            const docRef = collectionRef.doc(String(docId));
            batch.set(docRef, item, { merge: true });
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
