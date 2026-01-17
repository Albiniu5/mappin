// Delete all BBC tennis duplicates keeping only the oldest one
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function nukeBBCDuplicates() {
    const { data, error } = await supabase
        .from('conflicts')
        .select('id')
        .eq('source_url', 'https://www.bbc.com/sport/tennis/articles/ckgyl1ndw57o?at_medium=RSS&at_campaign=rss')
        .order('created_at', { ascending: true }); // Oldest first

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`\n🔍 Found ${data.length} BBC tennis copies`);

    if (data.length <= 1) {
        console.log('✅ Clean!');
        return;
    }

    // Keep first (oldest), delete rest
    const toDelete = data.slice(1).map(item => item.id);

    console.log(`✅ Keeping oldest: ${data[0].id}`);
    console.log(`🗑️  Deleting: ${toDelete.length} duplicates\n`);

    const { error: deleteError } = await supabase
        .from('conflicts')
        .delete()
        .in('id', toDelete);

    if (deleteError) {
        console.error('❌ Error:', deleteError);
    } else {
        console.log(`✅ Deleted ${toDelete.length} BBC tennis duplicates!`);
    }
}

nukeBBCDuplicates();
