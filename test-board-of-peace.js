// Send an article about the same "Board of Peace" event
// The Judge should recognize it's related to the existing 4 articles!

const boardOfPeaceArticle = {
    items: [
        {
            title: "International leaders react to Trump's Gaza Board of Peace proposal",
            description: "World leaders are responding to the Trump administration's proposal for a 'Board of Peace' to oversee Gaza, with Erdogan and Tony Blair named as potential members",
            url: "https://example.com/board-of-peace-reactions",
            date: new Date().toISOString()
        }
    ]
};

fetch('http://n8n-ncssgw0cw8sc40wc0s80ccc8.77.42.91.174.sslip.io/webhook/ingest-live', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(boardOfPeaceArticle)
})
    .then(res => {
        console.log('✅ Article sent! Status:', res.status);
        console.log('🎯 The Judge should find the 4 existing similar articles!');
        console.log('Wait 30 seconds, then run the Supabase query again');
        return res.text();
    })
    .then(text => {
        console.log('Response:', text);
        console.log('\n📊 Next: Re-run the Supabase query to see if narrative_analysis appears!');
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
    });
