import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { handleApiError, successResponse, AppError } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            throw new AppError('Unauthorized', 401);
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

        return successResponse(project);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            throw new AppError('Unauthorized', 401);
        }

        const { id, name, files, messages } = await req.json();

        // Check ownership
        const existing = await prisma.project.findUnique({
            where: { id, userId: session.user.id }
        });

        if (!existing) {
            throw new AppError('Project not found', 404);
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
            const latestChat = await tx.chat.findFirst({
                where: { projectId: id },
                orderBy: { createdAt: 'desc' },
                select: { id: true }
            });

            if (latestChat) {
                await tx.chatMessage.deleteMany({ where: { chatId: latestChat.id } });
                await tx.chatMessage.createMany({
                    data: messages.map((m: any) => ({
                        chatId: latestChat.id,
                        role: m.role,
                        content: m.content
                    }))
                });
            } else {
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

        return successResponse({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            throw new AppError('Unauthorized', 401);
        }

        const userId = session.user.id;

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
                throw new AppError('Project not found', 404);
            }

            return successResponse(project);
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

        return successResponse(projects);
    } catch (error) {
        return handleApiError(error);
    }
}
