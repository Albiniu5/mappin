const axios = require('axios');

async function testWebhook() {
    const url = 'http://localhost:5678/webhook/ingest-live';
    console.log(`Checking ${url}...`);
    try {
        const res = await axios.post(url, { items: [{ title: 'Test' }] });
        console.log(`✅ Success: ${res.status}`);
    } catch (err) {
        if (err.response) {
            console.log(`❌ Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
        } else {
            console.log(`❌ Network Error: ${err.message}`);
        }
    }
}

testWebhook();
