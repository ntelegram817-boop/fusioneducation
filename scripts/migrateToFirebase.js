const fs = require('fs');
const path = require('path');
const { writeData } = require('../utils/firebaseDb');

const dataDir = path.join(__dirname, '../data');

async function migrate() {
    console.log('Starting migration to Firebase Firestore...');

    const files = fs.readdirSync(dataDir);
    
    for (const file of files) {
        if (file.endsWith('.json')) {
            const collectionName = file.replace('.json', '');
            const filePath = path.join(dataDir, file);
            
            try {
                const rawData = fs.readFileSync(filePath, 'utf8');
                const dataArray = JSON.parse(rawData);
                
                // Only process arrays (like students.json, users.json, etc.)
                if (Array.isArray(dataArray) && dataArray.length > 0) {
                    console.log(`Migrating ${dataArray.length} items to collection '${collectionName}'...`);
                    const success = await writeData(collectionName, dataArray);
                    if (success) {
                        console.log(`Successfully migrated '${collectionName}'`);
                    } else {
                        console.error(`Failed to migrate '${collectionName}'`);
                    }
                } else if (typeof dataArray === 'object' && !Array.isArray(dataArray)) {
                    // It's a single object (like settings.json or admissionCounter.json)
                    console.log(`Migrating object to collection '${collectionName}'...`);
                    // We wrap it in an array to use our writeData function, or write directly
                    const success = await writeData(collectionName, [{ id: 'default', ...dataArray }]);
                    if (success) {
                        console.log(`Successfully migrated '${collectionName}'`);
                    } else {
                        console.error(`Failed to migrate '${collectionName}'`);
                    }
                } else {
                    console.log(`Skipping empty or invalid file '${file}'`);
                }
            } catch (err) {
                console.error(`Error processing file '${file}':`, err);
            }
        }
    }
    
    console.log('Migration finished.');
    process.exit(0);
}

migrate();
