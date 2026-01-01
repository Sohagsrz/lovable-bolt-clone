export interface FileChange {
    path: string;
    content: string;
}

export function parseAIResponse(text: string): FileChange[] {
    const changes: FileChange[] = [];

    // Enhanced regex to handle streaming (matches even if closing ``` is missing)
    // Supports "FILE: path" or "### FILE: path"
    const fileRegex = /(?:###\s*)?FILE:?\s*([a-zA-Z0-9\/\.\_\-]+)[\s\S]*?```[\w]*\n([\s\S]*?)(?:```|$)/g;
    let match;

    while ((match = fileRegex.exec(text)) !== null) {
        const path = match[1].trim();
        let content = match[2];

        // If there's a next file marker in this match's content, prune it 
        // (This handles cases where the regex might over-greedy if multiple files are present)
        const nextMarkerMatch = content.match(/\n(?:###\s*)?FILE:?/);
        if (nextMarkerMatch) {
            content = content.slice(0, nextMarkerMatch.index);
        }

        changes.push({ path, content: content.trim() });
    }

    return changes;
}
