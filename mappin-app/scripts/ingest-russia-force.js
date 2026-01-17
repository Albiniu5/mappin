const { createClient } = require('@supabase/supabase-js');
const RSSParser = require('rss-parser');
const axios = require('axios');
const path = require('path');

// Load env vars
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
    console.error("Missing credentials.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const parser = new RSSParser({
    headers: { 'User-Agent': 'Mozilla/5.0' }
});

const RSS_URLS = [
    'https://tass.com/rss/v2.xml',
    'https://www.themoscowtimes.com/rss/news',
    'https://www.rt.com/rss/news/',
    'https://www.rferl.org/api/zmoiil-vomx-tpeykmp'
];

async function analyzeWithGemini(title, description) {
    // Simplified prompt to be less robust but more likely to succeed
    const prompt = `Extract conflict data from this news title. JSON only. 
    Fields: latitude(number), longitude(number), location_name(string), category(Armed Conflict|Protest|Political Unrest|Other), severity(1-5), summary(string).
    
    Item: "${title}" - "${description.substring(0, 200)}..."
    
    If no specific location is mentioned, infer the country capital. Never return null coordinates.
    `;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
        const response = await axios.post(url, { contents: [{ parts: [{ text: prompt }] }] });
        const text = response.data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data = JSON.parse(jsonStr);
        if (Array.isArray(data)) data = data[0];
        return data;
    } catch (e) {
        console.error(`   ⚠️ Gemini Error: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log("🚀 Starting Force Ingest for Russian Feeds...");

    for (const url of RSS_URLS) {
        console.log(`\n📡 Fetching ${url}...`);
        try {
            const feed = await parser.parseURL(url);
            console.log(`   Found ${feed.items.length} items. Processing top 5...`);

            const items = feed.items.slice(0, 5);

            for (const item of items) {
                // Check dupes
                const { data: existing } = await supabase.from('conflicts').select('id').eq('source_url', item.link).single();
                if (existing) {
                    console.log(`   ⏭️ Skipped (Duplicate): ${item.title.substring(0, 30)}...`);
                    continue;
                }

                console.log(`   🧠 Analyzing: ${item.title.substring(0, 50)}...`);
                let analysis = await analyzeWithGemini(item.title, item.contentSnippet || "");

                // Debug log
                if (analysis) console.log(`      Gemini Output:`, JSON.stringify(analysis));

                if (analysis && (analysis.latitude == null || analysis.longitude == null)) {
                    console.log("      ⚠️ Missing coordinates. Attempting fallback...");
                    // Simple Fallback logic
                    if (item.title.toLowerCase().includes('russia') || item.title.toLowerCase().includes('moscow')) {
                        analysis.latitude = 55.7558;
                        analysis.longitude = 37.6173;
                        analysis.location_name = "Moscow, Russia (Inferred)";
                        console.log("      📍 Fallback to Moscow.");
                    } else if (item.title.toLowerCase().includes('kiev') || item.title.toLowerCase().includes('kyiv')) {
                        analysis.latitude = 50.4501;
                        analysis.longitude = 30.5234;
                        analysis.location_name = "Kyiv, Ukraine (Inferred)";
                        console.log("      📍 Fallback to Kyiv.");
                    } else if (item.title.toLowerCase().includes('us') || item.title.toLowerCase().includes('trump')) {
                        analysis.latitude = 38.9072;
                        analysis.longitude = -77.0369;
                        analysis.location_name = "Washington D.C. (Inferred)";
                        console.log("      📍 Fallback to Washington D.C.");
                    }
                }

                if (analysis && analysis.latitude != null) {
                    const { error } = await supabase.from('conflicts').insert({
                        title: item.title,
                        description: analysis.summary,
                        source_url: item.link,
                        published_at: new Date(item.pubDate).toISOString(),
                        latitude: analysis.latitude,
                        longitude: analysis.longitude,
                        location_name: analysis.location_name,
                        category: analysis.category,
                        severity: analysis.severity,
                        created_at: new Date().toISOString()
                    });

                    if (error) console.error(`   ❌ DB Error: ${error.message}`);
                    else console.log(`   ✅ Inserted: ${analysis.location_name}`);

                    // Rate limit
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        } catch (e) {
            console.error(`   ❌ Feed Error: ${e.message}`);
        }
    }
    console.log("\n✅ Done!");
}

run();
