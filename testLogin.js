const fetch = require('node-fetch');

async function testLogin() {
    console.log('Testing login...');
    const res = await fetch('http://localhost:3000/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'staff@example.com', password: 'password123' })
    });
    const text = await res.text();
    console.log('Response:', res.status, text);
}
testLogin();