
import { NextResponse } from 'next/server';
import { fetchRSS } from '@/lib/rss';
import { extractConflictData } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';


// Helper to delay for rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Comprehensive fallback extraction when AI fails
function fallbackExtraction(title: string, description: string) {
    const text = (title + " " + description).toLowerCase();

    // Expanded location database with major world regions and conflict zones
    const locations: Record<string, { lat: number, lon: number, name: string }> = {
        // Middle East
        "gaza": { lat: 31.5, lon: 34.46, name: "Gaza Strip" },
        "israel": { lat: 31.76, lon: 35.21, name: "Jerusalem, Israel" },
        "palestine": { lat: 31.9, lon: 35.2, name: "Palestine" },
        "lebanon": { lat: 33.89, lon: 35.48, name: "Beirut, Lebanon" },
        "syria": { lat: 33.51, lon: 36.29, name: "Damascus, Syria" },
        "iraq": { lat: 33.34, lon: 44.39, name: "Baghdad, Iraq" },
        "iran": { lat: 35.69, lon: 51.42, name: "Tehran, Iran" },
        "yemen": { lat: 15.36, lon: 44.21, name: "Sanaa, Yemen" },
        "saudi": { lat: 24.63, lon: 46.72, name: "Riyadh, Saudi Arabia" },
        "turkey": { lat: 39.93, lon: 32.85, name: "Ankara, Turkey" },
        "qatar": { lat: 25.35, lon: 51.18, name: "Doha, Qatar" },
        "jordan": { lat: 31.95, lon: 35.93, name: "Amman, Jordan" },

        // Europe
        "ukraine": { lat: 50.45, lon: 30.52, name: "Kyiv, Ukraine" },
        "russia": { lat: 55.75, lon: 37.61, name: "Moscow, Russia" },
        "poland": { lat: 52.23, lon: 21.01, name: "Warsaw, Poland" },
        "georgia": { lat: 41.72, lon: 44.79, name: "Tbilisi, Georgia" },
        "serbia": { lat: 44.82, lon: 20.46, name: "Belgrade, Serbia" },
        "kosovo": { lat: 42.67, lon: 21.17, name: "Pristina, Kosovo" },

        // Africa
        "sudan": { lat: 15.59, lon: 32.53, name: "Khartoum, Sudan" },
        "ethiopia": { lat: 9.03, lon: 38.74, name: "Addis Ababa, Ethiopia" },
        "somalia": { lat: 2.04, lon: 45.34, name: "Mogadishu, Somalia" },
        "congo": { lat: -4.32, lon: 15.31, name: "Kinshasa, DRC" },
        "nigeria": { lat: 9.07, lon: 7.49, name: "Abuja, Nigeria" },
        "mali": { lat: 12.65, lon: -7.99, name: "Bamako, Mali" },
        "libya": { lat: 32.89, lon: 13.18, name: "Tripoli, Libya" },
        "egypt": { lat: 30.04, lon: 31.24, name: "Cairo, Egypt" },
        "south sudan": { lat: 4.85, lon: 31.60, name: "Juba, South Sudan" },

        // Asia
        "afghanistan": { lat: 34.53, lon: 69.17, name: "Kabul, Afghanistan" },
        "pakistan": { lat: 33.72, lon: 73.04, name: "Islamabad, Pakistan" },
        "india": { lat: 28.61, lon: 77.21, name: "New Delhi, India" },
        "kashmir": { lat: 34.08, lon: 74.82, name: "Srinagar, Kashmir" },
        "myanmar": { lat: 19.76, lon: 96.11, name: "Yangon, Myanmar" },
        "burma": { lat: 19.76, lon: 96.11, name: "Yangon, Myanmar" },
        "china": { lat: 39.90, lon: 116.41, name: "Beijing, China" },
        "taiwan": { lat: 25.03, lon: 121.57, name: "Taipei, Taiwan" },
        "tibet": { lat: 29.65, lon: 91.13, name: "Lhasa, Tibet" },
        "korea": { lat: 37.57, lon: 126.98, name: "Seoul, South Korea" },
        "philippines": { lat: 14.60, lon: 120.98, name: "Manila, Philippines" },

        // Americas
        "venezuela": { lat: 10.48, lon: -66.90, name: "Caracas, Venezuela" },
        "colombia": { lat: 4.71, lon: -74.07, name: "Bogotá, Colombia" },
        "haiti": { lat: 18.59, lon: -72.31, name: "Port-au-Prince, Haiti" },
        "mexico": { lat: 19.43, lon: -99.13, name: "Mexico City, Mexico" },
        "brazil": { lat: -15.79, lon: -47.89, name: "Brasília, Brazil" },
    };

    let foundLoc = { lat: 0, lon: 0, name: "Unknown" };
    for (const [key, val] of Object.entries(locations)) {
        if (text.includes(key)) {
            foundLoc = val;
            break;
        }
    }

    // If no specific location found but text mentions general conflict keywords, mark as global event
    if (foundLoc.name === "Unknown") {
        const hasConflictKeywords = /war|conflict|attack|strike|bomb|military|troops|casualties|violence|protest|riot|unrest/i.test(text);
        if (hasConflictKeywords) {
            foundLoc = { lat: 20, lon: 0, name: "Global Event" };
        } else {
            // Skip non-conflict related news
            return null;
        }
    }

    // Categorize based on keywords
    let category = "Other";
    if (/kill|dead|death|attack|missile|bomb|strike|airstrike|war|troops|military|armed|shoot|explosion/i.test(text)) {
        category = "Armed Conflict";
    } else if (/protest|demonstrat|march|rally|riot|unrest|uprising/i.test(text)) {
        category = "Protest";
    } else if (/politic|election|vote|government|coup|sanction|diplomat/i.test(text)) {
        category = "Political Unrest";
    }

    // Estimate severity
    let severity = 2;
    if (/war|massacre|genocide|catastrophe|crisis/i.test(text)) severity = 5;
    else if (/kill|dead|death|casualties/i.test(text)) severity = 4;
    else if (/attack|strike|violent/i.test(text)) severity = 3;

    return {
        latitude: foundLoc.lat,
        longitude: foundLoc.lon,
        location_name: foundLoc.name,
        category: category,
        severity: severity,
        summary: description.slice(0, 200) + "..."
    };
}


export async function GET() {
    const RSS_URLS = [
        // News Agencies
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://www.aljazeera.com/xml/rss/all.xml',
        'https://www.reuters.com/rssfeed/worldNews',
        'https://rsshub.app/apnews/topics/apf-topnews',
        'https://www.france24.com/en/rss',
        // International News
        'https://rss.cnn.com/rss/cnn_world.rss',
        'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
        'https://feeds.washingtonpost.com/rss/world',
        'https://www.theguardian.com/world/rss',
        'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
        // Regional/Conflict-Focused
        'https://www.middleeasteye.net/rss',
        'https://www.defensenews.com/arc/outboundfeeds/rss/',
        'https://www.crisisgroup.org/rss.xml',
    ];

    let totalProcessed = 0;
    let totalErrors = 0;
    const MAX_ITEMS_PER_FEED = 10; // Process up to 10 items per feed

    try {
        for (const url of RSS_URLS) {
            console.log(`Fetching ${url}...`);
            const items = await fetchRSS(url);
            let feedProcessed = 0;

            for (const item of items) {
                if (feedProcessed >= MAX_ITEMS_PER_FEED) break;

                // Check if exists
                const { data: existing } = await supabase
                    .from('conflicts')
                    .select('id')
                    .eq('source_url', item.link)
                    .single();

                if (existing) continue;

                // TEMPORARILY USING FALLBACK ONLY FOR SPEED
                // const aiData = await extractConflictData(item.title, item.description);
                const aiData = fallbackExtraction(item.title, item.description);

                if (aiData) {
                    const conflictData: Database['public']['Tables']['conflicts']['Insert'] = {
                        title: item.title,
                        description: aiData.summary,
                        source_url: item.link,
                        published_at: new Date(item.pubDate).toISOString(),
                        latitude: aiData.latitude,
                        longitude: aiData.longitude,
                        location_name: aiData.location_name,
                        category: aiData.category,
                        severity: aiData.severity,
                    };

                    // @ts-ignore - Supabase type generation issue, works at runtime
                    const { error } = await supabase.from('conflicts').insert(conflictData);

                    if (error) {
                        console.error('DB Insert Error:', error);
                        totalErrors++;
                    } else {
                        console.log(`Inserted: ${item.title}`);
                        totalProcessed++;
                        feedProcessed++;
                    }
                } else {
                    // Skip non-conflict news
                    console.log(`Skipped (not conflict-related): ${item.title.substring(0, 50)}...`);
                }

                // No delay needed for fallback
                // await delay(2000);
            }
        }

        return NextResponse.json({
            success: true,
            processed: totalProcessed,
            errors: totalErrors
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
