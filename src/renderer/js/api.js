export async function fetchModels() {
    const endpoints = ['http://127.0.0.1:11434/api/tags', 'http://localhost:11434/api/tags'];
    for (const url of endpoints) {
        try {
            const data = await window.electronAPI.ollamaCall(url, { method: 'GET' });
            if (data?.models?.length > 0) return data.models;
        } catch (e) {
            console.warn(`[API] Failed to fetch from ${url}`);
        }
    }
    return null;
}

export async function generateOllamaResponse(baseUrl, payload) {
    const targetUrl = `${baseUrl}/api/generate`;
    return await window.electronAPI.ollamaCall(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

export async function generateOpenRouterResponse(apiKey, payload) {
    const targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
    return await window.electronAPI.ollamaCall(targetUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Imposter'
        },
        body: JSON.stringify(payload)
    });
}
