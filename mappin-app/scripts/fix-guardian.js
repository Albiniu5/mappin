// Emergency cleanup - delete remaining Guardian duplicates manually
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function deleteGuardianDuplicates() {
    const targetUrl = 'https://www.theguardian.com/world/2026/jan/16/uganda-election-early-results-show-museveni-in-lead-as-violence-reported';

    // Get all occurrences
    const { data, error } = await supabase
        .from('conflicts')
        .select('id, published_at, created_at')
        .eq('source_url', targetUrl)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`\n🔍 Found ${data.length} copies of Guardian article`);

    if (data.length <= 1) {
        console.log('✅ Already clean!');
        return;
    }

    // Keep the first (newest by created_at), delete the rest
    const toKeep = data[0];
    const toDelete = data.slice(1);

    console.log(`\n✅ Keeping: ID ${toKeep.id} (created: ${toKeep.created_at})`);
    console.log(`🗑️  Deleting: ${toDelete.length} duplicates\n`);

    const idsToDelete = toDelete.map(item => item.id);

    const { error: deleteError } = await supabase
        .from('conflicts')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error('❌ Error deleting:', deleteError);
    } else {
        console.log(`✅ Successfully deleted ${idsToDelete.length} duplicate records!`);
    }
}

deleteGuardianDuplicates();
