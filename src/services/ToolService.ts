import { getWebContainer } from '@/lib/webcontainer';

export interface ToolAction {
    type: 'shell' | 'file' | 'search' | 'npm';
    content: string;
    description: string;
}

export class ToolService {
    static async executeShell(command: string): Promise<string> {
        const wc = await getWebContainer();
        const process = await wc.spawn('jsh', ['-c', command]);

        let output = '';
        process.output.pipeTo(new WritableStream({
            write(data) { output += data; }
        }));

        const exitCode = await process.exit;
        if (exitCode !== 0) {
            throw new Error(`Command failed with exit code ${exitCode}: ${output}`);
        }
        return output;
    }

    static async execute(action: ToolAction): Promise<string> {
        console.log(`[ToolService] Executing ${action.type}: ${action.description}`);

        switch (action.type) {
            case 'shell':
                return await this.executeShell(action.content);
            case 'npm':
                return await this.executeShell(`npm install ${action.content}`);
            case 'search':
                // Simple grep implementation via shell
                return await this.executeShell(`grep -r "${action.content}" .`);
            case 'file':
                // This is usually handled by the parser, but we can add a 'read' capability
                const wc = await getWebContainer();
                return await wc.fs.readFile(action.content, 'utf-8');
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
