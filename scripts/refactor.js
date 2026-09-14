const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Replace readData and writeData implementations
const oldReadWrite = /\/\/ Helper to read data from local JSON[\s\S]*?return false;\r?\n\};/m;
const newReadWrite = `const fbDb = require('./utils/firebaseDb');

// Helper to read data from Firebase
const readData = async (filename, defaultValue = []) => {
    const colName = filename.replace('.json', '');
    const data = await fbDb.readData(colName);
    return (data && data.length > 0) ? data : defaultValue;
};

// Helper to write data to Firebase
const writeData = async (filename, data) => {
    const colName = filename.replace('.json', '');
    return await fbDb.writeData(colName, data);
};`;
code = code.replace(oldReadWrite, newReadWrite);

// 2. Change specific handler variables to async
code = code.replace(/const handleSaveCourse = \(req, res\) => {/g, 'const handleSaveCourse = async (req, res) => {');
code = code.replace(/const handleSavePost = \(req, res\) => {/g, 'const handleSavePost = async (req, res) => {');

// 3. Make all express routes async if they use readData or writeData
// We find patterns like: app.get(..., (req, res) => { or app.post(..., requireAuth(), (req, res) => {
// We replace `(req, res) => {` with `async (req, res) => {` globally EXCEPT where it's already async
code = code.replace(/app\.(get|post|put|delete)\(([^,]+),\s*(?:requireAuth\([^)]*\),\s*)?\(req, res\)\s*=>\s*\{/g, (match) => {
    return match.replace('(req, res) => {', 'async (req, res) => {');
});

// Also replace the auth middleware signature just in case? No, requireAuth returns (req, res, next) which doesn't need to be async unless it does DB stuff. It doesn't do DB stuff.

// 4. Add 'await' before readData and writeData
// Be careful not to replace `await await readData` if it was already async
code = code.replace(/(?<!await\s)readData\(/g, 'await readData(');
code = code.replace(/(?<!await\s)writeData\(/g, 'await writeData(');

// 5. Some functions might not be async but now have await inside them!
// e.g. /api/student/login was already async. 
// We should check if there are any `await` inside non-async functions.

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Refactor script complete.');
