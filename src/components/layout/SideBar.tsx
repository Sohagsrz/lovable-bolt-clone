'use client';

import React, { useState } from 'react';
import { FileCode, Plus, Rocket, User as UserIcon, History, Activity, Terminal, CheckCircle2 } from 'lucide-react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { useSession, signIn, signOut } from "next-auth/react";
import { DeployModal } from './DeployModal';
import { UserSettingsModal } from './UserSettingsModal';
import { useRouter } from "next/navigation";

export const SideBar = () => {
    const router = useRouter();
    const [userProjects, setUserProjects] = React.useState<any[]>([]);
    const { files, activeFile, setActiveFile, reset, setProject, projectName, projectId } = useBuilderStore();
    const { data: session } = useSession();
    const [view, setView] = useState<'projects' | 'activity'>('projects');
    const [isDeployOpen, setIsDeployOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Fetch user projects
    React.useEffect(() => {
        if (session) {
            fetch('/api/projects')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setUserProjects(data);
                    } else {
                        console.error('Projects API returned non-array data:', data);
                        setUserProjects([]);
                    }
                })
                .catch(err => {
                    console.error(err);
                    setUserProjects([]);
                });
        }
    }, [session, projectId]);

    const handleNewProject = () => {
        reset();
        router.push('/');
    };

    const loadProject = (p: any) => {
        router.push(`/project/${p.id}`);
    };

    const isLiveWorkspace = !projectId;

    const usageCount = (session?.user as any)?.usageCount || 0;
    const usageLimit = (session?.user as any)?.usageLimit || 100;
    const progress = (usageCount / usageLimit) * 100;

    const activityLogs = [
        { icon: CheckCircle2, text: 'Prisma Schema Generated', time: '1m ago', color: 'text-green-400' },
        { icon: Terminal, text: 'WebContainer Booted', time: '5m ago', color: 'text-indigo-400' },
        { icon: History, text: 'Project Foundation Applied', time: '12m ago', color: 'text-yellow-400' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c] border-r border-white/5 w-[260px] shrink-0">
            {/* Brand Header */}
            <div className="p-4 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-600/20">
                            B
                        </div>
                        <span className="font-black text-[13px] tracking-tighter text-white/90">BOLT STUDIO</span>
                    </div>
                    <button
                        onClick={handleNewProject}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-white/30 transition-all border border-transparent hover:border-white/10"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-2 gap-1 bg-white/[0.02] border-b border-white/5">
                <button
                    onClick={() => setView('projects')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'projects' ? 'bg-white/5 text-indigo-400 shadow-sm' : 'text-white/30 hover:text-white/50'}`}
                >
                    <History className="w-3.5 h-3.5" />
                    History
                </button>
                <button
                    onClick={() => setView('activity')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${view === 'activity' ? 'bg-white/5 text-indigo-400 shadow-sm' : 'text-white/30 hover:text-white/50'}`}
                >
                    <Activity className="w-3.5 h-3.5" />
                    Activity
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Live Workspace Indicator */}
                {isLiveWorkspace && (
                    <div className="mx-4 mb-4 p-3 rounded-2xl bg-indigo-600/5 border border-indigo-500/20 animate-in fade-in zoom-in duration-500">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Live Workspace</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        </div>
                        <p className="text-[11px] text-white/40 font-medium leading-tight">You are currently in a fresh production scratchpad.</p>
                    </div>
                )}

                {view === 'projects' ? (
                    <div className="py-4 px-2 space-y-6">
                        {/* History Section */}
                        <section>
                            <h3 className="px-3 mb-2 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Project Archive</h3>
                            <div className="space-y-0.5">
                                {Array.isArray(userProjects) && userProjects.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => loadProject(p)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-[12px] text-white/40 hover:bg-white/5 hover:text-white rounded-lg transition-all group"
                                    >
                                        <FileCode className="w-3.5 h-3.5 text-white/10 group-hover:text-indigo-400" />
                                        <span className="truncate font-medium">{p.name}</span>
                                    </button>
                                ))}
                                {(!Array.isArray(userProjects) || userProjects.length === 0) && (
                                    <div className="px-3 py-2 text-[11px] text-white/10 italic">No saved projects</div>
                                )}
                            </div>
                        </section>

                        {/* Current Files Section */}
                        <section>
                            <h3 className="px-3 mb-2 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Live Workspace</h3>
                            {files.length === 0 ? (
                                <div className="px-3 py-2 text-[11px] text-white/10">No active files...</div>
                            ) : (
                                <div className="space-y-0.5">
                                    {files.map((file) => (
                                        <button
                                            key={file.path}
                                            onClick={() => setActiveFile(file.path)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-[12px] rounded-lg transition-all ${activeFile === file.path
                                                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                                                : 'text-white/30 hover:bg-white/5 hover:text-white/60'
                                                }`}
                                        >
                                            <FileCode className={`w-3.5 h-3.5 ${activeFile === file.path ? 'text-indigo-400' : 'text-white/10'}`} />
                                            <span className="truncate font-medium">{file.path}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                ) : (
                    <div className="py-4 px-2 space-y-4">
                        <h3 className="px-3 mb-2 text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Recent Events</h3>
                        {activityLogs.map((log, i) => {
                            const Icon = log.icon;
                            return (
                                <div key={i} className="flex gap-3 px-3 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${log.color}`} />
                                    <div>
                                        <p className="text-[11px] font-bold text-white/80 leading-tight mb-1">{log.text}</p>
                                        <p className="text-[10px] text-white/20 font-medium">{log.time}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Footer Footer */}
            <div className="p-4 bg-[#0e0e11] border-t border-white/5 space-y-4 shadow-2xl">
                <div className="space-y-2.5">
                    <div className="flex justify-between text-[9px] text-white/30 font-black uppercase tracking-[0.15em]">
                        <span>Usage Credits</span>
                        <span>{usageCount}/{usageLimit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {session ? (
                    <div
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 group cursor-pointer hover:bg-white/[0.08] transition-all"
                    >
                        <div className="w-10 h-10 rounded-lg bg-indigo-600/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                            {session.user?.image ? (
                                <img src={session.user.image} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <UserIcon className="w-5 h-5 text-indigo-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-black text-white/80 truncate leading-none mb-1">{session.user?.name}</p>
                            <p className="text-[9px] text-white/20 uppercase tracking-[0.1em] font-black group-hover:text-indigo-400 transition-colors">Settings & Plan</p>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => signIn()}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[12px] font-black transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-widest"
                    >
                        Authenticate
                    </button>
                )}

                <button
                    onClick={() => setIsDeployOpen(true)}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 text-[11px] font-black text-white/30 hover:text-white hover:bg-white/5 rounded-xl border-2 border-dashed border-white/5 transition-all"
                >
                    <Rocket className="w-4 h-4" />
                    DEPLOYMENT READY
                </button>
            </div>

            <DeployModal
                isOpen={isDeployOpen}
                onClose={() => setIsDeployOpen(false)}
                projectName={projectName}
            />

            {session?.user && (
                <UserSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    user={{
                        ...session.user,
                        plan: (session.user as any).plan || 'Free'
                    }}
                />
            )}
        </div>
    );
};
