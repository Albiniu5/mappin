
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use Service Role for updates if RLS is strict
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        const { conflict_id, content, title, source, published_at } = await req.json();

        if (!conflict_id || !content) {
            return NextResponse.json({ error: 'Missing conflict_id or content' }, { status: 400 });
        }

        // 1. Check Cache (Supabase)
        const { data: existing, error: fetchError } = await supabase
            .from('conflicts')
            .select('ai_analysis')
            .eq('id', conflict_id)
            .single();

        if (fetchError) {
            console.error('[Analyze] DB Fetch Error:', fetchError);
        }

        if (existing?.ai_analysis) {
            console.log(`[Analyze] Cache HIT for ${conflict_id}`);
            return NextResponse.json(existing.ai_analysis);
        }

        console.log(`[Analyze] Cache MISS for ${conflict_id}. Calling Gemini...`);

        // 2. Call Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); // Fast & Cheap

        const prompt = `
You are an analytical assistant integrated into a news intelligence platform.

TASK
Analyze the provided news article and generate structured, factual context to help users understand the event in depth.

RULES
- Use ONLY verifiable information.
- Do NOT speculate or predict future outcomes.
- Clearly distinguish between:
   - Facts stated in the article
   - Widely accepted historical or geopolitical context
- If information is missing or unclear, explicitly state that it is unknown.
- Keep a neutral, factual tone.

INPUT
Article title: ${title}
Source: ${source}
Publication date: ${published_at}
Article text: ${content}

OUTPUT
Return ONLY valid JSON in the following structure:
{
  "summary": "Concise explanation of what happened in this article.",
  "background": "Historical or geopolitical context explaining how the situation developed.",
  "actors": [
    {
      "name": "Actor name",
      "role": "Who they are and why they are relevant"
    }
  ],
  "significance": "Why this event matters in a broader context.",
  "timeline": [
    {
      "date": "YYYY-MM-DD or approximate",
      "event": "Relevant past event"
    }
  ],
  "verified_facts": [
    "Fact explicitly stated or confirmed by multiple reliable sources"
  ],
  "unknowns": [
    "Important details that are currently unclear or not confirmed"
  ],
  "interesting_facts": [
    "Relevant factual insights that add understanding but are not central to the article"
  ],
  "external_context": [
    "Well-established context related to the topic that is not explicitly mentioned in the article"
  ]
}
`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const responseText = result.response.text();
        const analysis = JSON.parse(responseText);

        // 3. Update Cache (Supabase)
        const { error: updateError } = await supabase
            .from('conflicts')
            .update({ ai_analysis: analysis })
            .eq('id', conflict_id);

        if (updateError) {
            console.error('[Analyze] DB Update Error:', updateError);
        } else {
            console.log(`[Analyze] Cache UPDATED for ${conflict_id}`);
        }

        return NextResponse.json(analysis);

    } catch (error: any) {
        console.error('[Analyze] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
