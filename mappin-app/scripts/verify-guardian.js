// Check current state of the specific Guardian article
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkGuardianArticle() {
    const targetUrl = 'https://www.theguardian.com/world/2026/jan/16/uganda-election-early-results-show-museveni-in-lead-as-violence-reported';

    const { data, error } = await supabase
        .from('conflicts')
        .select('id, source_url, title, latitude, longitude, published_at')
        .ilike('source_url', `%theguardian.com/world/2026/jan/16/uganda-election%`);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`\n🔍 Guardian Uganda article search:`);
    console.log(`   Found ${data.length} record(s)\n`);

    data.forEach((item, i) => {
        console.log(`Record ${i + 1}:`);
        console.log(`  ID: ${item.id}`);
        console.log(`  URL: ${item.source_url}`);
        console.log(`  Coords: (${item.latitude}, ${item.longitude})`);
        console.log(`  Published: ${item.published_at}\n`);
    });

    if (data.length > 1) {
        console.log('⚠️  DUPLICATES STILL EXIST IN DATABASE!');
    } else if (data.length === 1) {
        console.log('✅ Database is clean - only 1 copy exists');
    }
}

checkGuardianArticle();
