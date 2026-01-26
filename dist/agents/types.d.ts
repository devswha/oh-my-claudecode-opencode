export interface AgentFrontmatter {
    name: string;
    description: string;
    model?: 'haiku' | 'sonnet' | 'opus';
    tools?: string;
}
export interface AgentDefinition {
    name: string;
    description: string;
    systemPrompt: string;
    model?: 'haiku' | 'sonnet' | 'opus';
    readOnly: boolean;
    tools: string[];
}
