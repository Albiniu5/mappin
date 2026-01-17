// Test script to trigger The Judge workflow
// Run with: node test-judge-webhook.js

const testData = {
    items: [
        {
            title: "Conflict in Gaza escalates",
            description: "Fighting intensifies in the region with multiple casualties reported",
            url: "https://example.com/test-article-1",
            date: new Date().toISOString()
        }
    ]
};

fetch('http://n8n-ncssgw0cw8sc40wc0s80ccc8.77.42.91.174.sslip.io/webhook/ingest-live', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
})
    .then(res => {
        console.log('✅ Webhook triggered! Status:', res.status);
        console.log('Check n8n Executions tab to see the workflow running');
        return res.text();
    })
    .then(text => {
        console.log('Response:', text);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
    });
