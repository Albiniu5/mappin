const RSSParser = require('rss-parser');
const axios = require('axios');

const RSS_URLS = [
    'https://tass.com/rss/v2.xml',
    'https://www.themoscowtimes.com/rss/news',
    'https://www.rt.com/rss/news/',
    'https://www.rferl.org/api/zmoiil-vomx-tpeykmp'
];

const parser = new RSSParser({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

async function testFeeds() {
    console.log("Testing Russian Feeds Connectivity...\n");

    for (const url of RSS_URLS) {
        console.log(`Trying: ${url}`);
        try {
            // 1. Try simple axios fetch first to check headers/status
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 5000
            });
            console.log(`   ✅ HTTP Status: ${response.status}`);
            console.log(`   LENGTH: ${response.data.length} chars`);

            // 2. Try RSS Parser
            try {
                const feed = await parser.parseString(response.data);
                console.log(`   ✅ RSS PARSE SUCCESS! Items: ${feed.items.length}`);
                if (feed.items.length > 0) {
                    console.log(`   First Item: ${feed.items[0].title}`);
                }
            } catch (parseErr) {
                console.error(`   ❌ RSS PARSE FAIL:`, parseErr.message);
                // console.log(response.data.substring(0, 200)); // Log snippet
            }

        } catch (e) {
            console.error(`   ❌ FAIL:`, e.message);
            if (e.response) {
                console.error(`   Status: ${e.response.status}`);
            }
        }
        console.log("------------------------------------------");
    }
}

testFeeds();
