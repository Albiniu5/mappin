// Quick script to check for duplicate URLs in the database
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDuplicates() {
    const { data, error } = await supabase
        .from('conflicts')
        .select('id, source_url, title, latitude, longitude')
        .order('source_url');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const urlCounts = {};
    data.forEach(item => {
        const url = item.source_url || item.title;
        if (!urlCounts[url]) {
            urlCounts[url] = [];
        }
        urlCounts[url].push(item);
    });

    console.log('\n=== DUPLICATE ANALYSIS ===\n');

    const duplicates = Object.entries(urlCounts).filter(([url, items]) => items.length > 1);

    console.log(`Total articles: ${data.length}`);
    console.log(`Unique URLs: ${Object.keys(urlCounts).length}`);
    console.log(`Duplicate URLs: ${duplicates.length}\n`);

    duplicates.slice(0, 5).forEach(([url, items]) => {
        console.log(`\n${url}`);
        console.log(`  Count: ${items.length}`);
        items.forEach(item => {
            console.log(`  - ID: ${item.id}, Coords: (${item.latitude}, ${item.longitude})`);
        });
    });
}

checkDuplicates();
