
import { NextResponse } from 'next/server';
import { fetchRSS } from '@/lib/rss';
import { extractConflictData } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

// Helper to delay for rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
    const RSS_URLS = [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://www.aljazeera.com/xml/rss/all.xml',
        // Add more conflict-focused feeds here
    ];

    let totalProcessed = 0;
    let totalErrors = 0;

    try {
        for (const url of RSS_URLS) {
            console.log(`Fetching ${url}...`);
            const items = await fetchRSS(url);

            for (const item of items) {
                // Check if exists
                const { data: existing } = await supabase
                    .from('conflicts')
                    .select('id')
                    .eq('source_url', item.link)
                    .single();

                if (existing) continue;

                // Process with AI
                const aiData = await extractConflictData(item.title, item.description);

                if (aiData) {
                    const conflictData: Database['public']['Tables']['conflicts']['Insert'] = {
                        title: item.title,
                        description: aiData.summary, // Use AI summary
                        source_url: item.link,
                        published_at: new Date(item.pubDate).toISOString(),
                        latitude: aiData.latitude,
                        longitude: aiData.longitude,
                        location_name: aiData.location_name,
                        category: aiData.category,
                        severity: aiData.severity,
                    };

                    const { error } = await supabase.from('conflicts').insert(conflictData);

                    if (error) {
                        console.error('DB Insert Error:', error);
                        totalErrors++;
                    } else {
                        console.log(`Inserted: ${item.title}`);
                        totalProcessed++;
                    }
                }

                // Rate limit protection for Gemini
                await delay(2000);
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
