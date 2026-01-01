import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, files, messages } = await req.json();

        // Create project with its files and chat session
        const project = await prisma.project.create({
            data: {
                name,
                userId: session.user.id,
                files: {
                    create: files.map((f: any) => ({
                        path: f.path,
                        content: f.content,
                        language: f.path.split('.').pop() || 'text'
                    }))
                },
                chats: {
                    create: {
                        userId: session.user.id,
                        messages: {
                            create: messages.map((m: any) => ({
                                role: m.role,
                                content: m.content
                            }))
                        }
                    }
                }
            },
            include: {
                files: true,
                chats: {
                    include: {
                        messages: true
                    }
                }
            }
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error('Project Create Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, name, files, messages } = await req.json();

        // Check ownership
        const existing = await prisma.project.findUnique({
            where: { id, userId: session.user.id }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        }

        // Update project (using a transaction for atomic file and chat updates)
        await prisma.$transaction(async (tx) => {
            // 1. Update project metadata
            await tx.project.update({
                where: { id },
                data: { name, updatedAt: new Date() }
            });

            // 2. Refresh files: delete old and create new
            await tx.projectFile.deleteMany({ where: { projectId: id } });
            await tx.projectFile.createMany({
                data: files.map((f: any) => ({
                    projectId: id,
                    path: f.path,
                    content: f.content,
                    language: f.path.split('.').pop() || 'text'
                }))
            });

            // 3. Update Chat History
            // Try to find the latest chat session for this project
            const latestChat = await tx.chat.findFirst({
                where: { projectId: id },
                orderBy: { createdAt: 'desc' },
                select: { id: true }
            });

            if (latestChat) {
                // Update existing chat messages
                await tx.chatMessage.deleteMany({ where: { chatId: latestChat.id } });
                await tx.chatMessage.createMany({
                    data: messages.map((m: any) => ({
                        chatId: latestChat.id,
                        role: m.role,
                        content: m.content
                    }))
                });
            } else {
                // Create a new chat session if none exists
                await tx.chat.create({
                    data: {
                        projectId: id,
                        userId: session.user.id,
                        messages: {
                            create: messages.map((m: any) => ({
                                role: m.role,
                                content: m.content
                            }))
                        }
                    }
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Project Update Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        if (!userId) {
            return NextResponse.json({ error: 'User ID missing in session' }, { status: 400 });
        }

        if (id) {
            const project = await prisma.project.findUnique({
                where: { id, userId },
                include: {
                    files: true,
                    chats: {
                        include: {
                            messages: true
                        }
                    }
                }
            });

            if (!project) {
                return NextResponse.json({ error: 'Project not found' }, { status: 404 });
            }

            return NextResponse.json(project);
        }

        const projects = await prisma.project.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                updatedAt: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json(projects);
    } catch (error) {
        console.error('Project List Detailed Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
