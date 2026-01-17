// Check if the Uganda article has a summary
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSummary() {
    const { data, error } = await supabase
        .from('conflicts')
        .select('title, summary')
        .ilike('title', '%Uganda%')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Title:', data[0].title);
        console.log('Summary:', data[0].summary);
        console.log('Summary Length:', data[0].summary ? data[0].summary.length : 0);
    } else {
        console.log('Article not found');
    }
}

checkSummary();
