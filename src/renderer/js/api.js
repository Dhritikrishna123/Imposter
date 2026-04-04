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

export async function generateResponse(baseUrl, payload) {
    const targetUrl = `${baseUrl}/api/generate`;
    return await window.electronAPI.ollamaCall(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}
