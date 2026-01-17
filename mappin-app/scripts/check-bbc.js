// Check for the specific BBC tennis article
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkBBCTennis() {
    const { data, error } = await supabase
        .from('conflicts')
        .select('id, source_url, created_at')
        .ilike('source_url', '%bbc.com/sport/tennis/articles/ckgyl1ndw57o%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`\n🔍 BBC Tennis article copies: ${data.length}\n`);

    data.slice(0, 10).forEach((item, i) => {
        console.log(`${i + 1}. ID: ${item.id}`);
        console.log(`   URL: ${item.source_url}`);
        console.log(`   Created: ${item.created_at}\n`);
    });

    if (data.length > 10) {
        console.log(`... and ${data.length - 10} more\n`);
    }

    // Group by exact URL
    const urlGroups = {};
    data.forEach(item => {
        if (!urlGroups[item.source_url]) urlGroups[item.source_url] = [];
        urlGroups[item.source_url].push(item);
    });

    console.log(`🔑 Unique URL variations: ${Object.keys(urlGroups).length}`);
    Object.entries(urlGroups).forEach(([url, items]) => {
        console.log(`   ${url}: ${items.length} copies`);
    });
}

checkBBCTennis();
