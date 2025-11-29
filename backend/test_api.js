const fs = require('fs');
const API_URL = 'http://localhost:3100/api';

async function test() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password123' })
        });

        if (!loginRes.ok) {
            const errText = await loginRes.text();
            try {
                const errJson = JSON.parse(errText);
                throw new Error(`Login failed: ${loginRes.status} ${errJson.message || errText}`);
            } catch (e) {
                throw new Error(`Login failed: ${loginRes.status} ${errText}`);
            }
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Login successful.');

        // 2. Test ALL
        console.log('\n--- Testing Country: ALL ---');
        const allRes = await fetch(`${API_URL}/sales-data/stats?startDate=2023-01-01&endDate=2025-12-31&countryCode=ALL`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!allRes.ok) {
            throw new Error(`ALL stats failed: ${allRes.status} ${await allRes.text()}`);
        }

        const allData = await allRes.json();
        console.log('Summary (ALL):', JSON.stringify(allData.summary, null, 2));

        // 3. Test ID
        console.log('\n--- Testing Country: ID ---');
        const idRes = await fetch(`${API_URL}/sales-data/stats?startDate=2023-01-01&endDate=2025-12-31&countryCode=ID`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!idRes.ok) {
            throw new Error(`ID stats failed: ${idRes.status} ${await idRes.text()}`);
        }

        const idData = await idRes.json();
        console.log('Summary (ID):', JSON.stringify(idData.summary, null, 2));

    } catch (error) {
        console.error('Test Failed:', error);
        fs.writeFileSync('test_error.log', error.toString());
    }
}

test();
