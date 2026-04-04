export function updateGreeting(container, name) {
    if (!container) return;
    const hour = new Date().getHours();
    let welcome = "Good morning";
    if (hour >= 12 && hour < 17) welcome = "Good afternoon";
    if (hour >= 17) welcome = "Good evening";
    container.textContent = `${welcome}, ${name}`;
}

export function autoGrowTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
    if (textarea.value === '') textarea.style.height = 'auto';
}

export function showLoading(container) {
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
    container.innerHTML = `
        <div style="color:#ff4a4a; padding:10px; border:1px solid #ff4a4a; border-radius:8px;">
            <p><strong>System Error:</strong> ${error.message}</p>
            <p style="font-size:12px; margin-top:8px; color:var(--text-secondary);">
                Check your internet connection or local server (Ollama) status.
            </p>
        </div>
    `;
}

export function renderReasoningTrace(details) {
    if (!details || !Array.isArray(details)) return '';
    
    const reasoningText = details
        .filter(d => d.type === 'reasoning.text')
        .map(d => d.text)
        .join('\n');
    
    if (!reasoningText) return '';

    return `
        <div class="reasoning-trace">
            <details>
                <summary>Logic Trace</summary>
                <div class="reasoning-content">${reasoningText}</div>
            </details>
        </div>
    `;
}
