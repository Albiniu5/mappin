import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { fallbackExtraction } from '../route';

// ReliefWeb API URL
const BASE_URL = 'https://api.reliefweb.int/v1/reports';

export async function GET() {
    try {
        console.log('Starting historical data backfill...');

        // Calculate date 5 years ago
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        const dateStr = fiveYearsAgo.toISOString();

        // Build query params
        // Filter: 
        // - Date > 5 years ago
        // - Content contains "conflict" or "war" or "attack"
        const params = new URLSearchParams({
            'appname': 'mappin-app',
            'profile': 'list',
            'preset': 'latest',
            'limit': '1000', // Fetch max allowed items for deep history
            'filter[operator]': 'AND',
            'filter[conditions][0][field]': 'date.created',
            'filter[conditions][0][value]': dateStr,
            'filter[conditions][0][operator]': '>=',
            'filter[conditions][1][field]': 'body', // Search body for keywords
            'filter[conditions][1][value]': 'conflict OR war OR attack OR military OR violence',
            // 'sort[]': 'date.created:desc' // Default is desc
        });

        const response = await fetch(`${BASE_URL}?${params.toString()}`);
        const data = await response.json();

        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Invalid response from ReliefWeb API');
        }

        console.log(`Fetched ${data.count} potential reports from ReliefWeb`);

        let processed = 0;
        let errors = 0;
        let inserted = 0;

        for (const report of data.data) {
            // ReliefWeb list endpoint gives truncated info. 
            // We usually need to fetch individual item for full body, 
            // but for mapping, the title + body-snippet might be enough if mapped correctly.
            // Actually, 'list' profile with 'body' field might populate it? 
            // Let's check field filtering. 
            // By default 'list' returns id, title, date, status. 
            // We want fields[include][]=title,body,url,date,primary_country

            // Re-fetch logic or optimize: 
            // Better to add fields to the initial query.
        }

        const BATCH_SIZE = 1000;
        const MAX_LOOPS = 3; // Fetch 3000 items total

        for (let i = 0; i < MAX_LOOPS; i++) {
            const offset = i * BATCH_SIZE;
            console.log(`fetching batch ${i + 1}/${MAX_LOOPS} (offset: ${offset})...`);

            const fieldsParams = new URLSearchParams([
                ['appname', 'mappin-app'],
                ['profile', 'list'],
                ['preset', 'latest'],
                ['limit', BATCH_SIZE.toString()],
                ['offset', offset.toString()],
                ['filter[operator]', 'AND'],
                ['filter[conditions][0][field]', 'date.created'],
                ['filter[conditions][0][value]', dateStr],
                ['filter[conditions][0][operator]', '>='],
                ['filter[conditions][1][field]', 'title'],
                ['filter[conditions][1][value]', 'conflict OR war OR attack OR military OR violence'],
                ['fields[include][]', 'title'],
                ['fields[include][]', 'body'],
                ['fields[include][]', 'url'],
                ['fields[include][]', 'date'],
                ['fields[include][]', 'primary_country']
            ]);

            const url = `${BASE_URL}?${fieldsParams.toString().replace(/%5B%5D=/g, '[]=')}`;
            const resWithFields = await fetch(url);
            const richData = await resWithFields.json();

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

                if (!extracted && item.fields.primary_country) {
                    const countryName = item.fields.primary_country.name;
                    extracted = fallbackExtraction(title + " " + countryName, description);
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
