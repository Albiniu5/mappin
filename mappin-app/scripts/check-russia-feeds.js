const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRussia() {
    console.log("Searching DB for Russian feed logs...");

    const domains = ['tass.com', 'rt.com', 'themoscowtimes.com', 'rferl.org'];

    for (const domain of domains) {
        const { data, error, count } = await supabase
            .from('conflicts')
            .select('id, title, published_at, created_at, category, latitude, longitude', { count: 'exact', head: false })
            .ilike('source_url', `%${domain}%`)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error(`Error checking ${domain}:`, error.message);
        } else {
            console.log(`\n--- ${domain} ---`);
            console.log(`Total Count: ${count}`);
            if (data.length === 0) {
                console.log("No entries found.");
            } else {
                data.forEach(d => {
                    console.log(`\nTitle: ${d.title}`);
                    console.log(`   Created: ${new Date(d.created_at).toLocaleString()}`);
                    console.log(`   Published: ${new Date(d.published_at).toLocaleDateString()}`);
                    console.log(`   Location: ${d.latitude}, ${d.longitude}`);
                    console.log(`   Category: ${d.category}`);
                });
            }
        }
    }
}

checkRussia();
