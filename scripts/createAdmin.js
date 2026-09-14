require('dotenv').config();
const fbDb = require('../utils/firebaseDb');

const ADMIN_EMAIL = 'admin@fusioneducation.com';
const ADMIN_PASS = 'admin123';

async function createAdmin() {
    try {
        console.log(`Checking if ${ADMIN_EMAIL} exists in Firebase Auth...`);
        let userRecord;
        try {
            userRecord = await fbDb.getAuth().getUserByEmail(ADMIN_EMAIL);
            console.log('Admin user already exists in Firebase Auth.');
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                console.log('Admin user not found. Creating in Firebase Auth...');
                userRecord = await fbDb.getAuth().createUser({
                    email: ADMIN_EMAIL,
                    password: ADMIN_PASS,
                    displayName: 'Main Administrator'
                });
                console.log('Successfully created admin user in Firebase Auth:', userRecord.uid);
            } else {
                throw err;
            }
        }

        console.log('Syncing admin user to Firestore "users" collection...');
        const usersRef = fbDb.db.collection('users');
        
        // We can just set the document using the auth UID
        await usersRef.doc(userRecord.uid).set({
            id: userRecord.uid,
            name: 'Main Administrator',
            email: ADMIN_EMAIL,
            role: 'admin',
            branch: 'all',
            status: 'active',
            permissions: ['*'],
            createdAt: new Date().toISOString()
        }, { merge: true });

        console.log('✅ Admin user successfully set up in Firestore!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up admin:', error);
        process.exit(1);
    }
}

createAdmin();
