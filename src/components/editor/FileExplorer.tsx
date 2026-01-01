'use client';

import React, { useMemo, useState } from 'react';
import { FileCode, Folder, ChevronRight, ChevronDown, Trash2, Pencil, Check, X, Plus, FilePlus, FolderPlus } from 'lucide-react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { calculateDiffStats } from '@/lib/diff';

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

const DiffBadge = ({ path }: { path: string }) => {
    const { pendingFiles, originalFiles } = useBuilderStore();
    const pending = pendingFiles.find(f => f.path === path);
    const original = originalFiles.find(f => f.path === path);

    if (!pending) return null;

    const stats = calculateDiffStats(original?.content || '', pending.content);

    return (
        <div className="flex items-center gap-1.5 ml-1">
            {stats.additions > 0 && (
                <span className="text-[9px] font-bold text-emerald-400">+{stats.additions}</span>
            )}
            {stats.deletions > 0 && (
                <span className="text-[9px] font-bold text-rose-400">-{stats.deletions}</span>
            )}
        </div>
    );
};

export const FileExplorer = () => {
    const { files, activeFile, setActiveFile, renameFile, deleteFile, upsertFile, pendingFiles, originalFiles } = useBuilderStore();
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['src', 'components', 'lib', 'app']));
    const [editingPath, setEditingPath] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const toggleFolder = (path: string) => {
        const next = new Set(openFolders);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        setOpenFolders(next);
    };

    const handleRename = (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingPath(path);
        setEditValue(path.split('/').pop() || '');
    };

    const submitRename = (oldPath: string) => {
        if (editValue && editValue !== oldPath.split('/').pop()) {
            const parts = oldPath.split('/');
            parts[parts.length - 1] = editValue;
            const newPath = parts.join('/');
            renameFile(oldPath, newPath);
        }
        setEditingPath(null);
    };

    const handleDelete = async (path: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete ${path}? This action is permanent.`)) {
            // Native FS deletion via ToolService or direct wc access
            try {
                const { ToolService } = await import('@/services/ToolService');
                await ToolService.execute({ type: 'deleteFile', content: path, description: `User deleted ${path}` });
            } catch (err) {
                // Fallback to store only if tool service fails
                deleteFile(path);
            }
        }
    };

    const handleCreateFile = (parentPath: string = '') => {
        const fileName = prompt('Enter file name:');
        if (fileName) {
            const path = parentPath ? `${parentPath}/${fileName}` : fileName;
            upsertFile(path, '');
            setActiveFile(path);
        }
    };

    // Convert flat paths to tree
    const tree = useMemo(() => {
        const root: TreeFolder = { name: 'root', type: 'directory', children: [] };

        files.forEach(file => {
            const parts = file.path.split('/');
            let current = root;

            parts.forEach((part, i) => {
                const isLast = i === parts.length - 1;

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
    }, [files]);

    const renderTree = (items: TreeItem[], depth = 0, parentPath = '') => {
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
                        <div
                            onClick={() => toggleFolder(currentPath)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-white/40 hover:bg-white/5 hover:text-white/70 transition-all group cursor-pointer"
                            style={{ paddingLeft: `${depth * 12 + 12}px` }}
                        >
                            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <Folder className="w-3.5 h-3.5 text-indigo-400/50 group-hover:text-indigo-400" />
                            <span className="truncate flex-1 text-left font-medium">{item.name}</span>
                            <div className="hidden group-hover:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCreateFile(currentPath); }}
                                    className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white"
                                    title="Add File"
                                >
                                    <FilePlus className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(currentPath, e)}
                                    className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-rose-400"
                                    title="Delete Folder"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                        {isOpen && renderTree(item.children, depth + 1, currentPath)}
                    </div>
                );
            } else {
                const isActive = activeFile === item.path;
                const isEditing = editingPath === item.path;

                return (
                    <div
                        key={item.path}
                        onClick={() => !isEditing && setActiveFile(item.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] transition-all group relative cursor-pointer ${isActive
                            ? 'bg-indigo-600/10 text-indigo-400 font-bold'
                            : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                            }`}
                        style={{ paddingLeft: `${depth * 12 + 25}px` }}
                    >
                        <FileCode className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-white/10 group-hover:text-white/30'}`} />

                        {isEditing ? (
                            <input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitRename(item.path);
                                    if (e.key === 'Escape') setEditingPath(null);
                                }}
                                onBlur={() => submitRename(item.path)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 bg-black/50 border border-indigo-500/50 rounded px-1 text-[11px] outline-none text-white"
                            />
                        ) : (
                            <span className="truncate text-left flex-1">{item.name}</span>
                        )}

                        <DiffBadge path={item.path} />

                        <div className="hidden group-hover:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                            <button
                                onClick={(e) => handleRename(item.path, e)}
                                className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-indigo-400"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                            <button
                                onClick={(e) => handleDelete(item.path, e)}
                                className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-rose-400"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>

                        {pendingFiles.some(pf => pf.path === item.path) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse shrink-0 ml-1" />
                        )}
                    </div>
                );
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c] border-r border-white/5 overflow-hidden">
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-white/[0.01]">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Live Explorer</span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleCreateFile('')}
                        className="p-1.5 hover:bg-white/5 rounded-md text-white/20 hover:text-indigo-400 transition-colors"
                        title="New File"
                    >
                        <FilePlus className="w-3.5 h-3.5" />
                    </button>
                </div>
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
