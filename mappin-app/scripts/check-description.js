// Check if the Uganda article has a description instead of summary
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDescription() {
    const { data, error } = await supabase
        .from('conflicts')
        .select('title, description')
        .ilike('title', '%Uganda%')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Title:', data[0].title);
        console.log('Description:', data[0].description);
        console.log('Desc Length:', data[0].description ? data[0].description.length : 0);
    } else {
        console.log('Article not found');
    }
}

checkDescription();
