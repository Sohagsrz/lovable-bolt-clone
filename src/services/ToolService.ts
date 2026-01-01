import { getWebContainer } from '@/lib/webcontainer';

export interface ToolAction {
    type: 'shell' | 'file' | 'search' | 'npm' | 'readDir' | 'find' | 'webRead' | 'webSearch' | 'deleteFile';
    content: string;
    description: string;
}

export class ToolService {
    static async executeShell(command: string): Promise<string> {
        try {
            const wc = await getWebContainer();
            const process = await wc.spawn('jsh', ['-c', command]);

            let output = '';
            process.output.pipeTo(new WritableStream({
                write(data) { output += data; }
            }));

            const exitCode = await process.exit;
            if (exitCode !== 0) {
                return `[Error] Exit code ${exitCode}: ${output} `;
            }
            return output || "Done (no output)";
        } catch (err: any) {
            return `[Execution Error] ${err.message} `;
        }
    }

    static async execute(action: ToolAction): Promise<string> {
        console.log(`[ToolService] Executing ${action.type}: ${action.description} `);

        const wc = await getWebContainer();

        switch (action.type) {
            case 'shell':
                return await this.executeShell(action.content);
            case 'npm':
                return await this.executeShell(`npm install ${action.content} `);
            case 'search':
                return await this.executeShell(`grep - r "${action.content}".`);
            case 'file':
                try {
                    return await wc.fs.readFile(action.content, 'utf-8');
                } catch (e) { return `[File Error] Could not read file: ${action.content} `; }
            case 'readDir':
                try {
                    const entries = await wc.fs.readdir(action.content || '.', { withFileTypes: true });
                    return entries.map(e => `${e.isDirectory() ? '[DIR] ' : '[FILE]'} ${e.name} `).join('\n');
                } catch (e) { return `[FS Error] Could not read directory: ${action.content}`; }
            case 'find':
                // Search for files by name/pattern
                return await this.executeShell(`find . -maxdepth 4 -name "${action.content}"`);
            case 'webRead':
                try {
                    const res = await fetch('/api/proxy', {
                        method: 'POST',
                        body: JSON.stringify({ url: action.content }),
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const data = await res.json();
                    if (data.error) throw new Error(data.error);

                    const text = data.content;
                    const contentType = data.contentType;

                    if (contentType?.includes('application/json')) {
                        try {
                            return `[JSON Data]\n\`\`\`json\n${JSON.stringify(JSON.parse(text), null, 2).substring(0, 8000)}\n\`\`\``;
                        } catch (e) { return text.substring(0, 8000); }
                    }

                    // Basic HTML stripper for cleaner AI context
                    const cleanText = text
                        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '') // Remove scripts
                        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '')   // Remove styles
                        .replace(/<[^>]*>?/gm, '')                            // Remove tags
                        .replace(/\s+/g, ' ')                                 // Collapse whitespace
                        .trim();

                    return cleanText.substring(0, 8000);
                } catch (e: any) { return `[Web Error] Could not fetch URL via proxy: ${e.message}`; }
            case 'webSearch':
                try {
                    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(action.content)}&format=json`);
                    const data = await res.json();
                    return `[Search Results for "${action.content}"]\nAbstract: ${data.AbstractText}\nResults: ${data.RelatedTopics?.slice(0, 3).map((t: any) => t.Text).join('\n')}`;
                } catch (e) { return `[Search Error] Could not perform search: ${action.content}`; }
            case 'deleteFile':
                try {
                    await wc.fs.rm(action.content, { recursive: true });
                    // Sync with store state
                    const { useBuilderStore } = await import('@/store/useBuilderStore');
                    useBuilderStore.getState().deleteFile(action.content);
                    return `Successfully deleted: ${action.content}`;
                } catch (e) { return `[Delete Error] Could not delete: ${action.content}`; }
            default:
                throw new Error(`Unknown tool type: ${action.type}`);
        }
    }

    /**
     * Parse tool calls from AI response
     * Format: <bolt_tool type="...">description\ncontent</bolt_tool>
     */
    static parseToolCalls(text: string): ToolAction[] {
        const tools: ToolAction[] = [];
        const regex = /<bolt_tool\s+type="([^"]+)">([\s\S]*?)<\/bolt_tool>/gi;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const type = match[1] as ToolAction['type'];
            const rawContent = match[2].trim();
            const lines = rawContent.split('\n');
            const description = lines[0];
            const content = lines.slice(1).join('\n').trim();

            tools.push({ type, content, description });
        }
        return tools;
    }
}
