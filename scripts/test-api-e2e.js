
// Native fetch in Node 18+

async function testApi() {
    const payload = {
        reports: [
            {
                title: "Test Conflict in Cairo",
                body: "There was a significant protest in Cairo today regarding economic policies.",
                url: "http://example.com/test-cairo-" + Date.now(),
                date: new Date().toISOString(),
                primary_country: { name: "Egypt" }
            }
        ]
    };

    console.log("Sending payload to http://localhost:3000/api/ingest/save...");
    try {
        const response = await fetch('http://localhost:3000/api/ingest/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Data:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Failed to connect to API. Is the server running?");
        console.error(error);
    }
}

testApi();
