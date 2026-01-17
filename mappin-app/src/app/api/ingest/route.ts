
import { NextResponse } from 'next/server';
import { fetchRSS } from '@/lib/rss';

// Helper to delay for rate limits (if needed)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
    const RSS_URLS = [
        // News Agencies
        // --- GLOBAL NEWS AGENCIES ---
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://www.aljazeera.com/xml/rss/all.xml',
        'https://www.france24.com/en/rss',
        'https://feedx.net/rss/ap.xml', // Associated Press
        // 'https://www.reuters.com/rssfeed/worldNews', // Often fails

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
        'https://latinvex.com/feed', // Validated manually often
        'https://elcomercio.pe/arc/outboundfeeds/rss/?outputType=xml', // Standard ARC format for El Comercio
        'https://www1.folha.uol.com.br/emcimadahora/rss091.xml',
        'https://www.latercera.com/arc/outboundfeeds/rss/?outputType=xml', // Likely ARC based
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
        'https://www.news24.com/news24/rss/world', // Adjusted to World or Top
        'https://nation.africa/service/rss/africa/1068-1068-view-asFeed-134542z-index.xml', // Likely needs verify, reverting to generic if fails
        'https://mg.co.za/feed/', // Mail & Guardian

        // --- RUSSIA / UKRAINE ---
        'https://tass.com/rss/v2.xml',
        'https://www.themoscowtimes.com/rss/news',
        'https://www.rt.com/rss/news/',
        'https://www.rferl.org/api/zmoiil-vomx-tpeykmp',
        'https://meduza.io/rss/en/all', // English version usually preferred 
        'https://rssexport.rbc.ru/rbcnews/news/20/full.rss', // RBC Proper URL
        'https://kyivindependent.com/news-archive/rss',

        // --- ASIA / PACIFIC ---
        'https://www.scmp.com/rss/3/feed',

        // --- AUSTRALIA ---
        'https://www.abc.net.au/news/feed/51120/rss.xml', // ABC News Just In
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

    let totalProcessed = 0;
    let totalErrors = 0;
    const MAX_ITEMS_PER_FEED = 3;
    const BATCH_SIZE = 5; // Only process 5 feeds per run to avoid timeouts

    try {
        console.log(`[Ingest] Starting RSS fetch cycle (Random Batch of ${BATCH_SIZE})...`);
        // Use Env Var, fallback to localhost only if missing
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/ingest-live';

        // Shuffle and pick subset
        const shuffled = [...RSS_URLS].sort(() => 0.5 - Math.random());
        const selectedFeeds = shuffled.slice(0, BATCH_SIZE);

        console.log(`[Ingest] Selected feeds: ${selectedFeeds.join(', ')}`);

        for (const url of selectedFeeds) {
            try {
                console.log(`[Ingest] Fetching ${url}...`);
                const items = await fetchRSS(url);

                if (items.length > 0) {
                    // Format for n8n
                    const reports = items.slice(0, MAX_ITEMS_PER_FEED).map(item => ({
                        title: item.title,
                        description: item.description,
                        url: item.link,
                        date: item.pubDate || new Date().toISOString()
                    }));

                    if (reports.length > 0) {
                        console.log(`[Ingest] Sending ${reports.length} items to n8n from ${url}...`);
                        const response = await fetch(n8nWebhookUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ items: reports })
                        });

                        if (!response.ok) {
                            console.error(`[Ingest] FAILED to send to n8n: ${response.status} ${response.statusText}`);
                        } else {
                            totalProcessed += reports.length;
                        }
                    }

                    // Small delay to be gentle, but shorter since we only have 5 feeds
                    await delay(1000);
                }

            } catch (e: any) {
                console.error(`[Ingest] Failed to fetch/send ${url}:`, e.message);
                totalErrors++;
            }
        }

        console.log(`[Ingest] Batch complete. Processed ${totalProcessed} items.`);

        return NextResponse.json({
            success: true,
            processed: totalProcessed,
            errors: totalErrors,
            feedsProcessed: selectedFeeds.length,
            message: "RSS Ingestion Batch Triggered Successfully"
        });

    } catch (error: any) {
        console.error('[Ingest] Critical Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
