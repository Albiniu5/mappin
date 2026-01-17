
import { NextResponse } from 'next/server';
import { fetchRSS } from '@/lib/rss';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper to delay for rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Definition of Alien Feeds
const ALIEN_FEEDS = [
    'https://www.theufochronicles.com/feeds/posts/default',
    'https://latest-ufo-sightings.net/feed/',
    'https://ufosightingshotspot.blogspot.com/feeds/posts/default',
    'https://theblackvault.com/casefiles/feed/',
    'https://anomalien.com/feed',
    'https://www.phantomsandmonsters.com/feeds/posts/default'
];

export async function GET() {
    let totalProcessed = 0;
    let totalErrors = 0;

    try {
        console.log('[Alien Ingest] Starting UFO intake...');

        // Randomly pick 2 feeds to process per run to avoid timeouts/rate limits
        const shuffled = [...ALIEN_FEEDS].sort(() => 0.5 - Math.random());
        const selectedFeeds = shuffled.slice(0, 2);

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        for (const url of selectedFeeds) {
            try {
                console.log(`[Alien Ingest] Fetching ${url}...`);
                const items = await fetchRSS(url);

                // Process top 2 items from each feed
                const recentItems = items.slice(0, 2);

                for (const item of recentItems) {
                    // Check if exists
                    const { data: existing } = await supabase
                        .from('conflicts')
                        .select('id')
                        .eq('source_url', item.link)
                        .single();

                    if (existing) {
                        console.log(`[Alien Ingest] Skipping duplicate: ${item.title}`);
                        continue;
                    }

                    console.log(`[Alien Ingest] Analyzing: ${item.title}`);

                    // GEMINI ANALYSIS
                    const prompt = `
                    You are a specialized UFO Investigator and Data Analyst. 
                    Analyze the following UFO/Paranormal report and extract structured data.
                    
                    Title: ${item.title}
                    Description: ${item.description?.substring(0, 1000)}...
                    Link: ${item.link}
                    Date: ${item.pubDate}

                    RETURN NULL if this is clearly just a movie review, general news, or irrelevant.

                    Otherwise, return valid JSON with this schema:
                    {
                        "latitude": number (best guess decimal coordinates, default 0 if unknown),
                        "longitude": number (best guess decimal coordinates, default 0 if unknown),
                        "location_name": string (City, Country or Region),
                        "summary": string (Concise 2-sentence summary of the sighting),
                        "alien_specific_type": "Sighting" | "Abduction" | "Crop Circle" | "Cattle Mutilation" | "Military Encounter" | "Telepathic Contact" | "Unknown",
                        "hynek_scale": "CE-1" | "CE-2" | "CE-3" | "CE-4" | "DD" | "NL" | "N/A",
                        "credibility_score": number (0-100, based on detail/witnesses),
                        "witness_type": "Civilian" | "Pilot" | "Military" | "Police" | "Unknown",
                        "evidence_type": "Visual" | "Radar" | "Video" | "Multi-sensor" | "Anecdotal",
                        "skeptic_explanation": string (Aggressive debunking explanation),
                        "believer_explanation": string (Anomalous/Extraterrestrial interpretation),
                        "speculative_analysis": string[] (List of 3 possibilities),
                        "pattern_match": string (Invent a plausible sounding pattern match e.g. "Similar triangular craft reported in region 2 weeks ago"),
                        "severity": number (1-5, 5 being Close Encounter/Abduction, 1 being Distant Light)
                    }
                    `;

                    try {
                        const result = await model.generateContent(prompt);
                        const response = await result.response;
                        const text = response.text();

                        // Extract JSON
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (!jsonMatch) {
                            console.log('[Alien Ingest] Failed to parse JSON from AI');
                            continue;
                        }

                        const analysis = JSON.parse(jsonMatch[0]);

                        if (!analysis.latitude && !analysis.longitude) {
                            // Fallback for location if AI fails? Or just skip map placement.
                            // We'll keep it 0,0 and maybe handle it in UI or rely on clustering "Unknown"
                            console.log('[Alien Ingest] No location found, defaulting to 0,0');
                        }

                        // Prepare for DB
                        const record = {
                            title: item.title,
                            description: analysis.summary,
                            source_url: item.link,
                            published_at: new Date(item.pubDate).toISOString(),
                            latitude: analysis.latitude || 0,
                            longitude: analysis.longitude || 0,
                            location_name: analysis.location_name || 'Unknown Location',
                            category: 'Alien', // HARDCODED CATEGORY
                            severity: analysis.severity || 1,
                            created_at: new Date().toISOString(),
                            // STORE THE RICH DATA IN RELATED_REPORTS
                            related_reports: analysis,
                            narrative_analysis: analysis.believer_explanation // Store primary narrative here
                        };

                        // DEDUPLICATION 2 (Double Check)
                        const { data: doubleCheck } = await supabase
                            .from('conflicts')
                            .select('id')
                            .eq('title', item.title)
                            .single();

                        if (doubleCheck) {
                            console.log(`[Alien Ingest] Duplicate title found, skipping.`);
                            continue;
                        }

                        const { error: insertError } = await supabase
                            .from('conflicts')
                            .insert(record as any); // Cast as any to bypass strict typing for now

                        if (insertError) {
                            console.error('[Alien Ingest] DB Insert Error:', insertError);
                            totalErrors++;
                        } else {
                            totalProcessed++;
                            console.log(`[Alien Ingest] Ingested: ${item.title} as ${analysis.alien_specific_type}`);
                        }

                        await delay(2000); // Rate limit kindness

                    } catch (aiError) {
                        console.error('[Alien Ingest] AI Processing Error:', aiError);
                        totalErrors++;
                    }
                }
            } catch (feedError) {
                console.error(`[Alien Ingest] Feed Error ${url}:`, feedError);
                totalErrors++;
            }
        }

        return NextResponse.json({
            success: true,
            processed: totalProcessed,
            errors: totalErrors,
            message: "Alien Ingestion Cycle Complete"
        });

    } catch (error: any) {
        console.error('[Alien Ingest] Critical Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
