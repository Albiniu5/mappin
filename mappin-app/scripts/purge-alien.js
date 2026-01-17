const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function purgeAlien() {
    console.log('🗑️ Purging "Alien" category records...');

    // First, let's count them
    const { count: startCount } = await supabase
        .from('conflicts')
        .select('*', { count: 'exact', head: true })
        .eq('category', 'Alien');

    console.log(`📊 Found ${startCount} Alien records to delete.`);

    const { error, count } = await supabase
        .from('conflicts')
        .delete({ count: 'exact' })
        .eq('category', 'Alien');

    if (error) {
        console.error('❌ Error purging:', error);
    } else {
        console.log(`✅ Purge complete.`);
    }
}

purgeAlien().catch(console.error);
