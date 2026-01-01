export interface FileChange {
    path: string;
    content: string;
}

export function parseAIResponse(text: string): FileChange[] {
    const changes: FileChange[] = [];

    // This is a simple parser. In a real app, you'd want a more robust one.
    // We look for patterns like:
    // FILE: src/App.tsx
    // ```tsx
    // ... code ...
    // ```

    const fileRegex = /FILE:\s*([^\n\r]+)[\s\S]*?```[\w]*\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(text)) !== null) {
        const path = match[1].trim();
        const content = match[2].trim();
        changes.push({ path, content });
    }

    return changes;
}
