import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { reports } = body;

        if (!reports || !Array.isArray(reports)) {
            return NextResponse.json({ success: false, error: 'Invalid reports payload' }, { status: 400 });
        }

        console.log(`[n8n Proxy] Forwarding ${reports.length} reports to n8n...`);

        // Forward to n8n Webhook (Production URL)
        // Note: In n8n "Test" mode, URL is /webhook-test/..., in "Active" mode it is /webhook/...
        const n8nWebhookUrl = 'http://localhost:5678/webhook/ingest-ai';

        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reports })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[n8n Proxy] Error: ${response.status} ${text}`);
            throw new Error(`n8n responded with ${response.status}`);
        }

        const data = await response.json().catch(() => ({}));
        console.log('[n8n Proxy] Success!', data);

        return NextResponse.json({
            success: true,
            forwarded: true,
            count: reports.length,
            n8n_response: data
        });

    } catch (error: any) {
        console.error('[n8n Proxy] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
