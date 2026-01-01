'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Paperclip, Loader2, BrainCircuit, Terminal, Zap, Shield, Wand2, Rocket, CheckCircle2, FileCode, Check, X, RotateCcw, History, ChevronDown, ChevronRight, ClipboardCheck } from 'lucide-react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseAIResponse } from '@/lib/parser';

import { useRouter } from "next/navigation";

type AgentMode = 'build' | 'fix' | 'refactor' | 'ui' | 'deploy';

/**
 * Clean internal AI architecture payloads while preserving the narrative
 */
const cleanAIMessage = (text: string) => {
    return text
        .replace(/<bolt_plan>[\s\S]*?<\/bolt_plan>/gi, '') // Remove structured plan tags
        .replace(/###\s*FILE:?\s*[^\n]*\s*```[\s\S]*?```/gi, '') // Remove file path markers AND their code blocks
        .replace(/###\s*FILE:?\s*[^\n]*/gi, '') // Cleanup any stray file markers
        .replace(/###\s*PLAN/gi, '**STEP-BY-STEP PLAN**') // Format plan header nicely
        .trim();
};

const extractPlanSteps = (text: string) => {
    const planMatch = text.match(/<bolt_plan>([\s\S]*?)<\/bolt_plan>/i);
    if (!planMatch) return [];

    const stepsContent = planMatch[1];
    const stepMatches = [...stepsContent.matchAll(/<step\s+id="([^"]+)"\s+title="([^"]+)"\s+description="([^"]+)"\s*\/>/gi)];

    return stepMatches.map(m => ({
        id: m[1],
        title: m[2],
        description: m[3],
        status: 'pending' as const
    }));
};

const extractEditedFiles = (text: string) => {
    const matches = text.match(/###\s*FILE:?\s*([^\n\s`]+)/gi);
    if (!matches) return [];
    return matches.map(m => m.replace(/###\s*FILE:?\s*/i, '').trim());
};

export const ChatPane = () => {
    const router = useRouter();
    const {
        messages, addMessage, updateLastMessageContent, isGenerating, setGenerating,
        files, upsertFile, currentPlan, setPlan, planSteps, setPlanSteps, updatePlanStep,
        projectName, setProjectName, projectId, setProject,
        pendingFiles, acceptChanges, discardChanges,
        restoreCheckpoint, deleteCheckpoint
    } = useBuilderStore();
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<AgentMode>('build');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isGenerating, currentPlan]);

    const handleSend = async (forcedInput?: string) => {
        const textToSend = forcedInput || input;
        if (!textToSend.trim() || isGenerating) return;

        // Reset plan steps for new request
        setPlanSteps([]);

        // Auto-generate title for first message if project is new
        let currentProjectName = projectName;
        if (projectName === 'New Project' && !projectId) {
            const title = textToSend
                .split(' ')
                .slice(0, 5)
                .join(' ')
                .replace(/[^\w\s]/gi, '')
                .trim();
            if (title) {
                const newTitle = title.charAt(0).toUpperCase() + title.slice(1);
                setProjectName(newTitle);
                currentProjectName = newTitle;
            }
        }

        const userMessage = { role: 'user' as const, content: textToSend };
        if (!forcedInput) addMessage(userMessage);

        setInput('');
        setGenerating(true);
        setPlan(`Agent [${mode.toUpperCase()}] is architecting a solution...`);

        // Create a checkpoint before the AI modifies anything
        const checkpointId = useBuilderStore.getState().addCheckpoint(`Pre-Task: ${textToSend.slice(0, 30)}...`);

        try {
            const systemPrompt = `You are BOLT STUDIO, an elite AI architect.
Project: ${projectName}
Current Workspace: ${files.map(f => f.path).join(', ')}.

RESPONSE STRUCTURE:
1. **Human Summary**: Breifly explain the solution.
2. **Technical Plan**: 
   - Mandatory: wrap your structured plan in <bolt_plan> tags.
   - Each step should be: <step id="..." title="..." description="..." />
   - Keep steps concise but clear.
3. **Implementation**: Mandatory: use "### FILE: path/to/file" followed by full code blocks for every change.
4. **Conclusion**: Very short wrap-up.

STRICT RULES:
- Never skip the <bolt_plan> and <step> tags for any complex task.
- Provide full file contents for files.
- Be technical but extremely concise.`;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages,
                        userMessage
                    ],
                    mode: mode
                })
            });

            if (!response.ok) throw new Error('Failed to fetch AI');
            if (!response.body) throw new Error('No response body');

            setPlan(null);

            // Initialize empty assistant message with the checkpoint reference
            addMessage({ role: 'assistant', content: '', checkpointId });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let fullContent = '';
            let planExtracted = false;

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value, { stream: !done });
                fullContent += chunkValue;
                updateLastMessageContent(fullContent);

                // Try to extract plan steps as they stream
                if (!planExtracted && fullContent.includes('</bolt_plan>')) {
                    const steps = extractPlanSteps(fullContent);
                    if (steps.length > 0) {
                        setPlanSteps(steps);
                        planExtracted = true;
                        updatePlanStep(steps[0].id, { status: 'in-progress' });
                    }
                }

                // Incremental file parsing for "Seeding" effect
                const currentChanges = parseAIResponse(fullContent);
                if (currentChanges && currentChanges.length > 0) {
                    currentChanges.forEach((change: any) => {
                        // Only set as pending if it's a complete file block or we want real-time diff
                        useBuilderStore.getState().setPendingFile(change.path, change.content);
                    });
                }
            }

            // Final sync and mark plan complete
            const steps = extractPlanSteps(fullContent);
            if (steps.length > 0) {
                setPlanSteps(steps.map(s => ({ ...s, status: 'completed' })));
            }

            const changes = parseAIResponse(fullContent);
            if (changes && changes.length > 0) {
                changes.forEach((change: any) => {
                    useBuilderStore.getState().setPendingFile(change.path, change.content);
                });
            }

            // AUTO-SAVE LOGIC
            // Note: We use the latest messages including the AI's response
            // We use useBuilderStore.getState().files to ensure we get the updated files state after upserts
            const currentFiles = useBuilderStore.getState().files;
            const updatedMessages = [...messages, userMessage, { role: 'assistant' as const, content: fullContent }];

            autoSaveProject(currentProjectName, currentFiles, updatedMessages);

            // Signal fix completion
            if (mode === 'fix' && changes && changes.length > 0) {
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('bolt-fix-complete'));
                }, 1000); // Small delay to let UI settle
            }

        } catch (error) {
            console.error(error);
            setPlan(null);
            addMessage({ role: 'assistant', content: "Lost connection to the brain. Please try again." });
        } finally {
            setGenerating(false);
        }
    };

    const autoSaveProject = async (name: string, pFiles: any[], pMessages: any[]) => {
        try {
            const method = projectId ? 'PUT' : 'POST';
            const body = {
                id: projectId,
                name: name,
                files: pFiles,
                messages: pMessages
            };

            const res = await fetch('/api/projects', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) return;

            const data = await res.json();
            if (method === 'POST' && data.id) {
                setProject(data.id, data.name, data.files, data.chats[0]?.messages || []);
                router.push(`/project/${data.id}`);
            }
        } catch (err) {
            console.error('Auto-save error:', err);
        }
    };

    useEffect(() => {
        const handleAutoFix = (e: any) => {
            if (e.detail?.error) {
                setMode('fix');
                handleSend(`The terminal reported an error: "${e.detail.error}". Fix this immediately.`);
            }
        };
        window.addEventListener('terminal-error', handleAutoFix);
        return () => window.removeEventListener('terminal-error', handleAutoFix);
    }, [messages, files]);

    const modes = [
        { id: 'build', icon: Wand2, label: 'Build' },
        { id: 'fix', icon: Shield, label: 'Fix' },
        { id: 'refactor', icon: Zap, label: 'Refactor' },
        { id: 'ui', icon: Sparkles, label: 'UI/UX' },
        { id: 'deploy', icon: Rocket, label: 'Deploy' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden relative">
            {/* Floating Bulk Action Bar */}
            {pendingFiles.length > 0 && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-[#1c1c21]/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center gap-6">
                        <div className="pl-2">
                            <div className="flex items-center gap-2 mb-0.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">{pendingFiles.length} FIL {pendingFiles.length === 1 ? 'E' : 'ES'} SEEDED</span>
                            </div>
                            <p className="text-[9px] text-white/30 font-medium whitespace-nowrap">Review the diffs and choose an action</p>
                        </div>

                        <div className="flex items-center gap-2 pr-1">
                            <button
                                onClick={() => discardChanges()}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black bg-white/5 text-white/60 hover:bg-white/10 transition-all border border-white/5"
                            >
                                <X className="w-3.5 h-3.5" />
                                DISCARD ALL
                            </button>
                            <button
                                onClick={() => acceptChanges()}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30"
                            >
                                <Check className="w-3.5 h-3.5" />
                                APPLY ALL
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header with Mode Selector */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-xs flex items-center gap-2 tracking-[0.1em] text-white/50 uppercase">
                        <BrainCircuit className="w-4 h-4 text-indigo-400" />
                        AI Architect
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-none mt-0.5">Live</span>
                    </div>
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {modes.map((m) => {
                        const Icon = m.icon;
                        return (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id as AgentMode)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap border ${mode === m.id
                                    ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400'
                                    : 'bg-white/5 border-transparent text-white/40 hover:text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {m.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Chat History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={i}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${msg.role === 'user'
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'bg-[#141418] border-white/10 text-indigo-400'
                                }`}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed relative ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-[#141418] border border-white/5 text-white/90 rounded-tl-none shadow-xl shadow-black/20'
                                }`}>
                                {msg.role === 'user' ? (
                                    msg.content
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/5">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {cleanAIMessage(msg.content)}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Execution Plan (TODO List) */}
                                        {msg.role === 'assistant' && planSteps.length > 0 && i === messages.length - 1 && (
                                            <div className="mt-2 bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                                                <div className="px-3 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-400">
                                                        <ClipboardCheck className="w-3.5 h-3.5" />
                                                        Implementation Plan
                                                    </div>
                                                    <div className="text-[9px] text-white/20 font-medium">
                                                        {planSteps.filter(s => s.status === 'completed').length} / {planSteps.length}
                                                    </div>
                                                </div>
                                                <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                    {planSteps.map((step) => (
                                                        <div key={step.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors group">
                                                            <div className="mt-0.5">
                                                                {step.status === 'completed' ? (
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                                                                ) : step.status === 'in-progress' ? (
                                                                    <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                                                ) : (
                                                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/10 group-hover:border-white/20" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className={`text-[12px] font-bold ${step.status === 'completed' ? 'text-white/40 line-through' : 'text-white/80'}`}>
                                                                    {step.title}
                                                                </div>
                                                                <div className="text-[10px] text-white/30 truncate uppercase tracking-tight mt-0.5">
                                                                    {step.description}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {msg.checkpointId && (
                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-2 text-[10px] text-white/20 italic">
                                                    <History className="w-3 h-3" />
                                                    Snapshot captured
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Restore project to this specific version? All unsaved changes will be lost.')) {
                                                            restoreCheckpoint(msg.checkpointId!);
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-[10px] font-bold border border-indigo-500/20"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    Restore to Here
                                                </button>
                                            </div>
                                        )}

                                        {/* Show granular file edits like Cursor */}
                                        {msg.content.includes('### FILE:') && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                                    <Wand2 className="w-3 h-3" />
                                                    Implementation complete
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {extractEditedFiles(msg.content).map((file, idx) => (
                                                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-[11px] font-medium text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors">
                                                            <FileCode className="w-3 h-3 text-indigo-400/70" />
                                                            {file}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {currentPlan && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex gap-4 p-4 rounded-xl bg-indigo-600/5 border border-indigo-500/10 shadow-lg"
                        >
                            <div className="w-10 h-10 rounded-full bg-indigo-600/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                <Terminal className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <Zap className="w-3 h-3" />
                                    Active Task: {mode.toUpperCase()}
                                </p>
                                <p className="text-[13px] text-white/60 italic leading-snug">{currentPlan}</p>
                            </div>
                        </motion.div>
                    )}

                    {isGenerating && !currentPlan && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                            </div>
                            <div className="bg-white/5 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <span className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <span className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/[0.01] border-t border-white/5">
                <div className="relative group bg-[#141418] rounded-2xl border border-white/10 focus-within:border-indigo-500/50 transition-all">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={`Talk to the ${mode} agent...`}
                        className="w-full bg-transparent p-4 pr-12 text-[13px] text-white placeholder-white/10 focus:outline-none resize-none min-h-[60px] max-h-[200px]"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-1">
                        <button className="p-2 text-white/10 hover:text-white/30 transition-colors">
                            <Paperclip className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => handleSend()}
                            disabled={isGenerating || !input.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 p-2 rounded-xl transition-all shadow-lg"
                        >
                            <Send className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
