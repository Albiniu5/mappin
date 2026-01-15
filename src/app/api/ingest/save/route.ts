import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { fallbackExtraction } from '@/lib/extraction';
import { countries } from '@/lib/countries';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { reports } = body;

        if (!reports || !Array.isArray(reports)) {
            return NextResponse.json({ success: false, error: 'Invalid reports payload' }, { status: 400 });
        }

        console.log(`Received ${reports.length} reports to save...`);
        let inserted = 0;
        let errors = 0;

        for (const item of reports) {
            const title = item.fields?.title || item.title;
            const bodyText = item.fields?.body || item.body || "";
            const description = bodyText.substring(0, 500);
            const sourceUrl = item.fields?.url || item.url;
            const date = item.fields?.date?.created || item.date;

            if (!sourceUrl || !title || !date) continue; // Basic validation

            // Check duplication
            const { data: existing } = await supabase
                .from('conflicts')
                .select('id')
                .eq('source_url', sourceUrl)
                .single();

            if (existing) continue;

            let extracted = fallbackExtraction(title, description);

            // Enhancement: Direct lookup in country database
            const primaryCountry = item.fields?.primary_country || item.primary_country;
            if (!extracted && primaryCountry) {
                const countryName = primaryCountry.name.toLowerCase();

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
                    extracted = fallbackExtraction(title + " " + primaryCountry.name, description);
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
        }

        return NextResponse.json({
            success: true,
            processed: reports.length,
            inserted,
            errors
        });

    } catch (error: any) {
        console.error('Error in save route:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
