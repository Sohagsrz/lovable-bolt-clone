'use client';

import React from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle, Loader2, Zap } from 'lucide-react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { motion, AnimatePresence } from 'framer-motion';

interface PlanStep {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    details?: string;
}

export const PlanPane = () => {
    const { currentPlan, planSteps } = useBuilderStore();

    const getStatusIcon = (status: PlanStep['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-green-400" />;
            case 'in-progress':
                return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-400" />;
            default:
                return <Circle className="w-5 h-5 text-white/20" />;
        }
    };

    const getStatusColor = (status: PlanStep['status']) => {
        switch (status) {
            case 'completed':
                return 'border-green-500/20 bg-green-500/5';
            case 'in-progress':
                return 'border-indigo-500/50 bg-indigo-500/10';
            case 'error':
                return 'border-red-500/20 bg-red-500/5';
            default:
                return 'border-white/5 bg-white/[0.02]';
        }
    };

    return (
        <div className="w-full h-full bg-[#0a0a0c] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#0e0e11]">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                        Execution Plan
                    </span>
                </div>
                {planSteps && planSteps.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] font-bold text-white/30">
                            {planSteps.filter(s => s.status === 'completed').length} / {planSteps.length}
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {!planSteps || planSteps.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600/5 border border-indigo-500/10 flex items-center justify-center mb-6">
                            <Zap className="w-8 h-8 text-indigo-400/50" />
                        </div>
                        <h3 className="text-white/80 font-bold mb-2 text-sm uppercase tracking-widest">
                            Planning Mode
                        </h3>
                        <p className="text-white/20 text-[12px] max-w-xs font-medium leading-relaxed">
                            The AI will create a detailed execution plan before implementing changes.
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {planSteps.map((step, index) => (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`border rounded-xl p-4 ${getStatusColor(step.status)} transition-all`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {getStatusIcon(step.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                Step {index + 1}
                                            </span>
                                            {step.status === 'in-progress' && (
                                                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full">
                                                    IN PROGRESS
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-[13px] font-bold text-white/90 mb-1">
                                            {step.title}
                                        </h4>
                                        <p className="text-[12px] text-white/60 leading-relaxed">
                                            {step.description}
                                        </p>
                                        {step.details && (
                                            <div className="mt-2 p-2 bg-black/20 rounded-lg border border-white/5">
                                                <p className="text-[11px] text-white/50 font-mono">
                                                    {step.details}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}

                {currentPlan && (
                    <div className="mt-4 p-4 rounded-xl bg-indigo-600/5 border border-indigo-500/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                Current Task
                            </span>
                        </div>
                        <p className="text-[12px] text-white/70 leading-relaxed italic">
                            {currentPlan}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
