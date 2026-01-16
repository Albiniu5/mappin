import { countries } from '@/lib/countries';
import { ExtractedData } from '@/lib/ai';

// Comprehensive fallback extraction when AI fails
export function fallbackExtraction(title: string, description: string, countryHint?: string): ExtractedData | null {
    console.log("Ingest Filter v2.1 (Sabotage Fix) checking: " + title.substring(0, 20));
    const text = (title + " " + description).toLowerCase();

    // Expanded location database
    // We import the full list from countries.ts but keep the specific city overrides here
    const cityLocations: Record<string, { lat: number, lon: number, name: string }> = {
        // Middle East
        "gaza": { lat: 31.5, lon: 34.46, name: "Gaza Strip" },
        "ethiopia": { lat: 9.03, lon: 38.74, name: "Addis Ababa, Ethiopia" },
        "somalia": { lat: 2.04, lon: 45.34, name: "Mogadishu, Somalia" },
        "congo": { lat: -4.32, lon: 15.31, name: "Kinshasa, DRC" },
        "nigeria": { lat: 9.07, lon: 7.49, name: "Abuja, Nigeria" },
        "mali": { lat: 12.65, lon: -7.99, name: "Bamako, Mali" },
        "libya": { lat: 32.89, lon: 13.18, name: "Tripoli, Libya" },
        "egypt": { lat: 30.04, lon: 31.24, name: "Cairo, Egypt" },
        "south sudan": { lat: 4.85, lon: 31.60, name: "Juba, South Sudan" },

        // Asia
        "afghanistan": { lat: 34.53, lon: 69.17, name: "Kabul, Afghanistan" },
        "pakistan": { lat: 33.72, lon: 73.04, name: "Islamabad, Pakistan" },
        "india": { lat: 28.61, lon: 77.21, name: "New Delhi, India" },
        "kashmir": { lat: 34.08, lon: 74.82, name: "Srinagar, Kashmir" },
        "myanmar": { lat: 19.76, lon: 96.11, name: "Yangon, Myanmar" },
        "burma": { lat: 19.76, lon: 96.11, name: "Yangon, Myanmar" },
        "china": { lat: 39.90, lon: 116.41, name: "Beijing, China" },
        "taiwan": { lat: 25.03, lon: 121.57, name: "Taipei, Taiwan" },
        "tibet": { lat: 29.65, lon: 91.13, name: "Lhasa, Tibet" },
        "korea": { lat: 37.57, lon: 126.98, name: "Seoul, South Korea" },
        "philippines": { lat: 14.60, lon: 120.98, name: "Manila, Philippines" },

        // Americas
        "venezuela": { lat: 10.48, lon: -66.90, name: "Caracas, Venezuela" },
        "colombia": { lat: 4.71, lon: -74.07, name: "Bogotá, Colombia" },
        "haiti": { lat: 18.59, lon: -72.31, name: "Port-au-Prince, Haiti" },
        "mexico": { lat: 19.43, lon: -99.13, name: "Mexico City, Mexico" },
        "brazil": { lat: -15.79, lon: -47.89, name: "Brasília, Brazil" },
    };

    let foundLoc = { lat: 0, lon: 0, name: "Unknown" };


    // 0. Priority: Explicit Country Hint
    if (countryHint) {
        const hintLower = countryHint.toLowerCase();
        // @ts-ignore
        if (countries[hintLower]) {
            // @ts-ignore
            foundLoc = countries[hintLower];
        }
    }

    if (foundLoc.name === "Unknown") {
        for (const [key, val] of Object.entries(cityLocations)) {
            if (text.includes(key)) {
                foundLoc = val;
                break;
            }
        }
    }

    // If no city, check countries
    if (foundLoc.name === "Unknown") {
        for (const [key, val] of Object.entries(countries)) {
            // @ts-ignore
            if (text.includes(key)) {
                // @ts-ignore
                foundLoc = val;
                break;
            }
        }
    }

    // If no specific location found but text mentions general conflict keywords, mark as global event
    if (foundLoc.name === "Unknown") {
        const hasConflictKeywords = /war|conflict|attack|strike|bomb|military|troops|casualties|violence|protest|riot|unrest|sabotage|terrorism|security|defense|crisis|army|navy|air force|combat|fighting|shelling/i.test(text);
        if (hasConflictKeywords) {
            foundLoc = { lat: 20, lon: 0, name: "Global Event" };
        } else {
            // Skip non-conflict related news
            return null;
        }
    }

    // Categorize based on keywords
    let category: ExtractedData['category'] = "Other";
    if (/kill|dead|death|attack|missile|bomb|strike|airstrike|war|troops|military|armed|shoot|explosion/i.test(text)) {
        category = "Armed Conflict";
    } else if (/protest|demonstrat|march|rally|riot|unrest|uprising/i.test(text)) {
        category = "Protest";
    } else if (/politic|election|vote|government|coup|sanction|diplomat/i.test(text)) {
        category = "Political Unrest";
    }

    // Estimate severity
    let severity = 2;
    if (/war|massacre|genocide|catastrophe|crisis/i.test(text)) severity = 5;
    else if (/kill|dead|death|casualties/i.test(text)) severity = 4;
    else if (/attack|strike|violent/i.test(text)) severity = 3;

    return {
        latitude: foundLoc.lat,
        longitude: foundLoc.lon,
        location_name: foundLoc.name,
        category: category,
        severity: severity,
        summary: description.slice(0, 200) + "..."
    };
}
