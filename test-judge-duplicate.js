// Send a SECOND article about the same conflict
// This will trigger The Judge to compare narratives!

const duplicateArticle = {
    items: [
        {
            title: "Gaza violence continues amid ceasefire talks",
            description: "The ongoing conflict shows no signs of stopping as diplomatic efforts continue",
            url: "https://example.com/test-article-2",
            date: new Date().toISOString()
        }
    ]
};

fetch('http://n8n-ncssgw0cw8sc40wc0s80ccc8.77.42.91.174.sslip.io/webhook/ingest-live', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(duplicateArticle)
})
    .then(res => {
        console.log('✅ Second article sent! Status:', res.status);
        console.log('🎯 The Judge should now compare both articles!');
        console.log('Check n8n Executions to see the verdict');
        return res.text();
    })
    .then(text => {
        console.log('Response:', text);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
    });
