
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Extract article content from URL using Readability
 * Uses dynamic imports to avoid Next.js build issues with ESM modules
 */
async function extractArticleContent(url: string): Promise<string | null> {
  try {
    console.log(`[Extract] Fetching article from: ${url}`);

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Extract] HTTP ${response.status} for ${url}`);
      return null;
    }

    const html = await response.text();

    // Dynamic imports to avoid Next.js build issues
    const { JSDOM } = await import('jsdom');
    const { Readability } = await import('@mozilla/readability');

    // Parse with Readability
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      console.error(`[Extract] Readability failed to parse ${url}`);
      return null;
    }

    console.log(`[Extract] Successfully extracted ${article.textContent.length} characters from ${url}`);
    return article.textContent;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`[Extract] Timeout fetching ${url}`);
    } else {
      console.error(`[Extract] Error fetching ${url}:`, error.message);
    }
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { conflict_id, content, title, source, published_at, source_url } = await req.json();

    if (!conflict_id || !title) {
      return NextResponse.json({ error: 'Missing conflict_id or title' }, { status: 400 });
    }

    // 1. Check AI Analysis Cache
    const { data: existing, error: fetchError } = await supabase
      .from('conflicts')
      .select('ai_analysis, full_content')
      .eq('id', conflict_id)
      .single();

    if (fetchError) {
      console.error('[Analyze] DB Fetch Error:', fetchError);
    }

    if (existing?.ai_analysis) {
      console.log(`[Analyze] Cache HIT for ${conflict_id}`);
      return NextResponse.json(existing.ai_analysis);
    }

    console.log(`[Analyze] Cache MISS for ${conflict_id}. Analyzing...`);

    // 2. Get Article Content (cached or fresh)
    let articleContent = existing?.full_content || null;

    if (!articleContent && source_url) {
      console.log(`[Analyze] Attempting to extract full article content...`);
      articleContent = await extractArticleContent(source_url);

      // Cache extracted content
      if (articleContent) {
        await supabase
          .from('conflicts')
          .update({ full_content: articleContent })
          .eq('id', conflict_id);
        console.log(`[Analyze] Cached extracted content for ${conflict_id}`);
      }
    }

    // Fallback to RSS description if extraction failed
    const contentToAnalyze = articleContent || content || title;
    const contentSource = articleContent ? 'full article' : 'RSS feed';

    console.log(`[Analyze] Using ${contentSource} (${contentToAnalyze.length} chars)`);

    // 3. Call Gemini with enhanced content
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `
You are an analytical assistant integrated into a news intelligence platform.

TASK
Analyze the provided news article and generate structured, factual context to help users understand the event in depth.

RULES
- Use ONLY verifiable information from the article.
- Do NOT speculate or predict future outcomes.
- Clearly distinguish between:
   - Facts stated in the article
   - Widely accepted historical or geopolitical context
- If information is missing or unclear, explicitly state that it is unknown.
- Keep a neutral, factual tone.
- Be CONCISE. Avoid redundancy. Each section should add unique value.

INPUT
Article title: ${title}
Source: ${source || 'Unknown'}
Publication date: ${published_at || 'Unknown'}
Content source: ${contentSource}
Article text: ${contentToAnalyze}

OUTPUT
Return ONLY valid JSON in the following structure:
{
  "summary": "2-3 sentence concise explanation of what happened.",
  "background": "Brief historical or geopolitical context (2-3 sentences max).",
  "actors": [
    {
      "name": "Actor name",
      "role": "One sentence describing who they are and their relevance"
    }
  ],
  "significance": "1-2 sentences explaining why this event matters.",
  "timeline": [
    {
      "date": "YYYY-MM-DD or approximate",
      "event": "Brief description of relevant past event"
    }
  ],
  "verified_facts": [
    "Key fact explicitly stated in the article (one per bullet)"
  ],
  "unknowns": [
    "Important detail that is unclear or unconfirmed (if any)"
  ],
  "interesting_facts": [
    "Relevant insight that adds context but is not central (if any)"
  ],
  "external_context": [
    "Well-established related context not mentioned in article (if any)"
  ]
}

IMPORTANT: Keep ALL sections brief and focused. Prioritize quality over quantity.
`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const responseText = result.response.text();
    const analysis = JSON.parse(responseText);

    // 4. Update AI Analysis Cache
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
