'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Monitor, Smartphone, Tablet, ExternalLink, RotateCw, Loader2, Info, MousePointer2 } from 'lucide-react';
import { getWebContainer } from '@/lib/webcontainer';
import { useBuilderStore } from '@/store/useBuilderStore';

export const PreviewPane = () => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isInspectMode, setIsInspectMode] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { addMessage } = useBuilderStore();

    useEffect(() => {
        let mounted = true;

        async function init() {
            try {
                console.log('[PreviewPane] Initializing WebContainer listener...');
                const wc = await getWebContainer();
                wc.on('server-ready', (port, url) => {
                    console.log('[PreviewPane] Server ready on port:', port, 'URL:', url);
                    if (mounted) setPreviewUrl(url);
                });
                console.log('[PreviewPane] WebContainer listener registered');
            } catch (err) {
                console.error('[PreviewPane] Failed to initialize:', err);
            }
        }

        init();
        return () => { mounted = false; };
    }, []);

    // Listen for messages from the injected script inside the iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'BOLT_INSPECT_CLICK') {
                const { tag, text, classes } = event.data;
                const prompt = `Visual Edit: I clicked on the <${tag}> element containing "${text?.slice(0, 30)}..." with classes "${classes}". I want to change this element...`;
                // We pre-fill the chat input or send it as a message
                addMessage({
                    role: 'assistant',
                    content: `I've selected the ${tag} element for you. What would you like to change about it? (e.g., "Change text to 'Hello'", "Make it blue", "Add more padding")`
                });
                setIsInspectMode(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [addMessage]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        const url = previewUrl;
        setPreviewUrl(null);
        setTimeout(() => {
            setPreviewUrl(url);
            setIsRefreshing(false);
        }, 500);
    };

    const toggleInspect = () => {
        setIsInspectMode(!isInspectMode);
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'BOLT_SET_INSPECT',
                enabled: !isInspectMode
            }, '*');
        }
    };

    const deviceWidths = {
        desktop: '100%',
        tablet: '768px',
        mobile: '375px',
    };

    return (
        <div className="w-full h-full bg-[#0a0a0c] border-l border-white/5 flex flex-col">
            {/* Header */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#0e0e11]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleInspect}
                        className={`p-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${isInspectMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-white/20 hover:text-white/40'}`}
                    >
                        <MousePointer2 className="w-3.5 h-3.5" />
                        Inspect
                    </button>
                    <div className="h-4 w-[1px] bg-white/5" />
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                    <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded-md transition-all ${device === 'desktop' ? 'bg-[#1c1c21] text-indigo-400' : 'text-white/20 hover:text-white/40'}`}><Monitor className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDevice('tablet')} className={`p-1.5 rounded-md transition-all ${device === 'tablet' ? 'bg-[#1c1c21] text-indigo-400' : 'text-white/20 hover:text-white/40'}`}><Tablet className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDevice('mobile')} className={`p-1.5 rounded-md transition-all ${device === 'mobile' ? 'bg-[#1c1c21] text-indigo-400' : 'text-white/20 hover:text-white/40'}`}><Smartphone className="w-3.5 h-3.5" /></button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleRefresh} className="p-1.5 text-white/20 hover:text-white/40 transition-colors"><RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /></button>
                    {previewUrl && <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-white/20 hover:text-white/40 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></a>}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 bg-[#141418] p-4 flex justify-center items-start overflow-auto custom-scrollbar">
                {!previewUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600/5 border border-indigo-500/10 flex items-center justify-center mb-6">
                            <Monitor className="w-8 h-8 text-indigo-400/50" />
                        </div>
                        <h3 className="text-white/80 font-bold mb-2 text-sm uppercase tracking-widest">Awaiting Engine Boot</h3>
                        <p className="text-white/20 text-[12px] max-w-xs font-medium leading-relaxed">The production sandbox is initializing. Start the dev server to begin visual development.</p>
                    </div>
                ) : (
                    <div
                        className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 origin-top relative"
                        style={{ width: deviceWidths[device], height: device === 'desktop' ? '100%' : '80%' }}
                    >
                        {isRefreshing ? (
                            <div className="w-full h-full flex items-center justify-center bg-white">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            </div>
                        ) : (
                            <iframe
                                ref={iframeRef}
                                src={previewUrl}
                                className="w-full h-full border-none"
                                title="App Preview"
                                allow="cross-origin-isolated"
                            />
                        )}
                        {isInspectMode && (
                            <div className="absolute inset-0 pointer-events-none border-4 border-indigo-600 animate-pulse z-50" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
