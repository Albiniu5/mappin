// Check Supabase to see if The Judge worked!
require('dotenv').config({ path: 'mappin-app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://efvxuustmbfbkckkftxi.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkJudgeResults() {
    console.log('🔍 Checking for Judge verdicts...\n');

    const { data, error } = await supabase
        .from('conflicts')
        .select('id, title, narrative_analysis, related_reports')
        .not('narrative_analysis', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} events with Judge verdicts!\n`);

        data.forEach((conflict, index) => {
            console.log(`━━━ Event ${index + 1} ━━━`);
            console.log(`📰 Title: ${conflict.title}`);
            console.log(`⚖️ Verdict: ${conflict.narrative_analysis?.substring(0, 200)}...`);
            console.log(`📊 Related Reports: ${Array.isArray(conflict.related_reports) ? conflict.related_reports.length : 0} sources`);
            console.log('');
        });

        console.log('🎉 The Judge is working! Check your map for ⚖️ badges!');
    } else {
        console.log('⏳ No Judge verdicts yet. The articles might not be similar enough.');
        console.log('Try sending more articles about the same event.');
    }
}

checkJudgeResults();
