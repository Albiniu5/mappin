const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log("Checking latest DB entries...");

    // 1. Get total count
    const { count, error: countErr } = await supabase
        .from('conflicts')
        .select('*', { count: 'exact', head: true });

    if (countErr) console.error("Count Error:", countErr);
    else console.log(`Total Conflicts in DB: ${count}`);

    // 2. Get 5 most recently created
    const { data, error } = await supabase
        .from('conflicts')
        .select('id, title, created_at, published_at, source_url')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Fetch Error:", error);
    } else {
        console.log("\nTop 5 Most Recently CREATED (Ingested):");
        data.forEach(d => {
            console.log(`[Created: ${new Date(d.created_at).toLocaleString()}] ${d.title.substring(0, 50)}...`);
            console.log(`   Published: ${d.published_at} (${new Date(d.published_at).toLocaleDateString()})`);
            console.log(`   Source: ${d.source_url}`);
        });
    }
}

check();
