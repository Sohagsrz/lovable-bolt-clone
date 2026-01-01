'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { FileCode, Play, Terminal as TerminalIcon, Loader2, Save, Diff, Check, X, Plus } from 'lucide-react';
import { getWebContainer, transformFilesToWebContainer } from '@/lib/webcontainer';
import { Terminal } from './Terminal';
import { Terminal as XTerm } from '@xterm/xterm';
import { useRouter } from 'next/navigation';

export const EditorPane = () => {
    const router = useRouter();
    const {
        activeFile, files, getFileContent, updateFile, projectId,
        pendingFiles, originalFiles, acceptChanges, discardChanges,
        terminals, activeTerminalId, addTerminal, removeTerminal, setActiveTerminal
    } = useBuilderStore();

    const [showTerminal, setShowTerminal] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [editorMode, setEditorMode] = useState<'edit' | 'diff'>('edit');

    // Manage shell processes per terminal
    const shellsRef = useRef<Record<string, any>>({});
    const lastSyncedRef = useRef<Record<string, string>>({});

    const pending = activeFile ? pendingFiles.find(f => f.path === activeFile) : null;
    const original = activeFile ? originalFiles.find(f => f.path === activeFile) : null;
    const content = activeFile ? getFileContent(activeFile) : null;

    // Auto-switch to diff if AI is writing
    useEffect(() => {
        if (pending) {
            setEditorMode('diff');
        } else {
            setEditorMode('edit');
        }
    }, [!!pending, activeFile]);

    const handleTerminalReady = useCallback(async (termId: string, term: XTerm) => {
        try {
            const wc = await getWebContainer();

            // Check if we already have a shell for this terminal
            if (shellsRef.current[termId]) return;

            const shellProcess = await wc.spawn('jsh', {
                terminal: {
                    cols: term.cols,
                    rows: term.rows,
                },
            });

            shellsRef.current[termId] = shellProcess;

            // Pipe shell output to terminal
            const outputStream = new WritableStream({
                write(data) {
                    if (term && term.element) {
                        term.write(data);
                    }
                    if (data.includes('error') || data.includes('Failed')) {
                        window.dispatchEvent(new CustomEvent('terminal-error', { detail: { error: data } }));
                    }
                }
            });

            shellProcess.output.pipeTo(outputStream);

            // Pipe terminal input to shell safely
            term.onData((data) => {
                const shell = shellsRef.current[termId];
                if (shell) {
                    const writer = shell.input.getWriter();
                    writer.write(data).then(() => writer.releaseLock()).catch(() => writer.releaseLock());
                }
            });

            term.writeln('\x1b[1;34m⚡ Architect Terminal Ready\x1b[0m');

        } catch (e) {
            console.error('Shell start failed:', e);
            term.writeln('\x1b[1;31m✖ Shell initialization failed\x1b[0m');
        }
    }, []);

    // Cleanup shells on unmount or terminal removal
    useEffect(() => {
        return () => {
            Object.values(shellsRef.current).forEach(shell => {
                try { shell.kill(); } catch (e) { }
            });
        };
    }, []);

    const [syncNotification, setSyncNotification] = useState<{ count: number } | null>(null);

    const seedFiles = useCallback(async () => {
        try {
            const wc = await getWebContainer();
            if (files.length === 0) return;

            const pendingChanges = files.filter(f => lastSyncedRef.current[f.path] !== f.content);
            if (pendingChanges.length === 0) return;

            for (const file of pendingChanges) {
                const parts = file.path.split('/');
                if (parts.length > 1) {
                    await wc.fs.mkdir(parts.slice(0, -1).join('/'), { recursive: true });
                }
                await wc.fs.writeFile(file.path, file.content);
                lastSyncedRef.current[file.path] = file.content;
            }

        } catch (err) {
            console.error('[WebContainer] Seeding failed:', err);
        }
    }, [files]);

    // Background sync effect
    useEffect(() => {
        const timeoutId = setTimeout(seedFiles, 1000);
        return () => clearTimeout(timeoutId);
    }, [files, seedFiles]);

    const runProject = useCallback(async () => {
        setIsRunning(true);
        try {
            const wc = await getWebContainer();

            // 1. Preparation logs in terminal
            const term = activeTerminalId ? (window as any)[`term_${activeTerminalId}`] : null;
            if (term) term.writeln('\x1b[1;33m[SYSTEM] Preparing environment...\x1b[0m');

            await seedFiles();

            let activeShell = shellsRef.current[activeTerminalId];
            let retries = 0;
            while (!activeShell && retries < 10) {
                if (term) term.write('.');
                await new Promise(r => setTimeout(r, 500));
                activeShell = shellsRef.current[activeTerminalId];
                retries++;
            }

            if (activeShell) {
                if (term) term.writeln('\n\x1b[1;32m[SYSTEM] Booting dev server...\x1b[0m');

                try {
                    const writer = activeShell.input.getWriter();
                    await writer.write('\x03'); // Ctrl+C
                    await new Promise(r => setTimeout(r, 500));

                    // Check if we need npm install (basic heuristic)
                    const hasPackageJson = files.some(f => f.path === 'package.json');
                    const hasLockFile = files.some(f => f.path === 'package-lock.json' || f.path === 'yarn.lock');

                    if (hasPackageJson && !hasLockFile) {
                        if (term) term.writeln('\x1b[1;36m[SYSTEM] Fresh project. Running npm install...\x1b[0m');
                        await writer.write('npm install && npm run dev\n');
                    } else {
                        await writer.write('npm run dev\n');
                    }

                    writer.releaseLock();
                } catch (e) {
                    console.error('[Run] Failed to write to shell input:', e);
                }
            } else {
                if (term) term.writeln('\x1b[1;31m\n✖ Error: Could not find an active shell session.\x1b[0m');
            }
        } catch (err) {
            console.error('Run failed:', err);
        } finally {
            setIsRunning(false);
        }
    }, [activeTerminalId, seedFiles]);

    useEffect(() => {
        const handleProjectReady = async (e: any) => {
            const count = e.detail?.count || 0;
            console.log(`[Editor] Project Ready Signal Received (${count} changes). Auto-starting...`);

            if (count > 0) {
                setSyncNotification({ count });
                setTimeout(() => setSyncNotification(null), 4000);
            }

            setShowTerminal(true);
            await seedFiles();
            runProject();
        };

        window.addEventListener('bolt-project-ready', handleProjectReady);
        return () => window.removeEventListener('bolt-project-ready', handleProjectReady);
    }, [runProject, seedFiles]);

    const lastTriggeredContentRef = useRef<string>('');

    // Set initial baseline to avoid triggering on mount
    useEffect(() => {
        if (files.length > 0 && !lastTriggeredContentRef.current) {
            lastTriggeredContentRef.current = files.map(f => `${f.path}:${f.content.length}`).join('|');
        }
    }, [files.length > 0]);

    // AUTO-RUN ON CHANGES (Accepted AI suggestions or manual edits)
    useEffect(() => {
        if (files.length > 0 && !isRunning) {
            // Fingerprint: Check path, length, and a slice of content to be sure
            const currentHash = files.map(f => `${f.path}:${f.content.length}:${f.content.slice(0, 50)}`).join('|');

            if (currentHash === lastTriggeredContentRef.current) return;

            const timer = setTimeout(() => {
                // Final verify before run
                if (currentHash !== lastTriggeredContentRef.current && shellsRef.current[activeTerminalId]) {
                    console.log('[AutoRun] Real architectural changes detected. Refreshing dev server...');
                    lastTriggeredContentRef.current = currentHash;
                    runProject();
                }
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [files, activeTerminalId, isRunning, runProject]);

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
            {/* Toolbar */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-white/[0.01]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-indigo-400" />
                        <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">{activeFile || 'No file selected'}</span>
                    </div>

                    {pending && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20 animate-in fade-in slide-in-from-left-2 transition-all">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">AI Suggestion</span>
                            <div className="h-3 w-px bg-white/10 mx-1" />
                            <button
                                onClick={() => acceptChanges(activeFile!)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-[9px] font-bold"
                            >
                                <Check className="w-2.5 h-2.5" />
                                Accept
                            </button>
                            <button
                                onClick={() => discardChanges(activeFile!)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-[9px] font-bold"
                            >
                                <X className="w-2.5 h-2.5" />
                                Discard
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={runProject}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        Run
                    </button>
                    <button
                        onClick={() => setShowTerminal(!showTerminal)}
                        className={`p-1.5 rounded-lg border transition-all ${showTerminal ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-transparent text-white/40 hover:text-white/60'}`}
                    >
                        <TerminalIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className={`flex-1 overflow-hidden transition-all relative ${showTerminal ? 'h-1/2' : 'h-full'}`}>
                {activeFile ? (
                    editorMode === 'diff' && pending ? (
                        <DiffEditor
                            original={original?.content || ''}
                            modified={pending.content}
                            language={activeFile.endsWith('.css') ? 'css' : activeFile.endsWith('.html') ? 'html' : 'typescript'}
                            theme="vs-dark"
                            options={{
                                readOnly: true,
                                scrollBeyondLastLine: false,
                                fontSize: 13,
                                minimap: { enabled: false },
                                renderSideBySide: true,
                            }}
                        />
                    ) : (
                        <Editor
                            value={content || ''}
                            onChange={(v) => updateFile(activeFile, v || '')}
                            language={activeFile.endsWith('.css') ? 'css' : activeFile.endsWith('.html') ? 'html' : 'typescript'}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                scrollBeyondLastLine: false,
                                padding: { top: 20 },
                                smoothScrolling: true,
                                cursorSmoothCaretAnimation: 'on',
                                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                            }}
                        />
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/10 p-8 text-center">
                        <FileCode className="w-16 h-16 mb-6 opacity-20" />
                        <h3 className="text-xl font-black uppercase tracking-widest mb-2">No Active File</h3>
                        <p className="max-w-xs text-sm leading-relaxed italic opacity-50">Select a file from the explorer or start a build to see code here.</p>
                    </div>
                )}

                {/* Sync Notification Popup */}
                {syncNotification && (
                    <div className="absolute bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <div className="bg-indigo-600/20 backdrop-blur-xl border border-indigo-500/40 rounded-2xl px-5 py-3 shadow-2xl shadow-indigo-500/20 flex items-center gap-3 border-l-4 border-l-indigo-500">
                            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                            <span className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.1em]">
                                {syncNotification.count} {syncNotification.count === 1 ? 'FILE' : 'FILES'} SYNCED TO ENGINE
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Multiple Terminals Area */}
            {showTerminal && (
                <div className="h-1/2 border-t border-white/5 flex flex-col bg-[#0a0a0c]">
                    {/* Terminal Tabs */}
                    <div className="h-9 border-b border-white/5 flex items-center px-2 gap-1 bg-white/[0.01]">
                        {terminals.map((t) => (
                            <div key={t.id} className="flex items-center group">
                                <button
                                    onClick={() => setActiveTerminal(t.id)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTerminalId === t.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
                                >
                                    <TerminalIcon className="w-3 h-3" />
                                    {t.name}
                                </button>
                                {terminals.length > 1 && (
                                    <button
                                        onClick={() => removeTerminal(t.id)}
                                        className="w-0 overflow-hidden group-hover:w-4 transition-all text-white/20 hover:text-rose-400"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => addTerminal()}
                            className="p-1.5 hover:bg-white/5 rounded-md text-white/20 hover:text-indigo-400 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Active Terminal Instance */}
                    <div className="flex-1 relative">
                        {terminals.map((t) => (
                            <div
                                key={t.id}
                                className={`absolute inset-0 ${activeTerminalId === t.id ? 'block' : 'hidden'}`}
                            >
                                <Terminal
                                    id={t.id}
                                    isActive={activeTerminalId === t.id}
                                    onReady={(term) => handleTerminalReady(t.id, term)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
