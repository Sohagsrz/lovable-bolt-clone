'use client';

import React, { useState } from 'react';
import { Rocket, Globe, Shield, Zap, CheckCircle2, Loader2, X, ExternalLink, ChevronRight, Server, Clock, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DeployModal = ({ isOpen, onClose, projectName }: { isOpen: boolean, onClose: () => void, projectName: string }) => {
    const [step, setStep] = useState<'config' | 'deploying' | 'success'>('config');
    const [isDeploying, setIsDeploying] = useState(false);

    const handleDeploy = () => {
        setIsDeploying(true);
        setStep('deploying');
        // Simulated deployment sequence
        setTimeout(() => setStep('success'), 5000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000]/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl bg-[#0a0a0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                            <Rocket className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-none mb-1">Deploy Production Instance</h2>
                            <p className="text-[11px] text-white/30 font-bold uppercase tracking-[0.1em]">Cloud Infrastructure Engine</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/30" />
                    </button>
                </div>

                <div className="p-8">
                    {step === 'config' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <section className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                    </div>
                                    <h3 className="font-bold text-sm mb-1 text-white/80 group-hover:text-white transition-colors">Edge Deployment</h3>
                                    <p className="text-[11px] text-white/20 font-medium leading-relaxed">Serverless delivery via global edge network (Fastest).</p>
                                </section>

                                <section className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 opacity-50 cursor-not-allowed">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/30">
                                            <Server className="w-4 h-4" />
                                        </div>
                                        <div className="w-3 h-3 rounded-full bg-white/10" />
                                    </div>
                                    <h3 className="font-bold text-sm mb-1 text-white/30">Dedicated VPS</h3>
                                    <p className="text-[11px] text-white/10 font-medium leading-relaxed">Persistent server instance with Docker (Pro feature).</p>
                                </section>
                            </div>

                            <div className="space-y-4">
                                <label className="block">
                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 block">Site Name</span>
                                    <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                                        <input
                                            type="text"
                                            defaultValue={projectName.toLowerCase().replace(/\s+/g, '-')}
                                            className="bg-transparent text-sm text-white/80 outline-none flex-1 font-medium"
                                        />
                                        <span className="text-white/20 text-xs font-bold">.bolt.studio</span>
                                    </div>
                                </label>

                                <div className="p-4 rounded-2xl bg-indigo-600/5 border border-indigo-500/10 flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 shrink-0">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-bold text-indigo-400/80 mb-1">Enterprise Security Enabled</h4>
                                        <p className="text-[11px] text-white/30 leading-relaxed">HTTPS, DDoS protection, and isolation firewalls are automatically configured for this build.</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleDeploy}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3"
                            >
                                <Rocket className="w-5 h-5" />
                                Start Production Build
                            </button>
                        </div>
                    )}

                    {step === 'deploying' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-8">
                            <div className="relative">
                                <div className="w-24 h-24 border-4 border-white/5 border-t-indigo-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Rocket className="w-8 h-8 text-indigo-400 animate-pulse" />
                                </div>
                            </div>

                            <div className="text-center space-y-4 max-w-sm">
                                <h3 className="text-xl font-bold text-white">Synthesizing Infrastructure</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[10px] text-white/20 font-bold uppercase tracking-widest">
                                        <span>Status</span>
                                        <span className="text-indigo-400">Optimizing Assets</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '80%' }}
                                            transition={{ duration: 5 }}
                                            className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 pt-4">
                                    {[
                                        { t: 'Compiling project source', s: 'done' },
                                        { t: 'Running global health checks', s: 'done' },
                                        { t: 'Provisioning edge nodes', s: 'running' },
                                    ].map((l, i) => (
                                        <div key={i} className="flex items-center gap-3 text-left">
                                            {l.s === 'done' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                                            <span className={`text-[12px] font-bold tracking-tight ${l.s === 'done' ? 'text-white/40' : 'text-white/80'}`}>{l.t}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center text-green-500 border border-green-500/20 mb-2">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-white">System Online</h3>
                                <p className="text-white/30 text-sm max-w-xs font-medium">Your application is now live on the global edge network.</p>
                            </div>

                            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                            <Globe className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.1em]">Production URL</p>
                                            <p className="text-sm font-bold text-white/90">{projectName.toLowerCase().replace(/\s+/g, '-')}.bolt.studio</p>
                                        </div>
                                    </div>
                                    <a
                                        href="#"
                                        onClick={(e) => e.preventDefault()}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all shadow-lg"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-green-500" />
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Health: 100%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Built in 5.2s</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
