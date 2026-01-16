
import { NextResponse } from 'next/server';
import { fetchRSS } from '@/lib/rss';

// Helper to delay for rate limits (if needed)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        // Specialized & Regional
        'https://iswresearch.org/feeds/posts/default', // Institute for the Study of War
        'https://kyivindependent.com/news-archive/rss', // Ukraine Specific
        'https://www.scmp.com/rss/3/feed', // South China Morning Post (Asia)
        'https://peacekeeping.un.org/en/rss.xml', // UN Peacekeeping
        'https://www.navalnews.com/feed/', // Naval News
    ];

    let totalProcessed = 0;
    let totalErrors = 0;
    const MAX_ITEMS_PER_FEED = 5; // Reduced for speed, n8n handles deduplication

    try {
        const allReports = [];

        console.log(`[Ingest] Starting RSS fetch cycle...`);

        for (const url of RSS_URLS) {
            try {
                console.log(`[Ingest] Fetching ${url}...`);
                const items = await fetchRSS(url);

                // Format for n8n
                const reports = items.slice(0, MAX_ITEMS_PER_FEED).map(item => ({
                    title: item.title,
                    body: item.description,
                    url: item.link,
                    date: new Date(item.pubDate).toISOString(),
                    // Optional: Hint primary country if available in title?
                    // n8n AI will handle this.
                }));

                allReports.push(...reports);
                await delay(500); // Be nice to RSS servers

            } catch (e: any) {
                console.error(`[Ingest] Failed to fetch ${url}:`, e.message);
                totalErrors++;
            }
        }

        console.log(`[Ingest] Collected ${allReports.length} reports. Forwarding to n8n...`);

        if (allReports.length > 0) {
            // Forward to n8n Webhook
            const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/ingest-ai';

            const response = await fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: allReports })
            });

            if (!response.ok) {
                throw new Error(`n8n responded with ${response.status}`);
            }

            console.log('[Ingest] Success! n8n accepted the payload.');
            totalProcessed = allReports.length;
        }

        return NextResponse.json({
            success: true,
            processed: totalProcessed,
            errors: totalErrors,
            message: "RSS Ingestion Triggered Successfully"
        });

    } catch (error: any) {
        console.error('[Ingest] Critical Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
