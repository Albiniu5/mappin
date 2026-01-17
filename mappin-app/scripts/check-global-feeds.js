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

async function checkGlobal() {
    console.log("Checking DB for new global feed logs...\n");

    const domains = [
        'cbc.ca',              // Canada
        'folha.uol.com.br',    // Brazil
        'allafrica.com',       // Africa
        'abc.net.au',          // Australia
        'euronews.com',        // Europe
        'scmp.com'             // Asia
    ];

    for (const domain of domains) {
        const { data, count, error } = await supabase
            .from('conflicts')
            .select('title, published_at, source_url', { count: 'exact', head: false })
            .ilike('source_url', `%${domain}%`)
            .order('published_at', { ascending: false })
            .limit(3);

        if (error) {
            console.error(`Error checking ${domain}:`, error.message);
        } else {
            console.log(`\n--- ${domain} (${count} entries) ---`);
            if (data && data.length > 0) {
                data.forEach(d => {
                    console.log(`   [${new Date(d.published_at).toLocaleDateString()}] ${d.title.substring(0, 50)}...`);
                });
            } else {
                console.log("   No entries.");
            }
        }
    }

    // Also check total count again
    const { count: total } = await supabase.from('conflicts').select('*', { count: 'exact', head: true });
    console.log(`\nTotal DB Count      : ${total}`);
}

checkGlobal();
