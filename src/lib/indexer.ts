export interface ProjectIndex {
    structure: string;
    files: Record<string, string>;
}

export function generateProjectIndex(files: { path: string, content: string }[]): string {
    if (files.length === 0) return "Empty project.";

    // Generate structure
    const structure = files.map(f => f.path).join('\n');

    // Generate file summaries (Truncate large files to avoid token bloat)
    const summaries = files.map(file => {
        let summary = file.content;
        if (summary.length > 2000) {
            summary = summary.substring(0, 1000) + "\n... [TRUNCATED] ...\n" + summary.substring(summary.length - 500);
        }
        return `### FILE: ${file.path}\n\`\`\`\n${summary}\n\`\`\``;
    }).join('\n\n');

    return `
PROJECT STRUCTURE:
${structure}

FILE CONTENTS:
${summaries}
  `.trim();
}
