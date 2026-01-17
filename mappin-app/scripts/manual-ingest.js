const { createClient } = require('@supabase/supabase-js');
const RSSParser = require('rss-parser');
const axios = require('axios');
const path = require('path');

// Load env vars from .env.local
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

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
    // --- GLOBAL NEWS AGENCIES ---
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://www.france24.com/en/rss',
    'https://feedx.net/rss/ap.xml', // Associated Press

    // --- NORTH AMERICA ---
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://feeds.washingtonpost.com/rss/world',
    'https://www.cbsnews.com/latest/rss/world',
    'https://feeds.nbcnews.com/nbcnews/public/news',
    'https://www.politico.com/rss/politicopicks.xml',
    'https://rssfeeds.usatoday.com/UsatodaycomNation-TopStories',
    'https://feeds.a.dj.com/rss/RSSWorldNews.xml', // WSJ
    // Canada
    'https://www.cbc.ca/cmlink/rss-world',
    'https://globalnews.ca/world/feed/',
    'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/world/',
    'https://nationalpost.com/category/world/feed/',

    // --- SOUTH AMERICA ---
    'https://en.mercopress.com/rss',
    'https://latinvex.com/feed',
    'https://elcomercio.pe/arc/outboundfeeds/rss/?outputType=xml',
    'https://www1.folha.uol.com.br/emcimadahora/rss091.xml',
    'https://www.latercera.com/arc/outboundfeeds/rss/?outputType=xml',
    'https://www.clarin.com/rss/politica/',
    'https://www.eluniverso.com/arc/outboundfeeds/rss/',
    'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml',

    // --- EUROPE ---
    'https://www.euronews.com/rss?format=xml',
    'https://www.theguardian.com/world/rss',

    // --- AFRICA ---
    'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf',
    'https://www.africanews.com/rss',
    'https://feeds.bbci.co.uk/news/africa/rss.xml',
    'https://www.news24.com/news24/rss/world',
    'https://nation.africa/service/rss/africa/1068-1068-view-asFeed-134542z-index.xml',
    'https://mg.co.za/feed/',

    // --- RUSSIA / UKRAINE ---
    'https://tass.com/rss/v2.xml',
    'https://www.themoscowtimes.com/rss/news',
    'https://www.rt.com/rss/news/',
    'https://www.rferl.org/api/zmoiil-vomx-tpeykmp',
    'https://meduza.io/rss/en/all',
    'https://rssexport.rbc.ru/rbcnews/news/20/full.rss',
    'https://kyivindependent.com/news-archive/rss',

    // --- ASIA / PACIFIC ---
    'https://www.scmp.com/rss/3/feed',

    // --- AUSTRALIA ---
    'https://www.abc.net.au/news/feed/51120/rss.xml',
    'https://www.smh.com.au/rss/world.xml',
    'https://www.news.com.au/content-feeds/latest-news-world/',
    'https://www.theguardian.com/au/rss',
    'https://www.theaustralian.com.au/feeds/latest-news/',
    'https://www.perthnow.com.au/news/world/feed',

    // --- SPECIALIZED ---
    'https://www.middleeasteye.net/rss',
    'https://www.defensenews.com/arc/outboundfeeds/rss/',
    'https://www.crisisgroup.org/rss.xml',
    'https://peacekeeping.un.org/en/rss.xml',
    'https://www.navalnews.com/feed/',
];

const parser = new RSSParser();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function analyzeWithGemini(title, description) {
    const prompt = `Analyze this news for conflict data. JSON only. Fields: latitude(num), longitude(num), location_name(str), category(Armed Conflict|Protest|Political Unrest|Other), severity(1-5), summary(str). RULES: 1. If location is a country/region, use the geographic center or capital coordinates. 2. NEVER return null for latitude/longitude. 3. Return a SINGLE JSON object, not an array. Input: Title: ${title} Desc: ${description}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

    let retries = 0;
    while (retries < 3) {
        try {
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
            if (e.response && e.response.status === 429) {
                retries++;
                const waitTime = retries * 5000; // 5s, 10s, 15s
                console.warn(`   ⏳ Rate Limit Hit (429). Retrying in ${waitTime / 1000}s... (Attempt ${retries}/3)`);
                await delay(waitTime);
            } else {
                console.error("Gemini/Parse Error:", e.message);
                return null;
            }
        }
    }
    return null;
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

                    // Rate limit: 5s delay to be safe
                    await delay(5000);
                }
            }
        } catch (e) {
            console.error(`Feed Error ${url}:`, e.message);
        }
    }

    console.log(`\n\n🎉 DONE! Inserted ${totalInserted} new conflicts.`);
}

run();
