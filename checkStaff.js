const fbDb = require('./utils/firebaseDb');
async function checkLoginData() {
    const users = await fbDb.readData('users');
    console.log('users count:', users.length);
    const staff = await fbDb.readData('staff');
    console.log('staff count:', staff.length);
}
checkLoginData().catch(console.error).finally(() => process.exit(0));