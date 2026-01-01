'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Paperclip, Loader2, BrainCircuit, Terminal, Zap, Shield, Wand2, Rocket, CheckCircle2, FileCode, Check, X, RotateCcw, History, ChevronDown, ChevronRight, ClipboardCheck, AlertTriangle, RefreshCcw, Crown, ArrowRight } from 'lucide-react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseAIResponse } from '@/lib/parser';
import { generateProjectIndex } from '@/lib/indexer';
import { ToolService } from '@/services/ToolService';

import { useRouter } from "next/navigation";

type AgentMode = 'build' | 'fix' | 'refactor' | 'ui' | 'deploy';

/**
 * Clean internal AI architecture payloads while preserving the narrative
 */
const cleanAIMessage = (text: string) => {
    return text
        .replace(/<bolt_plan>[\s\S]*?<\/bolt_plan>/gi, '') // Remove structured plan tags
        .replace(/<bolt_tool[\s\S]*?<\/bolt_tool>/gi, '') // Remove tool call tags
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
        restoreCheckpoint, deleteCheckpoint, activeFile
    } = useBuilderStore();
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<AgentMode>('build');
    const [lastError, setLastError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const summarizeHistory = async (msgs: any[]) => {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'Summarize the following developer conversation. Focus on key decisions, implemented features, and project state. Keep it under 300 words.' },
                        ...msgs
                    ],
                    mode: 'fix' // Use a fast mode for summarization
                })
            });
            if (!response.ok) return null;
            const data = await response.json(); // Assuming the endpoint returns a JSON if not streaming or we handle stream
            // Since our /api/chat is streaming, we might need a non-streaming version or handle stream.
            // For now, let's assume we can get the full text.
            return data.content;
        } catch { return null; }
    };

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
            let currentMessages = [
                { role: 'system' as const, content: '' }, // Master Architectural Protocol
                ...messages,
                {
                    role: 'user' as const,
                    content: `[ARCHITECTURAL OBJECTIVE]: ${textToSend}\n\n[CONTEXT]: Please apply elite UI/UX standards, ensure production-ready code, and prioritize visual excellence in your implementation.`
                }
            ];

            let hasMoreThinking = true;
            let turns = 0;
            const maxTurns = 3;

            while (hasMoreThinking && turns < maxTurns) {
                turns++;
                const projectContext = generateProjectIndex(files);
                const systemPrompt = `You are BOLT STUDIO, an elite AI architectural engineer and UI/UX designer. Your mission is to build stunning, production-ready web applications that redefine modern aesthetics.

# ENVIRONMENT & STATE:
- Local Time: ${new Date().toLocaleString()}
- Active Document: ${activeFile || 'None'}
- Workspace: Browser-based Isolated Node.js (WebContainer)

# MASTER DESIGN DIRECTIVES:
1. **Visual WOW**: Use curated HSL palettes, glassmorphism (backdrop-blur), and sophisticated dark modes.
2. **Typography**: Force modern fonts (Inter, Outfit) with intentional tracking/leading.
3. **Motion**: Mandatory micro-animations and smooth transitions (Framer Motion preferred).
4. **Assets**: No broken placeholders. Use Unsplash: \`https://images.unsplash.com/photo-<ID>?auto=format&fit=crop&q=80&w=1200\` or categories: \`https://images.unsplash.com/featured/?<TAG>\`.
5. **Quality**: Semantic HTML5, explicit SEO tagging, and baseline accessibility on every component.

# BOOTSTRAP PROTOCOL (CRITICAL):
If the WORKSPACE INDEX is empty or missing a \`package.json\`, your FIRST ACTION must be to scaffold the project and establish a professional file structure.
- **Scaffold**: Use \`<bolt_tool type="shell">npm create vite@latest . -- --template react-ts</bolt_tool>\` or similar.
- **Standard Hierarchy**: Establish directories for \`src/components\`, \`src/lib\`, \`src/hooks\`, \`src/store\`, and \`src/styles\`.
- **Infrastructure**: Immediately install essential dev dependencies (\`tailwindcss\`, \`framer-motion\`, \`lucide-react\`).
- **Phase 1 Complete**: Only proceed to feature implementation ONCE the standard architectural skeleton is established.

# PROTOCOL:
1. **Summary**: Technical rationale & design philosophy.
2. **Plan**: Wrap in <bolt_plan> with concise <step /> tags.
3. **Execution**:
   - Files: "### FILE: path/to/file" with full, unabridged code.
   - Tools: <bolt_tool type="...">description\ncontent</bolt_tool>
     - Types: 'shell' (sh), 'npm' (package names only), 'search' (grep), 'readDir' (ls), 'find' (glob), 'webRead' (curl), 'webSearch' (ddg), 'deleteFile' (rm).

# SYSTEM CONTEXT PROTOCOL:
1. **Zero-Waiting**: Do not ask for user confirmation before starting tool executions or file writes. Proceed immediately to implementation.
2. **Immediate Volition**: Start your first implementation turn (\`bolt_tool\`) in your very first response. Do not provide a theoretical plan without starting the actual work.
3. **Lead Engineer Mandate**: You are the architect. In the absence of specific user instructions, make the most elite technical decisions for them. Do not defer to the user for basic structural choices.

STRICT RULE: Focus on one-shot perfection. Be technical, decisive, and aesthetically elite. DO NOT ASK FOR PERMISSION TO BUILD. JUST BUILD.`;

                currentMessages[0].content = systemPrompt;

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: currentMessages,
                        mode: mode
                    })
                });

                if (response.status === 403) {
                    const errorData = await response.json().catch(() => ({}));
                    if (errorData.message === 'Usage limit reached') {
                        setLastError('usage_limit');
                        setGenerating(false);
                        addMessage({
                            role: 'assistant',
                            content: "You've reached your architect's limit. Please upgrade to Pro to continue building groundbreaking applications."
                        });
                        return;
                    }
                }

                if (!response.ok) throw new Error('Failed to fetch AI');
                if (!response.body) throw new Error('No response body');

                setPlan(null);

                // Add a new assistant message for EVERY turn of the AI
                // This ensures we dont overwrite tool logs or previous turns
                addMessage({
                    role: 'assistant',
                    content: '',
                    checkpointId: turns === 1 ? checkpointId : undefined
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let done = false;
                let turnContent = '';
                let planExtracted = false;

                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    const chunkValue = decoder.decode(value, { stream: !done });
                    turnContent += chunkValue;
                    updateLastMessageContent(turnContent);

                    // Extract plan as it streams
                    if (!planExtracted && turnContent.includes('</bolt_plan>')) {
                        const steps = extractPlanSteps(turnContent);
                        if (steps.length > 0) {
                            setPlanSteps(steps);
                            planExtracted = true;
                            updatePlanStep(steps[0].id, { status: 'in-progress' });
                        }
                    }

                    // Incremental file parsing
                    const changes = parseAIResponse(turnContent);
                    if (changes && changes.length > 0) {
                        changes.forEach((change: any) => {
                            useBuilderStore.getState().setPendingFile(change.path, change.content);
                        });
                    }
                }

                // Final turn processing
                const steps = extractPlanSteps(turnContent);
                if (steps.length > 0) {
                    setPlanSteps(steps.map(s => ({ ...s, status: 'completed' })));
                }

                // Apply file changes (IMPORTANT: This was missing!)
                const changes = parseAIResponse(turnContent);
                if (changes.length > 0) {
                    const { upsertFile } = useBuilderStore.getState();
                    changes.forEach(change => {
                        upsertFile(change.path, change.content);
                    });
                }

                // Process tool calls
                const toolCalls = ToolService.parseToolCalls(turnContent);
                if (toolCalls.length > 0) {
                    console.log(`[Agent Loop] turn ${turns}: Found ${toolCalls.length} tool calls...`);
                    let toolResultsContext = "\n\n**ENVIRONMENT DATA RETRIEVED:**\n";
                    for (const tool of toolCalls) {
                        try {
                            const result = await ToolService.execute(tool);
                            toolResultsContext += `\n> [Tool: ${tool.description}]\n${result}\n`;
                        } catch (err) {
                            toolResultsContext += `\n> [Tool Error: ${tool.description}]\n${err}\n`;
                        }
                    }

                    const toolMessage = { role: 'system' as const, content: toolResultsContext };
                    addMessage(toolMessage);

                    // Update messages for next turn
                    currentMessages = [...currentMessages, { role: 'assistant', content: turnContent }, toolMessage];
                    hasMoreThinking = true;
                } else {
                    hasMoreThinking = false;

                    // Final finish / Broadcast
                    const totalChanges = changes.length;
                    if (totalChanges > 0 || mode === 'build') {
                        window.dispatchEvent(new CustomEvent('bolt-project-ready', {
                            detail: { count: totalChanges }
                        }));
                    }

                    const currentFiles = useBuilderStore.getState().files;
                    autoSaveProject(projectName, currentFiles, [...currentMessages, { role: 'assistant', content: turnContent }]);
                }
            }

        } catch (error) {
            console.error(error);
            setPlan(null);
            setLastError('connection');
            addMessage({
                role: 'assistant',
                content: "Lost connection to the brain. Please try again."
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleRetry = () => {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
            setLastError(null);
            handleSend(lastUserMsg.content);
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
                {/* Starter Suggestions for Fresh Projects */}
                {messages.length === 1 && !isGenerating && (
                    <div className="py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20">
                                <Rocket className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-white text-[11px] font-black uppercase tracking-[2px]">Quick Start Architects</h3>
                                <p className="text-white/20 text-[9px] font-medium tracking-tight mt-0.5 uppercase">Select a blueprint to begin your masterwork</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { title: 'SaaS Platform', icon: Crown, color: 'indigo', prompt: 'Build a premium SaaS landing page with a hero section, feature grid, and pricing table. Use a high-end dark theme with glassmorphism, Inter typography, and sleek animations.' },
                                { title: 'AI Dashboard', icon: BrainCircuit, color: 'purple', prompt: 'Architect a data-driven AI analytics dashboard. Include a sidebar navigation, metric cards with real-time-like charts, and an activity log. Use a refined dark UI with indigo accents.' },
                                { title: 'Design Portfolio', icon: Wand2, color: 'rose', prompt: 'Create an elite creative portfolio for an architectural designer. Focus on high-impact visual grids, smooth scroll animations, and a minimalist premium aesthetic.' },
                                { title: 'E-commerce Hub', icon: Zap, color: 'amber', prompt: 'Build a boutique e-commerce storefront for high-end luxury goods. Implement a product grid, cart preview, and elegant checkout flow with premium typography.' }
                            ].map((starter, idx) => {
                                const Icon = starter.icon;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (starter.title.includes('AI') || starter.title.includes('Dashboard')) setMode('build');
                                            handleSend(starter.prompt);
                                        }}
                                        className="group relative text-left p-4 rounded-[20px] bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-10 h-10 rounded-2xl bg-${starter.color}-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                                                <Icon className={`w-5 h-5 text-${starter.color}-400`} />
                                            </div>
                                            <div>
                                                <h4 className="text-[12px] font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{starter.title}</h4>
                                                <p className="text-[10px] text-white/30 leading-relaxed mt-1 line-clamp-2">{starter.prompt}</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="w-3.5 h-3.5 text-white/20" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

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

                                        {/* Tool Activity Logs */}
                                        {msg.role === 'assistant' && msg.content.includes('<bolt_tool') && (
                                            <div className="mt-2 space-y-1">
                                                {ToolService.parseToolCalls(msg.content).map((tool, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-indigo-300">
                                                        <Zap className="w-3 h-3 text-indigo-400" />
                                                        <span className="font-bold uppercase tracking-tight opacity-60">{tool.type}</span>
                                                        <span className="flex-1 truncate italic">{tool.description}</span>
                                                        <div className="flex items-center gap-1.5 ml-2">
                                                            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                                                            <span className="font-black uppercase tracking-widest text-[8px] opacity-40">Active</span>
                                                        </div>
                                                    </div>
                                                ))}
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

                                        {i === messages.length - 1 && lastError && (
                                            <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                                <div className="flex items-center gap-3 text-rose-400 mb-3">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span className="text-[11px] font-black uppercase tracking-widest">
                                                        {lastError === 'usage_limit' ? 'Quota Exceeded' : 'Connection Interrupted'}
                                                    </span>
                                                </div>

                                                {lastError === 'usage_limit' ? (
                                                    <button
                                                        onClick={() => router.push('/pricing')}
                                                        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                                                    >
                                                        Upgrade to Pro
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleRetry}
                                                        className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[11px] font-black uppercase tracking-widest transition-all border border-white/10"
                                                    >
                                                        <RefreshCcw className="w-3.5 h-3.5" />
                                                        Try Again
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Post-Architectural Broadcast HUD */}
                                        {msg.role === 'assistant' && msg.content.includes('### FILE:') && i === messages.length - 1 && !isGenerating && (
                                            <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                        Architectural Broadcast
                                                    </div>
                                                    <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                                        Synced to Production
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {extractEditedFiles(msg.content).map((file, idx) => (
                                                        <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-bold text-white/40 hover:text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all group cursor-default">
                                                            <FileCode className="w-3.5 h-3.5 text-indigo-500/50 group-hover:text-indigo-400" />
                                                            {file}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Legacy inline file list (only if NOT the last message broadcast) */}
                                        {msg.content.includes('### FILE:') && (i !== messages.length - 1 || isGenerating) && (
                                            <div className="mt-4 pt-4 border-t border-white/5 opacity-40 italic">
                                                <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-white/30 uppercase tracking-widest">
                                                    <Wand2 className="w-3 h-3" />
                                                    Implementation Summary
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {extractEditedFiles(msg.content).map((file, idx) => (
                                                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-[11px] font-medium text-white/30">
                                                            <FileCode className="w-3 h-3" />
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
