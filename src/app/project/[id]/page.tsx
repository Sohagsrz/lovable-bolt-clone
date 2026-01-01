'use client';

import React, { useEffect } from 'react';
import { StudioLayout } from '@/components/layout/StudioLayout';
import { useSession } from 'next-auth/react';
import { redirect, useParams } from 'next/navigation';
import { useBuilderStore } from '@/store/useBuilderStore';

export default function ProjectPage() {
    const { status } = useSession();
    const params = useParams();
    const id = params.id as string;
    const { setProject, projectId } = useBuilderStore();

    useEffect(() => {
        if (id && id !== projectId) {
            // Fetch project data if not already loaded or if different
            fetch(`/api/projects?id=${id}`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        // The API returns project with files and chats
                        const files = data.files.map((f: any) => ({
                            path: f.path,
                            content: f.content,
                            type: 'file'
                        }));
                        const messages = data.chats[0]?.messages
                            .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                            .map((m: any) => ({
                                role: m.role,
                                content: m.content
                            })) || [];

                        setProject(data.id, data.name, files, messages);
                    }
                })
                .catch(err => console.error('Failed to fetch project:', err));
        }
    }, [id, projectId, setProject]);

    if (status === 'unauthenticated') {
        redirect('/auth/signin');
    }

    if (status === 'loading') {
        return (
            <div className="h-screen w-screen bg-[#0a0a0c] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-white/40 text-sm font-medium animate-pulse uppercase tracking-widest">Initialising Studio...</p>
                </div>
            </div>
        );
    }

    return <StudioLayout />;
}
