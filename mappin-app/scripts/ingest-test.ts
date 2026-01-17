
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock supabase client since we can't easily import the app one directly without ts-node setup complications usually
// Actually, we can try using tsx to run it which usually handles imports well.
// But valid imports might be an issue if we rely on '@/lib/...' aliases without configuring tsconfig paths for tsx.
// Let's copy the necessary logic into this script to be self-contained and robust for debugging.

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { XMLParser } from 'fast-xml-parser';

// --- CONFIG ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY) {
    console.error("Missing environment variables!");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// --- HELPERS ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchRSS(url: string) {
    try {
        const response = await fetch(url);
        const xml = await response.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const result = parser.parse(xml);
        const channel = result.rss?.channel || result.feed;
        const items = channel.item || channel.entry || [];
        return Array.isArray(items) ? items : [items];
    } catch (e) {
        console.error("RSS Error:", e);
        return [];
    }
}

async function extractConflictData(title: string, description: string) {
    const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"];

    for (const modelName of models) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const prompt = `
          Analyze the following news snippet about a potential conflict or event:
          Title: "${title}"
          Description: "${description}"
    
          Extract the following information in strict JSON format:
          1. latitude: Best estimated latitude of the event location (number).
          2. longitude: Best estimated longitude of the event location (number).
          3. location_name: Name of the city/region (string).
          4. category: One of ['Armed Conflict', 'Protest', 'Political Unrest', 'Other'].
          5. severity: A rating from 1 (minor) to 5 (extreme war/catastrophe).
          6. summary: A concise 1-sentence summary of what happened.
    
          output only the JSON object. Do not include markdown formatting.
        `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();
            // Cleanup
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(text);
        } catch (error: any) {
            console.warn(`Model ${modelName} failed:`, error.message);
            if (error.message.includes("429")) {
                console.log("Rate limit hit. Waiting 60s before retry...");
                await delay(60000);
                // Retry once recursively or just let loop continue?
                // The loop iterates models. If only 1 model, it finishes.
                // Let's add simple retry logic here or assume user runs script again.
                // Better: actually retry this model.
                return await extractConflictData(title, description);
            }
        }
    }
    return null;
}

// --- FALLBACK ---
function fallbackExtraction(title: string, description: string) {
    const text = (title + " " + description).toLowerCase();

    const locations: Record<string, { lat: number, lon: number, name: string }> = {
        "ukraine": { lat: 50.45, lon: 30.52, name: "Kyiv, Ukraine" },
        "russia": { lat: 55.75, lon: 37.61, name: "Moscow, Russia" },
        "gaza": { lat: 31.5, lon: 34.46, name: "Gaza Strip" },
        "israel": { lat: 31.04, lon: 34.85, name: "Israel" },
        "qatar": { lat: 25.35, lon: 51.18, name: "Qatar" },
        "iran": { lat: 32.42, lon: 53.68, name: "Iran" },
        "lebanon": { lat: 33.85, lon: 35.86, name: "Lebanon" },
        "sudan": { lat: 12.86, lon: 30.21, name: "Sudan" },
    };

    let foundLoc = { lat: 0, lon: 0, name: "Unknown" };
    for (const [key, val] of Object.entries(locations)) {
        if (text.includes(key)) {
            foundLoc = val;
            break;
        }
    }

    // Default if no location found but we want to show it exists
    if (foundLoc.name === "Unknown") {
        foundLoc = { lat: 20, lon: 0, name: "Global" }; // Middle of nowhere
    }

    let category = "Other";
    if (text.includes("kill") || text.includes("attack") || text.includes("missile") || text.includes("war")) category = "Armed Conflict";
    else if (text.includes("protest") || text.includes("march") || text.includes("demonstration")) category = "Protest";
    else if (text.includes("politic") || text.includes("vote") || text.includes("law")) category = "Political Unrest";

    return {
        latitude: foundLoc.lat,
        longitude: foundLoc.lon,
        location_name: foundLoc.name,
        category: category,
        severity: 3, // Default medium
        summary: description.slice(0, 150) + "..."
    };
}

// --- MAIN ---
async function main() {
    console.log("Starting debug ingestion...");

    // Check DB connection
    const { count, error: countError } = await supabase.from('conflicts').select('*', { count: 'exact', head: true });
    if (countError) {
        console.error("DB Connection Error:", countError);
        return;
    }
    console.log(`Current DB row count: ${count}`);

    // List Models
    try {
        // Not all SDK versions expose listModels cleanly, checking via curl might be safer but let's try strict model names first.
        // Actually, let's create a minimal list logic if possible, but the google-generative-ai package focuses on generating content.
        // The error message said: "Call ListModels to see the list of available models"
        // Let's rely on trying the one model we know exists: gemini-2.0-flash-exp (it gave 429, not 404).
        // If 2.0 exists, we should use it with a VERY long backoff.
    } catch (e) {
        console.error("List Models Error:", e);
    }

    const RSS_URLS = [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
    ];

    let processed = 0;
    const MAX = 3;

    for (const url of RSS_URLS) {
        console.log(`Fetching RSS: ${url}`);
        const items = await fetchRSS(url);
        console.log(`Found ${items.length} items.`);

        for (const item of items) {
            if (processed >= MAX) break;

            const title = item.title;
            const desc = item.description || item.summary || "";
            const link = item.link;

            console.log(`Processing: ${title}`);

            // Check existing
            const { data: existing } = await supabase.from('conflicts').select('id').eq('source_url', link).single();
            if (existing) {
                console.log("Skipping existing.");
                continue;
            }

            let data = null; // await extractConflictData(title, desc);

            // Fallback if AI fails (Rate Limit or 404)
            if (!data) {
                console.log("Using keyword fallback...");
                data = fallbackExtraction(title, desc);
            }

            if (data) {
                console.log("Extracted Data:", JSON.stringify(data));
                const { error } = await supabase.from('conflicts').insert({
                    title: title,
                    description: data.summary,
                    source_url: link,
                    published_at: new Date(item.pubDate || item.updated || new Date()).toISOString(),
                    latitude: data.latitude,
                    longitude: data.longitude,
                    location_name: data.location_name,
                    category: data.category,
                    severity: data.severity
                });

                if (error) console.error("Insert Error:", error);
                else {
                    console.log("Inserted successfully via Fallback/AI!");
                    processed++;
                }
            } else {
                console.error("Failed to extract data via AI or Fallback.");
            }

            console.log("Waiting 5s...");
            await delay(5000);
        }
    }
    console.log("Done.");
}

main();
