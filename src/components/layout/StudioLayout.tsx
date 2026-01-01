'use client';

import React, { useState, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { SideBar } from '@/components/layout/SideBar';
import { EditorPane } from '@/components/editor/EditorPane';
import { ChatPane } from '@/components/chat/ChatPane';
import { PreviewPane } from '@/components/editor/PreviewPane';
import { PlanPane } from '@/components/plan/PlanPane';
import { FileExplorer } from '@/components/editor/FileExplorer';
import { MessageSquare, Code2, Play, Menu } from 'lucide-react';
import { useBuilderStore } from '@/store/useBuilderStore';

export const ResizeHandle = ({ className = "" }: { className?: string }) => (
    <PanelResizeHandle className={`relative flex w-1 items-center justify-center bg-white/5 data-[resize-handle-state=hover]:bg-indigo-500/50 data-[resize-handle-state=drag]:bg-indigo-500 transition-all z-50 ${className}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-white/20" />
    </PanelResizeHandle>
);

export const StudioLayout = () => {
    const [isMobile, setIsMobile] = useState(false);
    const { files, planSteps } = useBuilderStore();
    const hasFiles = files && files.length > 0;
    const hasPlan = planSteps && planSteps.length > 0;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const layoutKey = `bolt-layout-v8-${hasFiles ? 'full' : 'empty'}-${hasPlan ? 'with-plan' : 'no-plan'}`;

    if (isMobile) {
        return <MobileLayout />;
    }

    return (
        <div className="h-screen w-screen bg-[#0a0a0c] overflow-hidden text-white font-sans selection:bg-indigo-500/30 flex">
            <PanelGroup
                key={layoutKey}
                direction="horizontal"
                autoSaveId={layoutKey}
            >
                {hasFiles && (
                    <>
                        <Panel id="sidebar" defaultSize={12} minSize={8} maxSize={18} collapsible>
                            <SideBar />
                        </Panel>
                        <ResizeHandle />
                    </>
                )}

                <Panel id="chat" defaultSize={hasFiles ? (hasPlan ? 18 : 22) : 100} minSize={hasFiles ? 15 : 20} maxSize={hasFiles ? 35 : 100}>
                    <ChatPane />
                </Panel>

                {hasPlan && (
                    <>
                        <ResizeHandle />
                        <Panel id="plan" defaultSize={15} minSize={10} maxSize={25} collapsible>
                            <PlanPane />
                        </Panel>
                    </>
                )}

                {hasFiles && (
                    <>
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
                    </>
                )}
            </PanelGroup>
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
