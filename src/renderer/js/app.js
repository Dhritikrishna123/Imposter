import * as API from './api.js';
import * as Config from './config.js';
import * as UI from './ui.js';
import { setupMarkdown, parseMarkdown } from './markdown.js';
import { AssemblyService } from './assembly-service.js';

// ── Global Error Handlers (Renderer) ────────────────────────────────────────

window.onerror = (message, source, lineno, colno, error) => {
    console.error('[RENDERER ERROR]', message, `at ${source}:${lineno}:${colno}`, error);
    return true; // Prevent default error dialog
};

window.onunhandledrejection = (event) => {
    console.error('[RENDERER UNHANDLED REJECTION]', event.reason);
    event.preventDefault();
};

// ── DOM Elements (with safe fallbacks) ──────────────────────────────────────

function $(id) {
    return document.getElementById(id);
}

const promptInput = $('prompt-input');
const searchBtn = $('search-btn');
const resultContent = $('result-content');
const modelSelect = $('modelSelect');
const statusDot = $('connectionStatus');
const statusText = $('statusText');
const chatStage = $('chat-stage');
const clearChatBtn = $('clear-chat-btn');

// Overlays
const onboardingOverlay = $('onboarding-overlay');
const settingsOverlay = $('settings-overlay');

// Form Inputs
const userNameInput = $('user-name');
const systemPromptInput = $('system-prompt');
const settingsNameInput = $('settings-name');
const settingsPromptInput = $('settings-prompt');
const settingsAppMode = $('settings-app-mode');
const settingsAssemblyKey = $('settings-assembly-key');
const settingsResume = $('settings-resume');
const settingsJd = $('settings-jd');
const settingsPersona = $('settings-persona');
const voiceTestStatus = $('voice-test-status');

// Window Controls
const windowControls = $('window-controls');
const winMinBtn = $('win-min-btn');
const winCloseBtn = $('win-close-btn');

// Model Management Elements
const customModelsList = $('custom-models-list');
const newModelProvider = $('new-model-provider');
const newModelLabel = $('new-model-label');
const newModelId = $('new-model-id');
const newModelKey = $('new-model-key');
const newModelUrl = $('new-model-url');
const addModelBtn = $('add-model-btn');
const apiKeyGroup = $('api-key-group');
const baseUrlGroup = $('base-url-group');

// Buttons
const saveConfigBtn = $('save-config-btn');
const settingsBtn = $('settings-link');
const testVoiceBtn = $('test-voice-btn');
const saveSettingsBtn = $('save-settings');

// State
let userConfig = Config.getDefaultConfig();
let customModels = [];
let currentRawResponse = '';
let isRecording = false;

// Context Memory
let conversationHistory = [];
let emptyStateHtml = '';

async function init() {
    try {
        setupMarkdown();
        loadAppConfig();

        emptyStateHtml = resultContent ? resultContent.innerHTML : '';
        customModels = Config.getSavedModels();
        applyAppMode(userConfig.appMode || 'stealth');
        await loadModels();
        setupEventListeners();
        renderCustomModelsList();
    } catch (err) {
        console.error('[INIT] App initialization error:', err);
    }
}

function applyAppMode(mode) {
    try {
        if (window.electronAPI && window.electronAPI.setAppMode) {
            window.electronAPI.setAppMode(mode);
        }
        if (windowControls) {
            windowControls.style.display = mode === 'normal' ? 'flex' : 'none';
        }
    } catch (err) {
        console.error('[APP] Mode switch error:', err);
    }
}

function loadAppConfig() {
    try {
        const saved = Config.getSavedConfig();
        if (saved) {
            userConfig = saved;
            if (onboardingOverlay) onboardingOverlay.classList.add('hidden');
            UI.updateGreeting($('greeting-container'), userConfig.name);
        } else {
            if (onboardingOverlay) onboardingOverlay.classList.remove('hidden');
        }
    } catch (err) {
        console.error('[APP] Config load error:', err);
        if (onboardingOverlay) onboardingOverlay.classList.remove('hidden');
    }
}

async function loadModels() {
    try {
        if (statusDot) statusDot.className = 'dot offline';
        if (statusText) statusText.textContent = 'Scanning...';

        const ollamaModels = await API.fetchModels();
        if (modelSelect) modelSelect.innerHTML = '';

        if (ollamaModels && Array.isArray(ollamaModels)) {
            ollamaModels.forEach(m => {
                if (!m || !m.name) return;
                const opt = document.createElement('option');
                opt.value = `ollama|${m.name}|http://127.0.0.1:11434`;
                opt.textContent = `Local: ${m.name}`;
                if (modelSelect) modelSelect.appendChild(opt);
            });
        }

        if (customModels && customModels.length > 0) {
            customModels.forEach(m => {
                if (!m || !m.modelId) return;
                const opt = document.createElement('option');
                opt.value = `${m.provider}|${m.modelId}|${m.baseUrl}|${m.apiKey}`;
                opt.textContent = `${m.name || m.modelId}`;
                if (modelSelect) modelSelect.appendChild(opt);
            });
        }

        if (modelSelect && modelSelect.options.length > 0) {
            if (statusDot) statusDot.className = 'dot online';
            if (statusText) statusText.textContent = 'Ready';
        } else {
            if (statusText) statusText.textContent = 'No Models';
        }
    } catch (err) {
        console.error('[APP] Model loading error:', err);
        if (statusText) statusText.textContent = 'Scan Failed';
    }
}

function renderCustomModelsList() {
    if (!customModelsList) return;
    try {
        customModelsList.innerHTML = '';
        customModels.forEach((m, index) => {
            if (!m) return;
            const item = document.createElement('div');
            item.className = 'model-item';
            const safeName = (m.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeProvider = (m.provider || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeModelId = (m.modelId || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            item.innerHTML = `
                <div class="model-info">
                    <strong>${safeName}</strong>
                    <span>${safeProvider} - ${safeModelId}</span>
                </div>
                <button class="secondary-btn delete-model-btn" data-index="${index}" style="padding: 6px 12px; font-size: 12px; color: #ff6b6b; border-color: rgba(255, 107, 107, 0.3);">Remove</button>
            `;
            customModelsList.appendChild(item);
        });

        document.querySelectorAll('.delete-model-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    const index = parseInt(btn.getAttribute('data-index'), 10);
                    if (!isNaN(index) && index >= 0 && index < customModels.length) {
                        customModels.splice(index, 1);
                        Config.saveModels(customModels);
                        renderCustomModelsList();
                        loadModels();
                    }
                } catch (err) {
                    console.error('[APP] Model delete error:', err);
                }
            });
        });
    } catch (err) {
        console.error('[APP] Model list render error:', err);
    }
}

function setupEventListeners() {
    if (promptInput) promptInput.addEventListener('input', () => UI.autoGrowTextarea(promptInput));

    if (newModelProvider) {
        newModelProvider.addEventListener('change', () => {
            try {
                const provider = newModelProvider.value;
                if (apiKeyGroup) apiKeyGroup.style.display = provider === 'openrouter' ? 'block' : 'none';
                if (baseUrlGroup) baseUrlGroup.style.display = provider === 'ollama' ? 'block' : 'none';
                if (provider === 'openrouter') {
                    if (newModelId) newModelId.placeholder = 'e.g. qwen/qwen3.6-plus:free';
                    if (newModelUrl) newModelUrl.value = '';
                } else {
                    if (newModelId) newModelId.placeholder = 'e.g. llama3';
                    if (newModelUrl) newModelUrl.value = 'http://127.0.0.1:11434';
                }
            } catch (err) {
                console.error('[APP] Provider change error:', err);
            }
        });
    }

    if (addModelBtn) {
        addModelBtn.addEventListener('click', () => {
            try {
                const name = newModelLabel ? newModelLabel.value.trim() : '';
                const modelId = newModelId ? newModelId.value.trim() : '';
                const provider = newModelProvider ? newModelProvider.value : 'ollama';
                const apiKey = newModelKey ? newModelKey.value.trim() : '';
                const baseUrl = newModelUrl ? newModelUrl.value.trim() : '';

                if (name && modelId) {
                    customModels.push({ name, modelId, provider, apiKey, baseUrl });
                    Config.saveModels(customModels);
                    renderCustomModelsList();
                    loadModels();
                    if (newModelLabel) newModelLabel.value = '';
                    if (newModelId) newModelId.value = '';
                    if (newModelKey) newModelKey.value = '';
                }
            } catch (err) {
                console.error('[APP] Add model error:', err);
            }
        });
    }

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (promptInput) {
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                performSearch();
            }
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            try {
                if (settingsNameInput) settingsNameInput.value = userConfig.name || '';
                if (settingsPromptInput) settingsPromptInput.value = userConfig.systemPrompt || '';
                if (settingsAppMode) settingsAppMode.value = userConfig.appMode || 'stealth';
                if (settingsAssemblyKey) settingsAssemblyKey.value = userConfig.assemblyKey || '';
                if (settingsResume) settingsResume.value = userConfig.resumeContent || '';
                if (settingsJd) settingsJd.value = userConfig.jobDescription || '';
                if (settingsPersona) settingsPersona.value = userConfig.persona || 'engineer';
                if (settingsOverlay) settingsOverlay.classList.remove('hidden');
            } catch (err) {
                console.error('[APP] Settings open error:', err);
            }
        });
    }

    const closeSettingsEl = $('close-settings');
    if (closeSettingsEl) closeSettingsEl.addEventListener('click', () => {
        if (settingsOverlay) settingsOverlay.classList.add('hidden');
    });

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            try {
                const name = settingsNameInput ? settingsNameInput.value.trim() : '';
                const prompt = settingsPromptInput ? settingsPromptInput.value.trim() : '';
                const appMode = settingsAppMode ? settingsAppMode.value : 'stealth';
                const assemblyKey = settingsAssemblyKey ? settingsAssemblyKey.value.trim() : '';

                if (name) {
                    userConfig = Config.saveConfig(name, prompt, appMode, assemblyKey, {
                        resumeContent: settingsResume ? settingsResume.value.trim() : '',
                        jobDescription: settingsJd ? settingsJd.value.trim() : '',
                        persona: settingsPersona ? settingsPersona.value : 'engineer'
                    });
                    UI.updateGreeting($('greeting-container'), userConfig.name);
                    applyAppMode(appMode);
                    if (settingsOverlay) settingsOverlay.classList.add('hidden');
                    if (statusText) statusText.textContent = 'Settings Saved';
                    setTimeout(() => { if (statusText) statusText.textContent = 'Ready'; }, 2000);
                }
            } catch (err) {
                console.error('[APP] Settings save error:', err);
            }
        });
    }

    if (testVoiceBtn) {
        testVoiceBtn.addEventListener('click', async () => {
            try {
                const key = settingsAssemblyKey ? settingsAssemblyKey.value.trim() : '';
                if (!key) {
                    if (voiceTestStatus) voiceTestStatus.textContent = '❌ Please enter an API key';
                    return;
                }

                if (voiceTestStatus) voiceTestStatus.textContent = 'Testing...';
                const result = await window.electronAPI.testAssemblyKey(key);
                if (result && result.success) {
                    if (voiceTestStatus) {
                        voiceTestStatus.textContent = '✅ Connection Successful!';
                        voiceTestStatus.style.color = '#00ffcc';
                    }
                } else {
                    if (voiceTestStatus) {
                        voiceTestStatus.textContent = `❌ Failed: ${(result && result.error) || 'Unknown error'}`;
                        voiceTestStatus.style.color = '#ff4d4d';
                    }
                }
            } catch (err) {
                console.error('[APP] Voice test error:', err);
                if (voiceTestStatus) {
                    voiceTestStatus.textContent = `❌ Error: ${err.message}`;
                    voiceTestStatus.style.color = '#ff4d4d';
                }
            }
        });
    }

    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', () => {
            try {
                const name = userNameInput ? userNameInput.value.trim() : '';
                const prompt = systemPromptInput ? systemPromptInput.value.trim() : '';
                if (name) {
                    userConfig = Config.saveConfig(name, prompt, 'stealth', '');
                    if (onboardingOverlay) onboardingOverlay.classList.add('hidden');
                    if (conversationHistory.length === 0 && resultContent) {
                        UI.updateGreeting(resultContent.querySelector('#greeting-container'), userConfig.name);
                    }
                }
            } catch (err) {
                console.error('[APP] Config save error:', err);
            }
        });
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            try {
                const tabId = btn.getAttribute('data-tab');
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-pane').forEach(p => {
                    p.classList.toggle('active', p.id === `tab-${tabId}`);
                });
                if (saveSettingsBtn) {
                    saveSettingsBtn.style.display = (tabId === 'shortcuts' || tabId === 'about') ? 'none' : 'block';
                }
            } catch (err) {
                console.error('[APP] Tab switch error:', err);
            }
        });
    });

    if (winMinBtn) winMinBtn.addEventListener('click', () => {
        try { window.electronAPI.minimizeApp(); } catch (_) {}
    });
    if (winCloseBtn) winCloseBtn.addEventListener('click', () => {
        try { window.electronAPI.closeApp(); } catch (_) {}
    });

    if (window.electronAPI) {
        window.electronAPI.onFocusInput(() => { if (promptInput) promptInput.focus(); });
        window.electronAPI.onTriggerSearch(() => performSearch());
        window.electronAPI.onScroll((dir) => {
            if (chatStage) chatStage.scrollBy({ top: dir * 150, behavior: 'smooth' });
        });
        window.electronAPI.onCopyMain(() => {
            try {
                if (currentRawResponse) {
                    navigator.clipboard.writeText(currentRawResponse).catch(() => {});
                    if (statusText) statusText.textContent = 'Copied!';
                    setTimeout(() => { if (statusText) statusText.textContent = 'Ready'; }, 2000);
                }
            } catch (err) {
                console.error('[APP] Copy error:', err);
            }
        });

        window.electronAPI.onTriggerAiSearch(() => {
            try {
                const lastTranscript = AssemblyService.getLastFinalTranscript();
                if (lastTranscript) {
                    window.electronAPI.sendAiResponseToIsland('thinking...');
                    if (promptInput) promptInput.value = lastTranscript;
                    performSearch(true);
                }
            } catch (err) {
                console.error('[APP] F10 AI search error:', err);
            }
        });

        window.electronAPI.onToggleAutoReply(async () => {
            if (isRecording) {
                try {
                    AssemblyService.stop();
                    window.electronAPI.closeIslandWindow();
                } catch (_) {}
                isRecording = false;
                if (statusText) statusText.textContent = 'Ready';
            } else {
                try {
                    if (!userConfig.assemblyKey) {
                        if (statusText) statusText.textContent = 'Missing API Key';
                        return;
                    }

                    if (statusText) statusText.textContent = 'Connecting...';
                    const started = await AssemblyService.start(userConfig.assemblyKey);

                    if (started) {
                        window.electronAPI.openIslandWindow();
                        isRecording = true;
                        if (statusText) statusText.textContent = 'Live • Recording';
                    } else {
                        if (statusText) statusText.textContent = 'Failed to Start';
                    }
                } catch (err) {
                    console.error('[APP] Voice toggle error:', err);
                    if (statusText) statusText.textContent = 'Mic Error';
                }
            }
        });

        if (window.electronAPI.onOcrResult) {
            window.electronAPI.onOcrResult((text) => {
                try {
                    if (promptInput && text) {
                        promptInput.value += (promptInput.value ? '\n' : '') + text;
                        UI.autoGrowTextarea(promptInput);
                        promptInput.focus();
                    }
                } catch (err) {
                    console.error('[APP] OCR result error:', err);
                }
            });
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (settingsOverlay) settingsOverlay.classList.add('hidden');
            if (onboardingOverlay) onboardingOverlay.classList.add('hidden');
        }
    });

    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            try {
                conversationHistory = [];
                if (resultContent) {
                    resultContent.innerHTML = emptyStateHtml;
                    UI.updateGreeting(resultContent.querySelector('#greeting-container'), userConfig.name);
                }
            } catch (err) {
                console.error('[APP] Clear chat error:', err);
            }
        });
    }
}

function appendChatMessage(msg) {
    if (!msg || msg.role === 'system' || !resultContent) return null;

    try {
        if (conversationHistory.length === 1 && conversationHistory[0] === msg) {
            resultContent.innerHTML = '';
        }

        const bubble = document.createElement('div');
        if (msg.role === 'user') {
            bubble.className = 'chat-message-user';
            bubble.textContent = msg.content || '';
        } else {
            bubble.className = 'chat-message-ai markdown-body';
            let htmlContent = parseMarkdown(msg.content || '');
            if (msg.reasoningHtml) htmlContent = msg.reasoningHtml + htmlContent;

            if (msg.isError) {
                UI.showError(bubble, { message: msg.content });
            } else {
                bubble.innerHTML = htmlContent;
            }
        }
        resultContent.appendChild(bubble);
        return bubble;
    } catch (err) {
        console.error('[APP] Chat message render error:', err);
        return null;
    }
}

async function performSearch(isF10 = false) {
    if (!searchBtn || searchBtn.disabled) return;
    if (!promptInput || !modelSelect) return;

    const text = promptInput.value.trim();
    const modelSelection = modelSelect.value;
    if (!text || !modelSelection) return;

    const parts = modelSelection.split('|');
    const provider = parts[0] || '';
    const modelId = parts[1] || '';
    const baseUrl = parts[2] || '';
    const apiKey = parts[3] || '';

    promptInput.value = '';
    promptInput.style.height = 'auto';
    currentRawResponse = '';
    searchBtn.disabled = true;

    let loadingBubble = null;

    try {
        if (conversationHistory.length === 0) {
            if (resultContent) resultContent.innerHTML = '';
            const fullSystemPrompt = Config.buildSystemPrompt(userConfig);
            if (fullSystemPrompt && provider === 'ollama') {
                conversationHistory.push({ role: 'system', content: fullSystemPrompt });
            }
        }

        const userMsg = { role: 'user', content: text };
        conversationHistory.push(userMsg);
        appendChatMessage(userMsg);

        loadingBubble = document.createElement('div');
        loadingBubble.className = 'chat-message-ai';
        UI.showLoading(loadingBubble);
        if (resultContent) resultContent.appendChild(loadingBubble);
        setTimeout(() => { if (chatStage) chatStage.scrollTop = chatStage.scrollHeight; }, 10);
        if (chatStage) chatStage.scrollTop = chatStage.scrollHeight;

        let reasoningHtml = '';

        if (provider === 'ollama') {
            const responseData = await API.generateOllamaResponse(baseUrl, {
                model: modelId,
                messages: conversationHistory,
                stream: false
            });
            currentRawResponse = responseData?.message?.content || responseData?.response || '';
        } else if (provider === 'openrouter') {
            const orMessages = conversationHistory.filter(m => m.role !== 'system');
            const fullSystemPrompt = Config.buildSystemPrompt(userConfig);
            const data = await API.generateOpenRouterResponse(apiKey, {
                model: modelId,
                messages: orMessages,
                system_prompt: fullSystemPrompt || undefined,
                reasoning: { enabled: true }
            });
            if (data && data.choices && data.choices[0]) {
                const msg = data.choices[0].message;
                currentRawResponse = msg ? (msg.content || '') : '';
                if (msg && msg.reasoning_details) reasoningHtml = UI.renderReasoningTrace(msg.reasoning_details);
            }
        }

        const aiMsg = {
            role: 'assistant',
            content: currentRawResponse,
            reasoningHtml
        };
        conversationHistory.push(aiMsg);

        if (loadingBubble && loadingBubble.parentNode) {
            loadingBubble.parentNode.removeChild(loadingBubble);
        }
        appendChatMessage(aiMsg);

        if (isF10 && currentRawResponse) {
            try { window.electronAPI.sendAiResponseToIsland(currentRawResponse); } catch (_) {}
        }

    } catch (err) {
        console.error('[APP] Search error:', err);
        const errorMsg = {
            role: 'assistant',
            content: err.message || 'An unexpected error occurred',
            isError: true
        };
        conversationHistory.push(errorMsg);

        if (loadingBubble && loadingBubble.parentNode) {
            loadingBubble.parentNode.removeChild(loadingBubble);
        }
        appendChatMessage(errorMsg);

        if (isF10) {
            try { window.electronAPI.sendAiResponseToIsland('Error: Could not reach AI'); } catch (_) {}
        }
    } finally {
        searchBtn.disabled = false;
        setTimeout(() => {
            if (chatStage) chatStage.scrollTo({ top: chatStage.scrollHeight, behavior: 'smooth' });
        }, 50);
    }
}

init();
