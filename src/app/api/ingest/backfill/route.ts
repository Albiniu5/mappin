import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { fallbackExtraction } from '@/lib/extraction';
import { countries } from '@/lib/countries';

// ReliefWeb API URL
const BASE_URL = 'https://api.reliefweb.int/v1/reports';

export async function GET() {
    try {
        console.log('Starting historical data backfill...');

        // Calculate date 5 years ago
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

        // ReliefWeb API rejects milliseconds. Format: YYYY-MM-DDTHH:MM:SS+00:00
        const dateStr = fiveYearsAgo.toISOString().split('.')[0] + '+00:00';

        // Skip initial check to avoid extra requests/blocks. 
        // We will detect errors in the main loop consistently.
        console.log('Starting batch fetch...');

        let processed = 0;
        let errors = 0;
        let inserted = 0;



        const BATCH_SIZE = 1000;
        const MAX_LOOPS = 10; // Fetch 10,000 items total (API Max)

        for (let i = 0; i < MAX_LOOPS; i++) {
            const offset = i * BATCH_SIZE;
            console.log(`fetching batch ${i + 1}/${MAX_LOOPS} (offset: ${offset})...`);

            // ReliefWeb API rejects milliseconds. Format: YYYY-MM-DDTHH:MM:SS+00:00
            const dateStr = fiveYearsAgo.toISOString().split('.')[0] + '+00:00';

            const params = new URLSearchParams([
                ['appname', process.env.RELIEFWEB_APPNAME || 'rwint-user-0'], // Configurable appname
                ['profile', 'list'],
                ['preset', 'latest'],
                ['limit', BATCH_SIZE.toString()],
                ['offset', offset.toString()],
                // Use query[value] for full-text search (title + body) instead of complex filter
                ['query[value]', 'conflict OR war OR attack OR military OR violence OR protest OR unrest OR crisis OR shelling'],
                ['filter[field]', 'date.created'],
                ['filter[value][from]', dateStr], // Correct range syntax
                ['fields[include][]', 'title'],
                ['fields[include][]', 'body'],
                ['fields[include][]', 'url'],
                ['fields[include][]', 'date'],
                ['fields[include][]', 'primary_country']
            ]);

            const url = `${BASE_URL}?${params.toString().replace(/%5B%5D=/g, '[]=')}`;
            const resWithFields = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://reliefweb.int/',
                    'Origin': 'https://reliefweb.int'
                }
            });
            const richData = await resWithFields.json();

            // Check for API Error
            if (richData.error) {
                console.error('ReliefWeb Loop Error:', JSON.stringify(richData, null, 2));
                throw new Error(`ReliefWeb Loop Error: ${richData.error.message}`);
            }

            if (!richData.data || richData.data.length === 0) {
                console.log("No more data found, stopping.");
                break;
            }

            for (const item of richData.data) {
                const title = item.fields.title;
                const body = item.fields.body || "";
                const description = body.substring(0, 500);
                const sourceUrl = item.fields.url;
                const date = item.fields.date.created;

                // Check duplication
                const { data: existing } = await supabase
                    .from('conflicts')
                    .select('id')
                    .eq('source_url', sourceUrl)
                    .single();

                if (existing) continue;

                let extracted = fallbackExtraction(title, description);

                // Enhancement: Direct lookup in country database
                if (!extracted && item.fields.primary_country) {
                    const countryName = item.fields.primary_country.name.toLowerCase();

                    // Try direct match
                    if (countries[countryName]) {
                        extracted = {
                            latitude: countries[countryName].lat,
                            longitude: countries[countryName].lon,
                            location_name: countries[countryName].name,
                            category: "Armed Conflict", // Default for backfill
                            severity: 3, // Default
                            summary: description
                        };
                    } else {
                        // Try fallback with text search
                        extracted = fallbackExtraction(title + " " + item.fields.primary_country.name, description);
                    }
                }

                if (extracted) {
                    const insertData: Database['public']['Tables']['conflicts']['Insert'] = {
                        title: title,
                        description: extracted.summary,
                        source_url: sourceUrl,
                        published_at: date,
                        latitude: extracted.latitude,
                        longitude: extracted.longitude,
                        location_name: extracted.location_name,
                        category: extracted.category,
                        severity: extracted.severity
                    };

                    // @ts-ignore
                    const { error } = await supabase.from('conflicts').insert(insertData);
                    if (error) {
                        console.error("Insert error", error);
                        errors++;
                    } else {
                        inserted++;
                    }
                }
                processed++;
            }
        }

        return NextResponse.json({
            success: true,
            processed,
            inserted,
            errors
        });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
