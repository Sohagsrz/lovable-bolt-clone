'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useBuilderStore } from '@/store/useBuilderStore';
import { StudioLayout } from '@/components/layout/StudioLayout';

export default function BuilderPage() {
  const { status } = useSession();
  const { projectId, reset } = useBuilderStore();

  React.useEffect(() => {
    if (projectId) {
      reset();
    }
  }, [projectId, reset]);

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
