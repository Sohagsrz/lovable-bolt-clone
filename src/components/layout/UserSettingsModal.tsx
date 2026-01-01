'use client';

import React, { useState } from 'react';
import {
    X, User, Settings, CreditCard, Shield, Bell,
    Moon, Globe, LogOut, ChevronRight, Zap,
    Smartphone, Mail, Lock, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'next-auth/react';

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        plan?: string;
    };
}

export const UserSettingsModal = ({ isOpen, onClose, user }: UserSettingsModalProps) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'billing' | 'notifications'>('profile');

    if (!isOpen) return null;

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'account', label: 'Account', icon: Lock },
        { id: 'billing', label: 'Billing', icon: CreditCard },
        { id: 'notifications', label: 'Alerts', icon: Bell },
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#000]/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full max-w-4xl h-[600px] bg-[#0a0a0c] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex"
            >
                {/* Sidebar */}
                <div className="w-64 border-r border-white/5 bg-white/[0.01] flex flex-col p-6">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 font-black italic">
                            B
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white leading-none">Settings</h2>
                            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1">Control Center</p>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${activeTab === tab.id
                                        ? 'bg-white/5 text-white'
                                        : 'text-white/30 hover:text-white/50 hover:bg-white/[0.02]'
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-400' : ''}`} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto pt-6 border-t border-white/5">
                        <button
                            onClick={() => signOut()}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black text-red-400 hover:bg-red-400/10 transition-all mb-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-xl font-black text-white">
                            {tabs.find(t => t.id === activeTab)?.label} Settings
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors group">
                            <X className="w-5 h-5 text-white/20 group-hover:text-white" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {activeTab === 'profile' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center gap-6 p-6 rounded-[24px] bg-white/[0.02] border border-white/5">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-[32px] bg-indigo-600/10 border-2 border-dashed border-indigo-500/30 flex items-center justify-center overflow-hidden">
                                            {user.image ? (
                                                <img src={user.image} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-10 h-10 text-indigo-400" />
                                            )}
                                        </div>
                                        <button className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                            <Settings className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-black text-white mb-1">{user.name || 'Anonymous User'}</h4>
                                        <p className="text-sm text-white/40 font-medium mb-4">{user.email}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-full bg-indigo-600/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-600/20">
                                                {user.plan || 'Free'} Plan
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Zap className="w-5 h-5 text-yellow-400" />
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Active Status</span>
                                        </div>
                                        <h5 className="font-black text-white text-sm">Pro Builder Access</h5>
                                        <p className="text-[11px] text-white/30 font-medium leading-relaxed">Early access to production deployment engines enabled.</p>
                                    </div>
                                    <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Shield className="w-5 h-5 text-indigo-400" />
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Trust Store</span>
                                        </div>
                                        <h5 className="font-black text-white text-sm">Verified Developer</h5>
                                        <p className="text-[11px] text-white/30 font-medium leading-relaxed">GitHub integration and identity verified successfully.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Personal Information</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-white/40 ml-1">Full Name</label>
                                            <input type="text" defaultValue={user.name || ''} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-white/40 ml-1">Email Address</label>
                                            <input type="email" defaultValue={user.email || ''} readOnly className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/40 cursor-not-allowed focus:outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="p-8 rounded-[32px] bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                        <Zap className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10 space-y-6">
                                        <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">Current Plan</span>
                                        <h4 className="text-3xl font-black">{user.plan || 'Free'} Developer</h4>
                                        <p className="text-white/70 text-sm max-w-sm font-medium">Enjoy infinite project sandboxes and basic AI architect capabilities.</p>
                                        <button className="px-6 py-3 bg-white text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
                                            Upgrade to Pro
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Service Usage</h4>
                                    <div className="p-6 rounded-[24px] bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-white font-black text-sm">Credits Remaining</p>
                                                <p className="text-white/40 text-[11px]">Resets in 12 days</p>
                                            </div>
                                            <span className="text-2xl font-black text-indigo-400">84%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full w-[84%] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
