import { NextResponse } from 'next/server';

export class AppError extends Error {
    constructor(
        public message: string,
        public status: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export function handleApiError(error: unknown) {
    console.error('[API Error]:', error);

    if (error instanceof AppError) {
        return NextResponse.json(
            {
                error: error.name,
                message: error.message,
                details: error.details
            },
            { status: error.status }
        );
    }

    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
        {
            error: 'InternalServerError',
            message: message,
            details: process.env.NODE_ENV === 'development' ? String(error) : undefined
        },
        { status: 500 }
    );
}

export function successResponse(data: any, status: number = 200) {
    return NextResponse.json(data, { status });
}
