// Final comprehensive cleanup using EXACT URL matching (no normalization)
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function finalCleanup() {
    console.log('🧹 Final cleanup using EXACT URL matching...\n');

    const { data: conflicts, error } = await supabase
        .from('conflicts')
        .select('*')
        .order('created_at', { ascending: true }); // Oldest first

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`📊 Total conflicts: ${conflicts.length}`);

    // Group by EXACT URL (no normalization)
    const urlGroups = new Map();

    conflicts.forEach(conflict => {
        const key = conflict.source_url || `title:${conflict.id}`;

        if (!urlGroups.has(key)) {
            urlGroups.set(key, []);
        }
        urlGroups.get(key).push(conflict);
    });

    const duplicateGroups = Array.from(urlGroups.entries())
        .filter(([_, items]) => items.length > 1);

    console.log(`🔍 Found ${duplicateGroups.length} duplicate URL groups\n`);

    if (duplicateGroups.length === 0) {
        console.log('✅ No duplicates found!');
        return;
    }

    const idsToDelete = [];

    duplicateGroups.forEach(([url, items]) => {
        // Keep the oldest (first), delete the rest
        const toDelete = items.slice(1);
        idsToDelete.push(...toDelete.map(item => item.id));

        console.log(`📰 ${url.substring(0, 70)}...`);
        console.log(`   Keeping: ID ${items[0].id}`);
        console.log(`   Deleting: ${toDelete.length} duplicate(s)`);
    });

    console.log(`\n🗑️  Total to delete: ${idsToDelete.length}`);

    // Delete in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE);

        const { error: deleteError } = await supabase
            .from('conflicts')
            .delete()
            .in('id', batch);

        if (deleteError) {
            console.error(`❌ Error deleting batch:`, deleteError);
        } else {
            console.log(`✓ Deleted batch: ${batch.length} records`);
        }
    }

    console.log(`\n✅ Final cleanup complete!`);
    console.log(`   Deleted: ${idsToDelete.length} duplicates`);
    console.log(`   Remaining: ${conflicts.length - idsToDelete.length} unique conflicts`);
}

finalCleanup();
