import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { handleApiError, AppError } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            throw new AppError('Unauthorized', 401);
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { usageCount: true, usageLimit: true }
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return NextResponse.json(user);
    } catch (error) {
        return handleApiError(error);
    }
}
