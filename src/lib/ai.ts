import axios from 'axios';

const AI_PROXY_URL = 'http://localhost:4141/v1';

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const chatWithAI = async (messages: Message[], model: string = 'claude-sonnet-4.5') => {
    try {
        const response = await axios.post(`${AI_PROXY_URL}/chat/completions`, {
            model,
            messages,
            stream: false,
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('AI Proxy Error:', error);
        throw error;
    }
};

export const getModels = async () => {
    try {
        const response = await axios.get(`${AI_PROXY_URL}/models`);
        return response.data.data;
    } catch (error) {
        console.error('AI Models Error:', error);
        return [];
    }
}
