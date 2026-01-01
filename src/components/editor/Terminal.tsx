'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
    id: string;
    isActive?: boolean;
    onReady?: (terminal: XTerm) => void;
    className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ id, isActive, onReady, className }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Create terminal instance
        const term = new XTerm({
            cursorBlink: true,
            fontSize: 12,
            lineHeight: 1.2,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#0a0a0c',
                foreground: '#a1a1aa',
                cursor: '#6366f1',
                selectionBackground: 'rgba(99, 102, 241, 0.3)'
            },
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        fitAddonRef.current = fitAddon;

        // Open terminal in element
        term.open(terminalRef.current);

        requestAnimationFrame(() => {
            try {
                fitAddon.fit();
            } catch (e) {
                console.warn('XTerm fit failed:', e);
            }
        });

        xtermRef.current = term;
        if (id) {
            (window as any)[`term_${id}`] = term;
        }

        if (onReady) {
            onReady(term);
        }

        const handleResize = () => {
            try {
                fitAddon.fit();
            } catch (e) { }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            xtermRef.current = null;
            fitAddonRef.current = null;
        };
    }, [id, onReady]);

    // Handle visibility changes
    useEffect(() => {
        if (isActive && fitAddonRef.current) {
            requestAnimationFrame(() => {
                fitAddonRef.current?.fit();
            });
        }
    }, [isActive]);

    return <div ref={terminalRef} className={`w-full h-full ${className}`} />;
};
