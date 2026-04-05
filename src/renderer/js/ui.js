export function updateGreeting(container, name) {
    try {
        if (!container) return;
        const hour = new Date().getHours();
        let welcome = "Good morning";
        if (hour >= 12 && hour < 17) welcome = "Good afternoon";
        if (hour >= 17) welcome = "Good evening";
        container.textContent = `${welcome}, ${name || 'User'}`;
    } catch (err) {
        console.error('[UI] Greeting update error:', err);
    }
}

export function autoGrowTextarea(textarea) {
    try {
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
        if (textarea.value === '') textarea.style.height = 'auto';
    } catch (err) {
        console.error('[UI] Textarea resize error:', err);
    }
}

export function showLoading(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="loading">
            <span style="font-weight:600; margin-right:8px; color:var(--text-primary);">Thinking</span>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        </div>
    `;
}

export function showError(container, error) {
    if (!container) return;
    const message = error && error.message ? error.message : 'An unknown error occurred';
    const safeMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    container.innerHTML = `
        <div style="color:#ff4a4a; padding:10px; border:1px solid #ff4a4a; border-radius:8px;">
            <p><strong>System Error:</strong> ${safeMessage}</p>
            <p style="font-size:12px; margin-top:8px; color:var(--text-secondary);">
                Check your internet connection or local server (Ollama) status.
            </p>
        </div>
    `;
}

export function renderReasoningTrace(details) {
    try {
        if (!details || !Array.isArray(details)) return '';
        
        const reasoningText = details
            .filter(d => d && d.type === 'reasoning.text')
            .map(d => d.text || '')
            .join('\n');
        
        if (!reasoningText) return '';

        const safeText = reasoningText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `
            <div class="reasoning-trace">
                <details>
                    <summary>Logic Trace</summary>
                    <div class="reasoning-content">${safeText}</div>
                </details>
            </div>
        `;
    } catch (err) {
        console.error('[UI] Reasoning trace error:', err);
        return '';
    }
}
