// Script to remove duplicate conflicts from the database
// Keeps only the newest version of each unique URL

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanupDuplicates() {
    console.log('🧹 Starting duplicate cleanup...\n');

    // Fetch all conflicts
    const { data: conflicts, error } = await supabase
        .from('conflicts')
        .select('*')
        .order('published_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching conflicts:', error);
        return;
    }

    console.log(`📊 Total conflicts in database: ${conflicts.length}`);

    // Group by normalized URL
    const urlGroups = new Map();

    conflicts.forEach(conflict => {
        let key = '';

        if (conflict.source_url) {
            // Normalize URL: remove query params
            try {
                const urlObj = new URL(conflict.source_url);
                key = urlObj.origin + urlObj.pathname;
            } catch (e) {
                key = conflict.source_url.trim();
            }
        } else {
            key = `title:${conflict.title.trim().toLowerCase()}`;
        }

        if (!urlGroups.has(key)) {
            urlGroups.set(key, []);
        }
        urlGroups.get(key).push(conflict);
    });

    // Find duplicates
    const duplicateGroups = Array.from(urlGroups.entries())
        .filter(([_, items]) => items.length > 1);

    console.log(`🔍 Found ${duplicateGroups.length} duplicate URLs\n`);

    if (duplicateGroups.length === 0) {
        console.log('✅ No duplicates to clean up!');
        return;
    }

    // Collect IDs to delete
    const idsToDelete = [];

    duplicateGroups.forEach(([url, items]) => {
        // Sort by published_at descending (newest first)
        items.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

        // Keep the first (newest), delete the rest
        const toDelete = items.slice(1);
        idsToDelete.push(...toDelete.map(item => item.id));

        console.log(`📰 ${url.substring(0, 60)}...`);
        console.log(`   Keeping: ID ${items[0].id} (${items[0].published_at})`);
        console.log(`   Deleting: ${toDelete.length} duplicate(s)`);
    });

    console.log(`\n🗑️  Total records to delete: ${idsToDelete.length}`);
    console.log('⏳ Starting deletion...\n');

    // Delete in batches of 100
    const BATCH_SIZE = 100;
    let deleted = 0;

    for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE);

        const { error: deleteError } = await supabase
            .from('conflicts')
            .delete()
            .in('id', batch);

        if (deleteError) {
            console.error(`❌ Error deleting batch ${i / BATCH_SIZE + 1}:`, deleteError);
        } else {
            deleted += batch.length;
            console.log(`✓ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} records`);
        }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Deleted: ${deleted} duplicate records`);
    console.log(`   Remaining: ${conflicts.length - deleted} unique conflicts`);
}

cleanupDuplicates().catch(console.error);
