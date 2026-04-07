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

/**
 * Direct Gemini API Integration
 */

export async function fetchGeminiModels(apiKey) {
    if (!apiKey) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const data = await window.electronAPI.ollamaCall(url, { method: 'GET' });
        if (data && data.models) {
            // Filter to only include generateContent capable models
            return data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        }
    } catch (e) {
        console.error('[API] Gemini Fetch Error:', e);
    }
    return null;
}

export async function generateGeminiResponse(apiKey, modelId, conversationHistory, systemInstruction = '') {
    if (!apiKey) throw new Error('No API key configured for Gemini');

    // Gemini models in URL must be prefixed with 'models/' if they aren't already
    const modelPath = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;

    // Map internal history to Gemini format
    // Internal: { role: 'user' | 'assistant', content: string }
    // Gemini: { role: 'user' | 'model', parts: [{ text: string }] }
    const contents = conversationHistory
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

    const payload = { contents };

    if (systemInstruction) {
        payload.system_instruction = {
            parts: [{ text: systemInstruction }]
        };
    }

    const result = await window.electronAPI.ollamaCall(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (result && result.error) {
        throw new Error(result.error.message || `Gemini returned an error (status: ${result.status || 'unknown'})`);
    }

    return result || {};
}

export async function testGeminiModel(apiKey, modelId) {
    if (!apiKey || !modelId) return false;
    const modelPath = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;
    
    try {
        const result = await window.electronAPI.ollamaCall(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
        });
        
        return !!(result && result.candidates && result.candidates.length > 0);
    } catch (e) {
        return false;
    }
}
