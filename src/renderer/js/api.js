export async function fetchModels() {
    const endpoints = ['http://127.0.0.1:11434/api/tags', 'http://localhost:11434/api/tags'];
    for (const url of endpoints) {
        try {
            const data = await window.electronAPI.ollamaCall(url, { method: 'GET' });
            if (data && !data.error && data.models && Array.isArray(data.models) && data.models.length > 0) {
                return data.models;
            }
        } catch (e) {
            // Silently try next endpoint
        }
    }
    return null;
}

export async function generateOllamaResponse(baseUrl, payload) {
    if (!baseUrl) throw new Error('No base URL configured for Ollama');

    const targetUrl = `${baseUrl}/api/chat`;
    const result = await window.electronAPI.ollamaCall(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (result && result.error) {
        throw new Error(result.message || `Ollama returned an error (status: ${result.status || 'unknown'})`);
    }

    return result || {};
}

export async function generateOpenRouterResponse(apiKey, payload) {
    if (!apiKey) throw new Error('No API key configured for OpenRouter');

    const targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const result = await window.electronAPI.ollamaCall(targetUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Imposter'
        },
        body: JSON.stringify(payload)
    });

    if (result && result.error) {
        throw new Error(result.message || `OpenRouter returned an error (status: ${result.status || 'unknown'})`);
    }

    return result || {};
}
