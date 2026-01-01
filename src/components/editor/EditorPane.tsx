'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { FileCode, Play, Terminal as TerminalIcon, Loader2, Save, Diff, Check, X } from 'lucide-react';
import { getWebContainer, transformFilesToWebContainer } from '@/lib/webcontainer';
import { Terminal } from './Terminal';
import { Terminal as XTerm } from '@xterm/xterm';
import { useRouter } from 'next/navigation';

export const EditorPane = () => {
    const router = useRouter();
    const {
        activeFile, files, getFileContent, updateFile, projectId,
        pendingFiles, originalFiles, acceptChanges, discardChanges
    } = useBuilderStore();
    const [showTerminal, setShowTerminal] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [editorMode, setEditorMode] = useState<'edit' | 'diff'>('edit');
    const terminalRef = useRef<XTerm | null>(null);
    const webcontainerRef = useRef<any>(null);
    const shellRef = useRef<any>(null);

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

    const handleTerminalReady = useCallback(async (term: XTerm) => {
        terminalRef.current = term;

        // Start interactive shell
        try {
            const wc = await getWebContainer();
            const shellProcess = await wc.spawn('jsh', {
                terminal: {
                    cols: term.cols,
                    rows: term.rows,
                },
            });
            shellRef.current = shellProcess;

            // Pipe shell output to terminal
            shellProcess.output.pipeTo(new WritableStream({
                write(data) {
                    term.write(data);
                    // Check for errors to dispatch fix events
                    if (data.includes('error') || data.includes('Failed')) {
                        // Debounce/limit this to avoid spamming
                        window.dispatchEvent(new CustomEvent('terminal-error', { detail: { error: data } }));
                    }
                }
            }));

            // Pipe terminal input to shell safely
            term.onData((data) => {
                if (shellRef.current) {
                    try {
                        const writer = shellRef.current.input.getWriter();
                        writer.write(data);
                        writer.releaseLock();
                    } catch (e) {
                        console.error('Failed to write to shell:', e);
                    }
                }
            });

            term.writeln('\x1b[1;34m⚡ Interactive Shell Ready\x1b[0m');

        } catch (e) {
            console.error('Shell start failed:', e);
            term.writeln('\x1b[1;31m✖ Shell initialization failed\x1b[0m');
        }
    });

    // Cleanup terminal ref and shell when hidden
    useEffect(() => {
        if (!showTerminal) {
            // Kill active shell to prevent zombies
            if (shellRef.current) {
                try {
                    shellRef.current.kill(); // Kill process
                } catch (e) {
                    console.error('Failed to kill shell:', e);
                }
                shellRef.current = null;
            }
            // Dispose UI ref
            terminalRef.current = null;
        }
    }, [showTerminal]);

    // Listen for auto-fix completion
    useEffect(() => {
        const handleFixComplete = () => {
            if (terminalRef.current) {
                terminalRef.current.writeln('\x1b[1;32m✔ Auto-fix applied. Restarting dev server...\x1b[0m');
            }
            if (shellRef.current) {
                // Send Ctrl+C then restart dev
                const writer = shellRef.current.input.getWriter();
                writer.write('\x03'); // Ctrl+C
                writer.releaseLock();

                setTimeout(() => {
                    // Re-acquire lock for next command
                    const nextWriter = shellRef.current.input.getWriter();
                    nextWriter.write('npm run dev\r');
                    nextWriter.releaseLock();
                }, 500);
            }
        };
        window.addEventListener('bolt-fix-complete', handleFixComplete);
        return () => window.removeEventListener('bolt-fix-complete', handleFixComplete);
    }, [isRunning]);

    // Sync changes to WebContainer with Debounce to prevent WASM OOM
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const syncFiles = async () => {
            try {
                const wc = await getWebContainer();

                // We only sync if there are files
                if (files.length === 0) return;

                console.log('[WebContainer] Syncing files...');
                for (const file of files) {
                    const parts = file.path.split('/');
                    if (parts.length > 1) {
                        const dir = parts.slice(0, -1).join('/');
                        if (dir) {
                            try {
                                await wc.fs.mkdir(dir, { recursive: true });
                            } catch (e) { }
                        }
                    }
                    await wc.fs.writeFile(file.path, file.content);
                }
                console.log('[WebContainer] Sync complete');
            } catch (err) {
                console.error('[WebContainer] Sync failed:', err);
            }
        };

        // Debounce: Only sync if no changes for 500ms
        // This is critical when AI is "seeding" files fast
        if (files.length > 0) {
            timeoutId = setTimeout(syncFiles, 500);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [files]);

    const runProject = async () => {
        if (isRunning) return;

        // Check if we have files to run
        if (files.length === 0) {
            if (terminalRef.current) {
                terminalRef.current.writeln('\x1b[1;33m⚠ No files to run. Create a project first.\x1b[0m');
            }
            return;
        }

        setIsRunning(true);

        // If shell exists, send command through interactive shell
        if (shellRef.current && terminalRef.current) {
            try {
                terminalRef.current.writeln('\x1b[1;34m⚡ Running npm install && npm run dev...\x1b[0m');
                const writer = shellRef.current.input.getWriter();
                writer.write('npm install && npm run dev\r');
                writer.releaseLock();
            } catch (e) {
                console.error('Failed to send command to shell:', e);
                terminalRef.current.writeln('\x1b[1;31m✖ Failed to send command\x1b[0m');
                setIsRunning(false);
            }
            return;
        }

        // Original logic for initial run if shell not yet ready
        if (terminalRef.current) {
            terminalRef.current.clear();
            terminalRef.current.writeln('\x1b[1;34m⚡ Booting Engine...\x1b[0m');
        }

        try {
            const wc = await getWebContainer();
            // Mount files
            const wcFiles = transformFilesToWebContainer(files);
            await wc.mount(wcFiles);

            // Run npm install
            const installProcess = await wc.spawn('npm', ['install']);
            let installOutput = '';

            installProcess.output.pipeTo(new WritableStream({
                write(data) {
                    if (terminalRef.current) {
                        try {
                            terminalRef.current.write(data);
                        } catch (e) {
                            // Terminal might be disposed, ignore
                        }
                    }
                    installOutput += data;
                }
            }));

            const installExitCode = await installProcess.exit;

            if (installExitCode !== 0) {
                if (terminalRef.current) {
                    try {
                        terminalRef.current.writeln('\x1b[1;31m✖ npm install failed\x1b[0m');
                    } catch (e) { }
                }
                window.dispatchEvent(new CustomEvent('terminal-error', {
                    detail: { error: `npm install failed: ${installOutput.slice(-500)}` }
                }));
                setIsRunning(false);
                return;
            }

            // Run dev server
            const devProcess = await wc.spawn('npm', ['run', 'dev']);
            devProcess.output.pipeTo(new WritableStream({
                write(data) {
                    if (terminalRef.current) {
                        try {
                            terminalRef.current.write(data);
                        } catch (e) { }
                    }
                    if (data.includes('error') || data.includes('Failed')) {
                        window.dispatchEvent(new CustomEvent('terminal-error', { detail: { error: data } }));
                    }
                }
            }));
        } catch (err) {
            console.error(err);
            setIsRunning(false);
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const method = projectId ? 'PUT' : 'POST';
            const body = {
                id: projectId,
                name: (useBuilderStore.getState().projectName) || 'New Project',
                files: files,
                messages: useBuilderStore.getState().messages
            };

            const res = await fetch('/api/projects', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Save failed');
            const data = await res.json();

            if (method === 'POST') {
                useBuilderStore.getState().setProject(data.id, data.name, data.files, data.chats[0]?.messages || []);
                router.push(`/project/${data.id}`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0c]">
            {/* Toolbar */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#0e0e11]">
                <div className="flex items-center gap-4 h-full">
                    <div className="flex items-center gap-2.5 text-[12px] font-bold text-white/40 uppercase tracking-widest">
                        <FileCode className="w-4 h-4 text-indigo-400" />
                        <span className="truncate max-w-[200px]">{activeFile || 'Select a file'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {pending && (
                        <div className="flex items-center gap-2 bg-indigo-600/10 px-2 py-1 rounded-lg border border-indigo-500/20 mr-2">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1">AI SUGGESTION</span>
                            <div className="h-4 w-[1px] bg-indigo-500/20" />
                            <button
                                onClick={() => acceptChanges(activeFile!)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
                            >
                                <Check className="w-3 h-3" />
                                ACCEPT
                            </button>
                            <button
                                onClick={() => discardChanges(activeFile!)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                            >
                                <X className="w-3 h-3" />
                                DISCARD
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 text-white/30 hover:text-white/60 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isSaving ? 'SAVING...' : 'SAVE'}
                    </button>

                    <button
                        onClick={() => setShowTerminal(prev => !prev)}
                        className={`p-2 rounded-lg transition-colors ${showTerminal ? 'text-indigo-400 bg-indigo-400/10' : 'text-white/20 hover:text-white/40'}`}
                    >
                        <TerminalIcon className="w-4 h-4" />
                    </button>

                    <button
                        onClick={runProject}
                        disabled={isRunning}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
                    >
                        {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        {isRunning ? 'RUNNING' : 'RUN'}
                    </button>
                </div>
            </div>

            {/* Editor Surface */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                <div className="flex-1 relative">
                    {editorMode === 'edit' ? (
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            path={activeFile || 'index.tsx'}
                            defaultLanguage="typescript"
                            value={content || '// Select a file to start editing'}
                            onChange={(val) => activeFile && updateFile(activeFile, val || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                                lineNumbers: 'on',
                                roundedSelection: true,
                                scrollBeyondLastLine: false,
                                readOnly: !activeFile,
                                automaticLayout: true,
                                padding: { top: 20 },
                                backgroundColor: '#0a0a0c',
                            }}
                        />
                    ) : (
                        <DiffEditor
                            height="100%"
                            theme="vs-dark"
                            original={original?.content || content || ''}
                            modified={pending?.content || content || ''}
                            language={activeFile?.split('.').pop() === 'tsx' ? 'typescript' : 'javascript'}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                readOnly: true,
                                automaticLayout: true,
                                padding: { top: 20 },
                            }}
                        />
                    )}
                </div>

                {showTerminal && (
                    <div className="h-48 bg-[#0a0a0c] border-t border-white/5 flex flex-col shadow-2xl z-10 transition-all">
                        <div className="h-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between px-4">
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Console Output</span>
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500/20" />
                                <span className="w-2 h-2 rounded-full bg-yellow-500/20" />
                                <span className="w-2 h-2 rounded-full bg-green-500/20" />
                            </div>
                        </div>
                        <div className="flex-1 p-2 overflow-hidden">
                            <Terminal onReady={handleTerminalReady} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
