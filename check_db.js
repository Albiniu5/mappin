const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://efvxuustmbfbkckkftxi.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdnh1dXN0bWJmYmtja2tmdHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjk0NTYsImV4cCI6MjA4MzgwNTQ1Nn0.R5HvrTa8ox6IiIeIiFk8KxD13SW4O8kRwgwVUj9IWpk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCount() {
    const { count, error } = await supabase
        .from('conflicts')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Total Rows in DB:', count);
    }
}

checkCount();
