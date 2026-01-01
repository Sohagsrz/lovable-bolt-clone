import { create } from 'zustand';

interface FileNode {
    path: string;
    content: string;
    type: 'file' | 'directory';
}

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    checkpointId?: string;
}

interface PlanStep {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    details?: string;
}

interface BuilderState {
    projectId: string | null;
    projectName: string;
    files: FileNode[];
    activeFile: string | null;
    messages: Message[];
    isGenerating: boolean;
    currentPlan: string | null;
    planSteps: PlanStep[];

    // Terminal state
    terminals: { id: string, name: string }[];
    activeTerminalId: string;
    addTerminal: (name?: string) => void;
    removeTerminal: (id: string) => void;
    setActiveTerminal: (id: string) => void;
    setProjectName: (name: string) => void;

    setFiles: (files: FileNode[]) => void;
    updateFile: (path: string, content: string) => void;
    upsertFile: (path: string, content: string) => void;
    renameFile: (oldPath: string, newPath: string) => void;
    deleteFile: (path: string) => void;
    setActiveFile: (path: string | null) => void;
    addMessage: (message: Message) => void;
    updateLastMessageContent: (content: string) => void;
    pendingFiles: { path: string, content: string }[];
    originalFiles: { path: string, content: string }[];
    setPendingFile: (path: string, content: string) => void;
    acceptChanges: (path?: string) => void;
    discardChanges: (path?: string) => void;
    checkpoints: { id: string, name: string, files: FileNode[], timestamp: number }[];
    addCheckpoint: (name: string) => string;
    restoreCheckpoint: (id: string) => void;
    deleteCheckpoint: (id: string) => void;
    updatePlanStep: (id: string, updates: Partial<PlanStep>) => void;
    setPreviewUrl: (url: string | null) => void;
    setProject: (id: string | null, name: string, files: FileNode[], messages: Message[]) => void;
    reset: () => void;

    // Helper to get file content
    getFileContent: (path: string) => string | undefined;
}

import { DEFAULT_PROJECT_FILES } from '@/lib/constants';

export const useBuilderStore = create<BuilderState>((set, get) => ({
    projectId: null,
    projectName: 'New Project',
    files: [],
    activeFile: null,
    messages: [
        {
            role: 'assistant',
            content: "Welcome to Bolt Studio! I'm your AI architect. I've initialized a production-ready Vite + React template for you. What shall we build next?",
        },
    ],
    isGenerating: false,
    currentPlan: null,
    planSteps: [],
    terminals: [{ id: 'term-1', name: 'Terminal' }],
    activeTerminalId: 'term-1',

    addTerminal: (name) => set((state) => {
        const id = `term-${Math.random().toString(36).substring(7)}`;
        return {
            terminals: [...state.terminals, { id, name: name || `Terminal ${state.terminals.length + 1}` }],
            activeTerminalId: id
        };
    }),

    removeTerminal: (id) => set((state) => {
        if (state.terminals.length <= 1) return state;
        const index = state.terminals.findIndex(t => t.id === id);
        const newTerminals = state.terminals.filter(t => t.id !== id);
        return {
            terminals: newTerminals,
            activeTerminalId: state.activeTerminalId === id
                ? newTerminals[Math.max(0, index - 1)].id
                : state.activeTerminalId
        };
    }),

    setActiveTerminal: (id) => set({ activeTerminalId: id }),

    setProjectName: (name) => set({ projectName: name }),

    setFiles: (files) => set({ files }),

    updateFile: (path, content) => set((state) => ({
        files: state.files.map((f) => f.path === path ? { ...f, content } : f)
    })),

    upsertFile: (path, content) => set((state) => {
        const existing = state.files.find(f => f.path === path);
        if (existing) {
            return {
                files: state.files.map((f) => f.path === path ? { ...f, content } : f)
            };
        }
        return {
            files: [...state.files, { path, content, type: 'file' }]
        };
    }),

    renameFile: (oldPath, newPath) => set((state) => ({
        files: state.files.map(f => f.path === oldPath ? { ...f, path: newPath } : f),
        activeFile: state.activeFile === oldPath ? newPath : state.activeFile,
        pendingFiles: state.pendingFiles.map(f => f.path === oldPath ? { ...f, path: newPath } : f),
        originalFiles: state.originalFiles.map(f => f.path === oldPath ? { ...f, path: newPath } : f)
    })),

    deleteFile: (path) => set((state) => ({
        files: state.files.filter(f => f.path !== path && !f.path.startsWith(`${path}/`)),
        activeFile: (state.activeFile === path || state.activeFile?.startsWith(`${path}/`)) ? null : state.activeFile,
        pendingFiles: state.pendingFiles.filter(f => f.path !== path && !f.path.startsWith(`${path}/`)),
        originalFiles: state.originalFiles.filter(f => f.path !== path && !f.path.startsWith(`${path}/`))
    })),

    setActiveFile: (path) => set({ activeFile: path }),

    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
    })),

    updateLastMessageContent: (content) => set((state) => {
        const messages = [...state.messages];
        if (messages.length > 0) {
            messages[messages.length - 1] = {
                ...messages[messages.length - 1],
                content
            };
        }
        return { messages };
    }),

    setGenerating: (status) => set({ isGenerating: status }),

    setPlan: (plan) => set({ currentPlan: plan }),

    setPlanSteps: (steps) => set({ planSteps: steps }),

    updatePlanStep: (id, updates) => set((state) => ({
        planSteps: state.planSteps.map((step) =>
            step.id === id ? { ...step, ...updates } : step
        )
    })),

    pendingFiles: [],
    originalFiles: [],

    setPendingFile: (path, content) => set((state) => {
        // Capture original if not already captured
        const hasOriginal = state.originalFiles.find(f => f.path === path);
        const originalContent = state.files.find(f => f.path === path)?.content || '';

        return {
            pendingFiles: [...state.pendingFiles.filter(f => f.path !== path), { path, content }],
            originalFiles: hasOriginal ? state.originalFiles : [...state.originalFiles, { path, content: originalContent }]
        };
    }),

    acceptChanges: (path) => set((state) => {
        const toAccept = path
            ? state.pendingFiles.filter(f => f.path === path)
            : state.pendingFiles;

        let newFiles = [...state.files];
        toAccept.forEach(pending => {
            const index = newFiles.findIndex(f => f.path === pending.path);
            if (index !== -1) {
                newFiles[index] = { ...newFiles[index], content: pending.content };
            } else {
                newFiles.push({ path: pending.path, content: pending.content, type: 'file' });
            }
        });

        return {
            files: newFiles,
            pendingFiles: path ? state.pendingFiles.filter(f => f.path !== path) : [],
            originalFiles: path ? state.originalFiles.filter(f => f.path !== path) : []
        };
    }),

    discardChanges: (path) => set((state) => ({
        pendingFiles: path ? state.pendingFiles.filter(f => f.path !== path) : [],
        originalFiles: path ? state.originalFiles.filter(f => f.path !== path) : []
    })),

    checkpoints: [],
    addCheckpoint: (name) => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
            checkpoints: [
                ...state.checkpoints,
                {
                    id,
                    name,
                    files: JSON.parse(JSON.stringify(state.files)),
                    timestamp: Date.now()
                }
            ]
        }));
        return id;
    },
    restoreCheckpoint: (id) => set((state) => {
        const cp = state.checkpoints.find(c => c.id === id);
        if (!cp) return state;
        return {
            files: JSON.parse(JSON.stringify(cp.files)),
            activeFile: cp.files.length > 0 ? cp.files[0].path : null
        };
    }),
    deleteCheckpoint: (id) => set((state) => ({
        checkpoints: state.checkpoints.filter(c => c.id !== id)
    })),

    previewUrl: null,
    setPreviewUrl: (url) => set({ previewUrl: url }),

    setProject: (id, name, files, messages) => set({
        projectId: id,
        projectName: name,
        files: files,
        messages: messages,
        activeFile: files.length > 0 ? files[0].path : null,
        currentPlan: null,
        planSteps: [],
        previewUrl: null,
        checkpoints: [],
        pendingFiles: [],
        originalFiles: [],
        terminals: [{ id: 'term-1', name: 'Terminal' }],
        activeTerminalId: 'term-1'
    }),

    reset: () => set({
        projectId: null,
        projectName: 'New Project',
        files: [],
        messages: [
            {
                role: 'assistant',
                content: "Welcome to Bolt Studio! Ready for a fresh start. What are we architecting?",
            },
        ],
        activeFile: null,
        isGenerating: false,
        currentPlan: null,
        planSteps: [],
        previewUrl: null,
        checkpoints: [],
        pendingFiles: [],
        originalFiles: [],
        terminals: [{ id: 'term-1', name: 'Terminal' }],
        activeTerminalId: 'term-1'
    }),

    getFileContent: (path) => {
        return get().files.find(f => f.path === path)?.content;
    }
}));
