import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { handleApiError, AppError } from '@/lib/api-utils';

// "Smart" model selection logic
function selectSmartModel(messages: any[]) {
    if (!messages || messages.length === 0) return 'gpt-4o-mini';

    const lastMessage = messages[messages.length - 1]?.content || "";
    const fullContextLength = JSON.stringify(messages).length;

    // If context is very large, use more capable model
    if (fullContextLength > 40000) return 'gpt-4o';

    // If user is asking to Build/Create/Refactor (Complex tasks), use gpt-4o
    if (/(build|create|refactor|optimize|implement|architect|fix)/i.test(lastMessage)) {
        return 'gpt-4o';
    }

    return 'gpt-4o-mini';
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            throw new AppError('Unauthorized', 401);
        }

        const { messages, mode } = await req.json();
        const userId = session.user.id;

        // Usage limiting
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { usageCount: true, usageLimit: true }
        });

        if (user && user.usageCount >= user.usageLimit) {
            throw new AppError('Usage limit reached', 403);
        }

        await prisma.user.update({
            where: { id: userId },
            data: { usageCount: { increment: 1 } }
        });

        const selectedModel = selectSmartModel(messages);
        console.log(`[Chat] Mode: ${mode}, Model: ${selectedModel}`);

        const response = await fetch('http://localhost:4141/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                messages,
                stream: true
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new AppError(`AI Proxy error: ${err}`, response.status as any);
        }

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
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    const content = data.choices[0]?.delta?.content || '';
                                    if (content) {
                                        controller.enqueue(new TextEncoder().encode(content));
                                    }
                                } catch (e) { }
                            }
                        }
                    }
                } catch (err) {
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
        return handleApiError(error);
    }
}
