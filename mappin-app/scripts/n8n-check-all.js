const axios = require('axios');

async function check(url, name) {
    try {
        console.log(`Checking ${name}: ${url}`);
        const res = await axios.post(url, { test: 1 });
        console.log(`✅ ${name} is LISTENING (Status: ${res.status})`);
        return true;
    } catch (err) {
        if (err.response) {
            if (err.response.status === 404) {
                console.log(`❌ ${name} returned 404 (Not Registered)`);
            } else {
                console.log(`⚠️ ${name} returned ${err.response.status} (Might be working!)`);
            }
        } else {
            console.log(`❌ ${name} Network Error: ${err.message}`);
        }
        return false;
    }
}

async function run() {
    const base = 'http://localhost:5678';
    console.log('--- N8N DIAGNOSTICS ---');

    // Check Live Paths
    await check(`${base}/webhook/ingest`, 'Live (Old /ingest)');
    await check(`${base}/webhook/ingest-live`, 'Live (New /ingest-live)');

    // Check Test Paths (Works when user clicks "Listen")
    await check(`${base}/webhook-test/ingest`, 'Test (Old /ingest)');
    await check(`${base}/webhook-test/ingest-live`, 'Test (New /ingest-live)');

    console.log('-----------------------');
}

run();
