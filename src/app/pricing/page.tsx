'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Rocket, Shield, Crown, Star, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

const PricingCard = ({
    title,
    price,
    description,
    features,
    isPopular,
    icon: Icon = Star,
    buttonText,
    color
}: any) => {
    const router = useRouter();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className={`relative p-8 rounded-3xl bg-[#141418] border ${isPopular ? 'border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.15)]' : 'border-white/5'} flex flex-col h-full overflow-hidden group`}
        >
            {isPopular && (
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-xl">
                    Most Popular
                </div>
            )}

            <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center mb-6`}>
                <Icon className={`w-6 h-6 text-${color}-400`} />
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">{title}</h3>
            <p className="text-sm text-white/40 mb-6 leading-relaxed">{description}</p>

            <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">${price}</span>
                <span className="text-white/20 text-sm">/month</span>
            </div>

            <div className="space-y-4 mb-10 flex-1">
                {features.map((feature: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-white/60">
                        <div className="mt-1 shrink-0 w-4 h-4 rounded-full bg-white/5 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-indigo-400" />
                        </div>
                        <span className="leading-tight">{feature}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={() => router.push('/auth/signup')}
                className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${isPopular
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10'}`}
            >
                {buttonText}
                <ArrowRight className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export default function PricingPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/30 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 relative z-10 backdrop-blur-sm bg-[#0a0a0c]/80">
                <div
                    onClick={() => router.push('/')}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6 text-white fill-current" />
                    </div>
                    <span className="text-lg font-black tracking-[0.3em] uppercase hidden sm:block">Bolt Studio</span>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-24 relative z-10">
                {/* Hero section */}
                <div className="text-center mb-24 max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-8"
                    >
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        Transparent Pricing
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-8 leading-[0.9]"
                    >
                        Upgrade Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">Architectural</span> Intelligence
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-white/40 leading-relaxed font-medium"
                    >
                        Choose the plan that suits your development style. From solo architects to elite engineering teams.
                    </motion.p>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                    <PricingCard
                        title="Free"
                        price="0"
                        color="zinc"
                        description="Perfect for exploring the studio and building simple prototypes."
                        buttonText="Get Started"
                        features={[
                            "3 Projects per month",
                            "Basic AI Assistance",
                            "Standard Terminal Access",
                            "Community Support",
                            "1GB Workspace Storage"
                        ]}
                    />
                    <PricingCard
                        title="Pro"
                        price="19"
                        color="indigo"
                        isPopular={true}
                        description="For power users who need high-octane AI and unlimited projects."
                        buttonText="Upgrade to Pro"
                        features={[
                            "Unlimited Projects",
                            "Unlimited AI Architecture (Legacy)",
                            "Elite Tooling Access (Shell, NPM)",
                            "Fastest Response Times",
                            "Custom Domain Support",
                            "Priority Discord Support",
                            "10GB Workspace Storage"
                        ]}
                        icon={Crown}
                    />
                    <PricingCard
                        title="Enterprise"
                        price="89"
                        color="purple"
                        description="Custom solutions for organizations requiring elite security and support."
                        buttonText="Contact Sales"
                        features={[
                            "Everything in Pro",
                            "Single Sign-On (SSO)",
                            "Unlimited Storage",
                            "Dedicated Success Manager",
                            "Custom SLA & Security Docs",
                            "On-premise Deployment Options"
                        ]}
                        icon={Shield}
                    />
                </div>

                {/* FAQ or Bottom CTA */}
                <div className="p-12 rounded-[32px] bg-gradient-to-r from-indigo-600 to-purple-600 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700">
                        <Rocket className="w-64 h-64 text-white rotate-45" />
                    </div>
                    <div className="relative z-10 max-w-xl">
                        <h2 className="text-4xl font-black uppercase tracking-tight text-white mb-6">Ready to Build the Future?</h2>
                        <p className="text-white/80 mb-8 font-medium">Join 50,000+ architects building groundbreaking applications with Bolt Studio.</p>
                        <button
                            className="px-8 py-4 bg-white text-indigo-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/20"
                        >
                            Start Building Now
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-indigo-500 fill-current" />
                        <span className="text-sm font-black uppercase tracking-widest text-white/40">© 2026 Bolt Studio Inc.</span>
                    </div>
                    <div className="flex items-center gap-8 opacity-40 hover:opacity-100 transition-opacity">
                        <a href="#" className="text-xs font-bold uppercase tracking-widest hover:text-indigo-400">Privacy</a>
                        <a href="#" className="text-xs font-bold uppercase tracking-widest hover:text-indigo-400">Terms</a>
                        <a href="#" className="text-xs font-bold uppercase tracking-widest hover:text-indigo-400">Status</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
