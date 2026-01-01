'use client';

import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { SideBar } from '@/components/layout/SideBar';
import { EditorPane } from '@/components/editor/EditorPane';
import { ChatPane } from '@/components/chat/ChatPane';
import { PreviewPane } from '@/components/editor/PreviewPane';
import { PlanPane } from '@/components/plan/PlanPane';
import { FileExplorer } from '@/components/editor/FileExplorer';
import { MessageSquare, Code2, Play, Menu, Sidebar as SidebarIcon, ChevronRight, Sparkles } from 'lucide-react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { motion, AnimatePresence } from 'framer-motion';

export const ResizeHandle = ({ className = "" }: { className?: string }) => (
    <PanelResizeHandle className={`relative flex w-1 items-center justify-center bg-white/5 data-[resize-handle-state=hover]:bg-indigo-500/50 data-[resize-handle-state=drag]:bg-indigo-500 transition-all z-50 ${className}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-white/20" />
    </PanelResizeHandle>
);

export const StudioLayout = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const sidebarRef = React.useRef<ImperativePanelHandle>(null);

    const { files, planSteps } = useBuilderStore();
    const hasFiles = files && files.length > 0;
    const hasPlan = planSteps && planSteps.length > 0;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const layoutKey = `bolt-layout-v9-${hasFiles ? 'full' : 'empty'}-${hasPlan ? 'with-plan' : 'no-plan'}`;

    if (isMobile) {
        return <MobileLayout />;
    }

    const toggleSidebar = () => {
        if (sidebarRef.current) {
            if (isSidebarCollapsed) {
                sidebarRef.current.expand();
            } else {
                sidebarRef.current.collapse();
            }
        }
    };

    return (
        <div className="h-screen w-screen bg-[#0a0a0c] overflow-hidden text-white font-sans selection:bg-indigo-500/30 flex flex-col relative">
            {/* Desktop Header */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0c] z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <SidebarIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="font-black text-[11px] tracking-[0.3em] text-white uppercase antialiased">BOLT STUDIO</div>
                    </div>

                    {/* Breadcrumbs/Project Name */}
                    <div className="h-4 w-px bg-white/10 hidden md:block" />
                    <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Project</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-white/80">{useBuilderStore.getState().projectName}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-white/50">Engine Active</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Floating Sidebar Trigger (Shows when collapsed) */}
                {hasFiles && isSidebarCollapsed && (
                    <button
                        onClick={toggleSidebar}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-[60] w-8 h-20 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 rounded-full flex flex-col items-center justify-center gap-2 group transition-all animate-in slide-in-from-left-4 duration-500 backdrop-blur-md"
                    >
                        <SidebarIcon className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <ChevronRight className="w-3 h-3 text-indigo-400 animate-pulse" />
                    </button>
                )}

                <PanelGroup
                    key={layoutKey}
                    direction="horizontal"
                    autoSaveId={layoutKey}
                >
                    <Panel
                        ref={sidebarRef}
                        id="sidebar"
                        defaultSize={12}
                        minSize={8}
                        maxSize={18}
                        collapsible
                        onCollapse={() => setIsSidebarCollapsed(true)}
                        onExpand={() => setIsSidebarCollapsed(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="h-full"
                        >
                            <SideBar />
                        </motion.div>
                    </Panel>
                    {!isSidebarCollapsed && <ResizeHandle />}

                    <Panel id="chat" defaultSize={hasFiles ? 22 : 30} minSize={20} maxSize={hasFiles ? 35 : 40}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-full"
                        >
                            <ChatPane />
                        </motion.div>
                    </Panel>

                    <AnimatePresence mode="wait">
                        {hasFiles ? (
                            <Panel id="workspace" defaultSize={hasFiles ? 66 : 0}>
                                <PanelGroup direction="horizontal">
                                    <ResizeHandle />
                                    <Panel id="explorer" defaultSize={15} minSize={10} maxSize={25} collapsible>
                                        <FileExplorer />
                                    </Panel>

                                    <ResizeHandle />
                                    <Panel id="editor" defaultSize={35} minSize={20}>
                                        <EditorPane />
                                    </Panel>

                                    <ResizeHandle />

                                    <Panel id="preview" defaultSize={20} minSize={10} maxSize={40} collapsible>
                                        <PreviewPane />
                                    </Panel>
                                </PanelGroup>
                            </Panel>
                        ) : (
                            // Placeholder panel to keep layout balanced when empty
                            <Panel id="empty-workspace" defaultSize={70}>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="h-full w-full bg-[#0a0a0c] flex items-center justify-center p-12"
                                >
                                    <div className="max-w-md text-center">
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: "spring", delay: 0.2 }}
                                            className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 border border-indigo-500/20"
                                        >
                                            <Sparkles className="w-8 h-8 text-indigo-400" />
                                        </motion.div>
                                        <motion.h2
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="text-xl font-black uppercase tracking-[0.3em] text-white mb-3"
                                        >
                                            BOLT STUDIO
                                        </motion.h2>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em] leading-relaxed max-w-sm mx-auto"
                                        >
                                            The world's most advanced AI-native architectural engineering environment. Start architecting your masterpiece in the architect panel.
                                        </motion.p>
                                    </div>
                                </motion.div>
                            </Panel>
                        )}
                    </AnimatePresence>
                </PanelGroup>
            </div>
        </div>
    );
};

const MobileLayout = () => {
    const [activeTab, setActiveTab] = useState<'chat' | 'editor' | 'preview'>('chat');
    const [showSidebar, setShowSidebar] = useState(false);

    return (
        <div className="h-screen w-screen bg-[#0a0a0c] flex flex-col text-white">
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-4">
                <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 text-white/60">
                    <Menu className="w-5 h-5" />
                </button>
                <div className="font-bold text-sm tracking-widest text-white/40">BOLT STUDIO</div>
                <div className="w-9" />
            </div>

            {showSidebar && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={() => setShowSidebar(false)}>
                    <div className="w-[80%] h-full bg-[#0a0a0c] border-r border-white/10" onClick={e => e.stopPropagation()}>
                        <SideBar />
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-hidden relative">
                <div className={`absolute inset-0 ${activeTab === 'chat' ? 'z-10' : 'z-0 invisible'}`}>
                    <ChatPane />
                </div>
                <div className={`absolute inset-0 ${activeTab === 'editor' ? 'z-10' : 'z-0 invisible'}`}>
                    <EditorPane />
                </div>
                <div className={`absolute inset-0 ${activeTab === 'preview' ? 'z-10' : 'z-0 invisible'}`}>
                    <PreviewPane />
                </div>
            </div>

            <div className="h-16 border-t border-white/5 bg-[#0e0e11] flex items-center justify-around pb-safe">
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'chat' ? 'text-indigo-400' : 'text-white/30'}`}
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Architect</span>
                </button>
                <button
                    onClick={() => setActiveTab('editor')}
                    className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'editor' ? 'text-indigo-400' : 'text-white/30'}`}
                >
                    <Code2 className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Code</span>
                </button>
                <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'preview' ? 'text-indigo-400' : 'text-white/30'}`}
                >
                    <Play className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">Preview</span>
                </button>
            </div>
        </div>
    );
};
