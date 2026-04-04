export function setupMarkdown() {
    marked.use({
        gfm: true,
        breaks: true,
        renderer: {
            code({ text, lang }) {
                const language = lang || 'plaintext';
                const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
                const highlighted = hljs.highlight(text, { language: validLanguage }).value;
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
            }
        }
    });

    window.copyCode = function(button) {
        const codeWrapper = button.closest('.code-wrapper');
        const codeText = codeWrapper.querySelector('code').innerText;
        navigator.clipboard.writeText(codeText);
        
        const span = button.querySelector('span');
        span.textContent = 'Copied!';
        setTimeout(() => span.textContent = 'Copy code', 2000);
    };
}

export function parseMarkdown(text) {
    return marked.parse(text || '');
}
