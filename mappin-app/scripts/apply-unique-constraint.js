// Script to apply the unique constraint migration to Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function applyMigration() {
    console.log('🔧 Applying unique constraint migration...\n');

    const sql = `
        CREATE UNIQUE INDEX IF NOT EXISTS conflicts_source_url_unique 
        ON conflicts(source_url) 
        WHERE source_url IS NOT NULL;
    `;

    try {
        const { data, error } = await supabase.rpc('exec_sql', { query: sql });

        if (error) {
            console.error('❌ Error applying migration:', error);
            console.log('\n⚠️  Manual action required:');
            console.log('1. Open Supabase Dashboard → SQL Editor');
            console.log('2. Run this SQL:\n');
            console.log(sql);
        } else {
            console.log('✅ Unique constraint applied successfully!');
            console.log('   Duplicate URLs can no longer be inserted into the database.');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.log('\n⚠️  Manual action required:');
        console.log('1. Open Supabase Dashboard → SQL Editor');
        console.log('2. Run this SQL:\n');
        console.log(sql);
    }
}

applyMigration();
