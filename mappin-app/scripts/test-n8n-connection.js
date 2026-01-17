// Native fetch in Node 18+

async function testWebhook() {
    const url = 'http://localhost:5678/webhook/ingest-live';
    console.log(`Testing POST to ${url}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true, message: "Hello from script" })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.status === 404) {
            console.log("❌ 404 Not Found - The webhook is not active or the URL is wrong.");
            console.log("Tip: Check if the workflow is 'Active' (Green switch) in n8n.");
        } else if (response.status === 200) {
            console.log("✅ Success! n8n received the data.");
        } else {
            const text = await response.text();
            console.log("Response:", text);
        }
    } catch (error) {
        console.error("❌ Connection Failed:", error.message);
    }
}

testWebhook();
