export interface ProjectIndex {
    structure: string;
    files: Record<string, string>;
}

export function generateProjectIndex(files: { path: string, content: string }[]): string {
    if (files.length === 0) return "Empty project.";

    // Generate Visual Tree Structure
    const tree: any = {};
    files.forEach(f => {
        const parts = f.path.split('/');
        let curr = tree;
        parts.forEach((part, i) => {
            if (!curr[part]) curr[part] = (i === parts.length - 1) ? null : {};
            curr = curr[part];
        });
    });

    const buildTreeStr = (obj: any, indent = '', isLast = true): string => {
        const keys = Object.keys(obj);
        return keys.map((key, i) => {
            const isDir = obj[key] !== null;
            const last = i === keys.length - 1;
            const prefix = indent + (last ? '└── ' : '├── ');
            const nextIndent = indent + (last ? '    ' : '│   ');
            return `${prefix}${isDir ? '📁' : '📄'} ${key}\n${isDir ? buildTreeStr(obj[key], nextIndent, last) : ''}`;
        }).join('');
    };

    const visualTree = buildTreeStr(tree);

    // Identify Core Files (Package.json, Configs, etc. - always include more context for these)
    const coreFiles = files.filter(f =>
        f.path === 'package.json' ||
        f.path.includes('config') ||
        f.path.endsWith('.env')
    );

    // Generate file summaries
    const summaries = files.map(file => {
        const isCore = coreFiles.some(cf => cf.path === file.path);
        let summary = file.content;

        // Smarter truncation: Keep more if core, otherwise limit to avoid ghost-context
        const limit = isCore ? 5000 : 2500;
        if (summary.length > limit) {
            summary = summary.substring(0, limit / 1.5) + "\n... [TRUNCATED FOR TOKENS] ...\n" + summary.substring(summary.length - (limit / 4));
        }

        return `### FILE: ${file.path} ${isCore ? '[CORE CONFIG]' : ''}\n\`\`\`\n${summary}\n\`\`\``;
    }).join('\n\n');

    return `
# PROJECT OVERVIEW
Total Files: ${files.length}

## EXPLORER TREE
${visualTree}

## FILE CONTEXTS
${summaries}
  `.trim();
}
