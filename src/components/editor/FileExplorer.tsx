'use client';

import React from 'react';
import { FileCode, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { useBuilderStore } from '@/store/useBuilderStore';

interface TreeFile {
    path: string;
    name: string;
    type: 'file';
}

interface TreeFolder {
    name: string;
    type: 'directory';
    children: (TreeFile | TreeFolder)[];
}

type TreeItem = TreeFile | TreeFolder;

export const FileExplorer = () => {
    const { files, activeFile, setActiveFile, pendingFiles } = useBuilderStore();
    const [openFolders, setOpenFolders] = React.useState<Set<string>>(new Set(['src', 'components', 'lib', 'app']));

    const toggleFolder = (path: string) => {
        const next = new Set(openFolders);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        setOpenFolders(next);
    };

    // Convert flat paths to tree
    const buildTree = (): TreeFolder => {
        const root: TreeFolder = { name: 'root', type: 'directory', children: [] };

        files.forEach(file => {
            const parts = file.path.split('/');
            let current = root;

            parts.forEach((part, i) => {
                const isLast = i === parts.length - 1;
                const pathSoFar = parts.slice(0, i + 1).join('/');

                if (isLast) {
                    current.children.push({ name: part, path: file.path, type: 'file' });
                } else {
                    let folder = current.children.find(c => c.type === 'directory' && c.name === part) as TreeFolder;
                    if (!folder) {
                        folder = { name: part, type: 'directory', children: [] };
                        current.children.push(folder);
                    }
                    current = folder;
                }
            });
        });

        return root;
    };

    const renderTree = (items: TreeItem[], depth = 0, parentPath = '') => {
        // Sort: folders first, then files alphabetically
        const sorted = [...items].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        return sorted.map((item) => {
            const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;
            const isFolder = item.type === 'directory';

            if (isFolder) {
                const isOpen = openFolders.has(currentPath);
                return (
                    <div key={currentPath}>
                        <button
                            onClick={() => toggleFolder(currentPath)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-white/40 hover:bg-white/5 hover:text-white/70 transition-all group"
                            style={{ paddingLeft: `${depth * 12 + 12}px` }}
                        >
                            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <Folder className="w-3.5 h-3.5 text-indigo-400/50 group-hover:text-indigo-400" />
                            <span className="truncate flex-1 text-left font-medium">{item.name}</span>
                        </button>
                        {isOpen && renderTree(item.children, depth + 1, currentPath)}
                    </div>
                );
            } else {
                const isActive = activeFile === item.path;
                const isPending = pendingFiles.some(pf => pf.path === item.path);

                return (
                    <button
                        key={item.path}
                        onClick={() => setActiveFile(item.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] transition-all group relative ${isActive
                                ? 'bg-indigo-600/10 text-indigo-400 font-bold'
                                : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                            }`}
                        style={{ paddingLeft: `${depth * 12 + 25}px` }}
                    >
                        <FileCode className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-white/10 group-hover:text-white/30'}`} />
                        <span className="truncate text-left flex-1">{item.name}</span>
                        {isPending && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse shrink-0" />
                        )}
                    </button>
                );
            }
        });
    };

    const tree = buildTree();

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c] border-r border-white/5 overflow-hidden">
            <div className="h-12 border-b border-white/5 flex items-center px-4 bg-white/[0.01]">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Live Explorer</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                {files.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mb-2">Workspace Empty</p>
                        <p className="text-[11px] text-white/10 leading-relaxed italic">Start a conversation to generate code.</p>
                    </div>
                ) : renderTree(tree.children)}
            </div>
        </div>
    );
};
