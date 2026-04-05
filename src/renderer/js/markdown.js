export function setupMarkdown() {
    try {
        marked.use({
            gfm: true,
            breaks: true,
            renderer: {
                code({ text, lang }) {
                    try {
                        const language = lang || 'plaintext';
                        const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
                        const highlighted = hljs.highlight(text || '', { language: validLanguage }).value;
                        const langLabel = language.toUpperCase();
                        
                        return `
                            <div class="code-wrapper">
                                <div class="code-header">
                                    <span class="code-lang">${langLabel}</span>
                                    <button class="copy-code-btn" onclick="copyCode(this)">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        <span>Copy code</span>
                                    </button>
                                </div>
                                <pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>
                            </div>
                        `;
                    } catch (err) {
                        console.error('[MARKDOWN] Code highlight error:', err);
                        const safeText = (text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        return `<pre><code>${safeText}</code></pre>`;
                    }
                }
            }
        });
    } catch (err) {
        console.error('[MARKDOWN] Setup error:', err);
    }

    window.copyCode = function(button) {
        try {
            const codeWrapper = button.closest('.code-wrapper');
            if (!codeWrapper) return;
            const codeEl = codeWrapper.querySelector('code');
            if (!codeEl) return;
            const codeText = codeEl.innerText;
            navigator.clipboard.writeText(codeText).catch(() => {
                console.warn('[MARKDOWN] Clipboard write failed');
            });
            
            const span = button.querySelector('span');
            if (span) {
                span.textContent = 'Copied!';
                setTimeout(() => span.textContent = 'Copy code', 2000);
            }
        } catch (err) {
            console.error('[MARKDOWN] Copy error:', err);
        }
    };
}

export function parseMarkdown(text) {
    try {
        return marked.parse(text || '');
    } catch (err) {
        console.error('[MARKDOWN] Parse error:', err);
        // Return escaped HTML as fallback so the user still sees something
        return `<p>${(text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    }
}
