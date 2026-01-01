import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { parseAIResponse } from '@/lib/parser';

// "Smart" model selection logic
function selectSmartModel(messages: any[]) {
    if (!messages || messages.length === 0) return 'gpt-4o-mini';

    const lastMessage = messages[messages.length - 1]?.content || "";
    const fullContextLength = JSON.stringify(messages).length;

    // If context is very large, use a more capable model
    if (fullContextLength > 40000) return 'gpt-4o';

    // If user is asking to Build/Create/Refactor (Complex tasks), use gpt-4o
    if (/(build|create|refactor|optimize|implement|architect|fix)/i.test(lastMessage)) {
        return 'gpt-4o';
    }

    // Default to a fast but capable model
    return 'gpt-4o-mini';
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messages, mode } = await req.json();
        const userId = session.user.id;

        // Usage limiting logic
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { usageCount: true, usageLimit: true }
            });
            if (user && user.usageCount >= user.usageLimit) {
                return NextResponse.json({ error: 'Usage limit reached' }, { status: 403 });
            }

            await prisma.user.update({
                where: { id: userId },
                data: { usageCount: { increment: 1 } }
            });
        }

        const selectedModel = selectSmartModel(messages);
        console.log(`[Chat] Mode: ${mode}, Model: ${selectedModel}`);

        // Proxy request to local copilot with streaming
        const response = await fetch('http://localhost:4141/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                messages,
                stream: true // Enable streaming
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Proxy error: ${err}`);
        }

        // Create a stream that parses the upstream SSE and yields just the text content
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer

                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            if (line.trim() === 'data: [DONE]') continue;
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    const content = data.choices[0]?.delta?.content || '';
                                    if (content) {
                                        controller.enqueue(new TextEncoder().encode(content));
                                    }
                                } catch (e) {
                                    // Ignore parse errors for partial chunks
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('Streaming error:', err);
                    controller.error(err);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error) {
        console.error('API Route Error Detailed:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
