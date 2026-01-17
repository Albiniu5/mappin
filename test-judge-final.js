// Final test - send article to the CORRECT webhook (Hetzner n8n with The Judge)
const finalTest = {
    items: [
        {
            title: "EU responds to Trump's Gaza Board of Peace initiative",
            description: "European Union officials are evaluating Trump's proposal to establish a Board of Peace for Gaza governance, with Erdogan and Blair as potential oversight members",
            url: "https://example.com/eu-board-of-peace-response",
            date: new Date().toISOString()
        }
    ]
};

fetch('http://n8n-ncssgw0cw8sc40wc0s80ccc8.77.42.91.174.sslip.io/webhook/ingest-live', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(finalTest)
})
    .then(res => {
        console.log('✅ Article sent to Hetzner n8n! Status:', res.status);
        console.log('🎯 The Judge should now find the existing Board of Peace articles!');
        console.log('\n⏰ Wait 45 seconds, then check:');
        console.log('   1. Hetzner n8n executions: http://n8n-ncssgw0cw8sc40wc0s80ccc8.77.42.91.174.sslip.io');
        console.log('   2. Run the Supabase query again');
        console.log('   3. Check your map for ⚖️ badges!');
        return res.text();
    })
    .then(text => {
        console.log('Response:', text);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
    });
