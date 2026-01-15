
import { NextResponse } from 'next/server';
import { fetchRSS } from '@/lib/rss';
import { extractConflictData } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';


import { fallbackExtraction } from '@/lib/extraction';

// Helper to delay for rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Removed local fallbackExtraction definition




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
