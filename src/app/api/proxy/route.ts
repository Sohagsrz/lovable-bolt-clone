import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const contentType = response.headers.get('content-type');
        const text = await response.text();

        return NextResponse.json({
            content: text,
            contentType
        });
    } catch (error: any) {
        console.error('[Fetch Proxy] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
