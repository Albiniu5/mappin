const axios = require('axios');

async function testN8n() {
    const webhookUrl = 'http://localhost:5678/webhook/ingest';

    console.log(`Testing n8n webhook: ${webhookUrl}`);

    const payload = {
        items: [
            {
                title: "DIRECT TEST: AI Conflict Analysis",
                description: "This is a direct test payload sent from a script to verify the n8n workflow processes items correctly.",
                link: "http://localhost/test",
                date: new Date().toISOString()
            }
        ]
    };

    try {
        const response = await axios.post(webhookUrl, payload);
        console.log(`Response: ${response.status} ${response.statusText}`);
        console.log('✅ Payload sent successfully.');
        console.log('Check n8n executions now - it should take >1s (not 5ms)');
    } catch (error) {
        console.error('Error sending payload:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

testN8n();
