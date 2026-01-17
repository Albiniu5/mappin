const { createClient } = require('@supabase/supabase-js');
const RSSParser = require('rss-parser');
const axios = require('axios');

// --- CONFIG ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
    console.error("Missing required environment variables. Please check .env.local");
    process.exit(1);
}

console.log("Using Gemini Key:", GEMINI_API_KEY.substring(0, 10) + "...");

const RSS_URLS = [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://www.reuters.com/rssfeed/worldNews',
    'https://rsshub.app/apnews/topics/apf-topnews',
    'https://www.france24.com/en/rss',
    'https://rss.cnn.com/rss/cnn_world.rss',
    'https://www.theguardian.com/world/rss',
    'https://www.middleeasteye.net/rss',
    'https://www.defensenews.com/arc/outboundfeeds/rss/',
    'https://www.crisisgroup.org/rss.xml',
    'https://iswresearch.org/feeds/posts/default',
    'https://kyivindependent.com/news-archive/rss',
    'https://www.scmp.com/rss/3/feed',
];

const parser = new RSSParser();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function analyzeWithGemini(title, description) {
    const prompt = `Analyze this news for conflict data. JSON only. Fields: latitude(num), longitude(num), location_name(str), category(Armed Conflict|Protest|Political Unrest|Other), severity(1-5), summary(str). RULES: 1. If location is a country/region, use the geographic center or capital coordinates. 2. NEVER return null for latitude/longitude. 3. Return a SINGLE JSON object, not an array. Input: Title: ${title} Desc: ${description}`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        const text = response.data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data = JSON.parse(jsonStr);

        // Handle array response (just in case)
        if (Array.isArray(data)) {
            data = data[0];
        }

        if (!data || !data.latitude || !data.longitude) {
            console.log("⚠️ Missing Location Data:", JSON.stringify(data));
            return null;
        }
        return data;
    } catch (e) {
        console.error("Gemini/Parse Error:", e.message);
        return null;
    }
}

async function run() {
    console.log("Starting Manual Data Backfill...");
    let totalInserted = 0;

    for (const url of RSS_URLS) {
        try {
            console.log(`Fetching ${url}...`);
            const feed = await parser.parseURL(url);

            // Take top 5 items per feed
            const items = feed.items.slice(0, 5);

            for (const item of items) {
                // Check dupes first
                const { data: existing } = await supabase.from('conflicts').select('id').eq('source_url', item.link).single();
                if (existing) {
                    process.stdout.write('.');
                    continue;
                }

                console.log(`\nProcessing: ${item.title}`);
                const analysis = await analyzeWithGemini(item.title, item.contentSnippet || item.description || "");

                if (analysis) {
                    const { error } = await supabase.from('conflicts').insert({
                        title: item.title,
                        description: analysis.summary || item.contentSnippet,
                        source_url: item.link,
                        published_at: new Date(item.pubDate).toISOString(),
                        latitude: analysis.latitude,
                        longitude: analysis.longitude,
                        location_name: analysis.location_name,
                        category: analysis.category,
                        severity: analysis.severity,
                        created_at: new Date().toISOString()
                    });

                    if (error) console.error("DB Insert Error:", error.message);
                    else {
                        console.log("✅ Inserted!");
                        totalInserted++;
                    }

                    // Rate limit: 2s delay
                    await delay(2000);
                }
            }
        } catch (e) {
            console.error(`Feed Error ${url}:`, e.message);
        }
    }

    console.log(`\n\n🎉 DONE! Inserted ${totalInserted} new conflicts.`);
}

run();
