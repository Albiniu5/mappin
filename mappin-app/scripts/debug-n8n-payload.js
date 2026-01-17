// Native fetch in Node 18+
async function debugN8n() {
    const url = 'http://localhost:5678/webhook/ingest-live';

    const mockPayload = {
        items: [
            {
                title: "Test Conflict Report",
                description: "Protest in Paris regarding pension reform.",
                url: "http://example.com/test-" + Date.now(),
                date: new Date().toISOString()
            }
        ]
    };

    console.log(`Sending payload to ${url}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mockPayload)
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log("Response Body:", text);

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

debugN8n();
