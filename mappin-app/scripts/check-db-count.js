require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkCount() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Checking DB Counts (Ingestion vs Publication) ---');

    // 1. Ingested in last 24h (created_at)
    const { count: ingested24h } = await supabase
        .from('conflicts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // 2. Published in last 24h (published_at) - This is what the UI shows
    const { count: published24h } = await supabase
        .from('conflicts')
        .select('*', { count: 'exact', head: true })
        .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    console.log(`📥 Ingested Recently (Last 24h): ${ingested24h}`);
    console.log(`📰 Published Recently (Last 24h): ${published24h}`);
    console.log(`-------------------------------------------`);

    if (published24h < ingested24h) {
        console.log(`💡 EXPLANATION: You ingested ${ingested24h} items, but only ${published24h} are "breaking news" from the last 24h.`);
        console.log(`   The other ${ingested24h - published24h || 0} items are older articles that were just backfilled.`);
        console.log(`   The Website correctly shows "${published24h}" because it tracks Event Time, not Ingestion Time.`);
    } else {
        console.log(`⚠️ DISCREPANCY: DB says ${published24h} published recently, but Site says something else.`);
    }
}

checkCount();
