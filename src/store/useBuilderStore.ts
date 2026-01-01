import { create } from 'zustand';

interface FileNode {
    path: string;
    content: string;
    type: 'file' | 'directory';
}

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
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
    setProjectName: (name: string) => void;

    setFiles: (files: FileNode[]) => void;
    updateFile: (path: string, content: string) => void;
    upsertFile: (path: string, content: string) => void;
    setActiveFile: (path: string | null) => void;
    addMessage: (message: Message) => void;
    updateLastMessageContent: (content: string) => void;
    setGenerating: (status: boolean) => void;
    setPlan: (plan: string | null) => void;
    setPlanSteps: (steps: PlanStep[]) => void;
    updatePlanStep: (id: string, updates: Partial<PlanStep>) => void;
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

    setProject: (id, name, files, messages) => set({
        projectId: id,
        projectName: name,
        files: files,
        messages: messages,
        activeFile: files.length > 0 ? files[0].path : null,
        currentPlan: null,
        planSteps: []
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
        planSteps: []
    }),

    getFileContent: (path) => {
        return get().files.find(f => f.path === path)?.content;
    }
}));
