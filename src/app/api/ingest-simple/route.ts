
import { NextResponse } from 'next/server';
import { fetchRSS } from '@/lib/rss';
import { supabase } from '@/lib/supabase';

// Simplified ingestion that bypasses n8n/AI entirely for testing
export async function GET() {
    try {
        console.log('[Simple Ingest] Fetching BBC News...');
        const items = await fetchRSS('https://feeds.bbci.co.uk/news/world/rss.xml');

        // Insert directly to Supabase with dummy coordinates
        const records = items.slice(0, 5).map((item, idx) => ({
            title: item.title,
            description: item.description || 'No description',
            source_url: item.link,
            published_at: new Date(item.pubDate).toISOString(),
            latitude: 51.5 + (idx * 0.1), // London area
            longitude: -0.1 + (idx * 0.1),
            location_name: 'Test Location',
            category: 'Other',
            severity: 3,
            created_at: new Date().toISOString()
        }));

        const { data, error } = await supabase
            .from('conflicts')
            .upsert(records, {
                onConflict: 'source_url',
                ignoreDuplicates: false
            });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            inserted: records.length,
            message: 'Simple ingestion complete (bypassed AI)'
        });

    } catch (error: any) {
        console.error('[Simple Ingest] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
