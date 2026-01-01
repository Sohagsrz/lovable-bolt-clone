'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
    id: string;
    onReady?: (terminal: XTerm) => void;
    className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ id, onReady, className }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Create terminal instance
        const term = new XTerm({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#0a0a0c',
                foreground: '#a1a1aa',
            },
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // Open terminal in element
        term.open(terminalRef.current);

        // Slight delay to ensure DOM is ready before fitting
        // We use requestAnimationFrame for better timing with layout
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
            // Debounce or just try-catch? Fit is usually cheap.
            try {
                fitAddon.fit();
            } catch (e) { }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
            xtermRef.current = null;
        };
    }, [onReady]);

    return <div ref={terminalRef} className={`w-full h-full ${className}`} />;
};
