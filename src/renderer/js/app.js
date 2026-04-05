import * as API from './api.js';
import * as Config from './config.js';
import * as UI from './ui.js';
import { setupMarkdown, parseMarkdown } from './markdown.js';
import { AssemblyService } from './assembly-service.js';

// DOM Elements
const promptInput = document.getElementById('prompt-input');
const searchBtn = document.getElementById('search-btn');
const resultContent = document.getElementById('result-content');
const modelSelect = document.getElementById('modelSelect');
const statusDot = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const chatStage = document.getElementById('chat-stage');
const clearChatBtn = document.getElementById('clear-chat-btn');

// Overlays
const onboardingOverlay = document.getElementById('onboarding-overlay');
const settingsOverlay = document.getElementById('settings-overlay');

// Form Inputs
const userNameInput = document.getElementById('user-name');
const systemPromptInput = document.getElementById('system-prompt');
const settingsNameInput = document.getElementById('settings-name');
const settingsPromptInput = document.getElementById('settings-prompt');
const settingsAppMode = document.getElementById('settings-app-mode');
const settingsAssemblyKey = document.getElementById('settings-assembly-key');
const voiceTestStatus = document.getElementById('voice-test-status');

// Window Controls
const windowControls = document.getElementById('window-controls');
const winMinBtn = document.getElementById('win-min-btn');
const winCloseBtn = document.getElementById('win-close-btn');

// Model Management Elements
const customModelsList = document.getElementById('custom-models-list');
const newModelProvider = document.getElementById('new-model-provider');
const newModelLabel = document.getElementById('new-model-label');
const newModelId = document.getElementById('new-model-id');
const newModelKey = document.getElementById('new-model-key');
const newModelUrl = document.getElementById('new-model-url');
const addModelBtn = document.getElementById('add-model-btn');
const apiKeyGroup = document.getElementById('api-key-group');
const baseUrlGroup = document.getElementById('base-url-group');

// Buttons
const saveConfigBtn = document.getElementById('save-config-btn');
const settingsBtn = document.getElementById('settings-link');
const testVoiceBtn = document.getElementById('test-voice-btn');
const saveSettingsBtn = document.getElementById('save-settings');

// State
let userConfig = Config.getDefaultConfig();
let customModels = [];
let currentRawResponse = '';
let isRecording = false;

// Context Memory
let conversationHistory = [];
let emptyStateHtml = '';

async function init() {
    setupMarkdown();
    loadAppConfig();

    emptyStateHtml = resultContent.innerHTML;
    customModels = Config.getSavedModels();
    applyAppMode(userConfig.appMode || 'stealth');
    await loadModels();
    setupEventListeners();
    renderCustomModelsList();
}

function applyAppMode(mode) {
    if (window.electronAPI && window.electronAPI.setAppMode) {
        window.electronAPI.setAppMode(mode);
    }
    if (mode === 'normal') {
        windowControls.style.display = 'flex';
    } else {
        windowControls.style.display = 'none';
    }
}

function loadAppConfig() {
    const saved = Config.getSavedConfig();
    if (saved) {
        userConfig = saved;
        onboardingOverlay.classList.add('hidden');
        UI.updateGreeting(document.getElementById('greeting-container'), userConfig.name);
    } else {
        onboardingOverlay.classList.remove('hidden');
    }
}

async function loadModels() {
    statusDot.className = 'dot offline';
    statusText.textContent = 'Scanning...';

    const ollamaModels = await API.fetchModels();
    modelSelect.innerHTML = '';

    if (ollamaModels) {
        ollamaModels.forEach(m => {
            const opt = document.createElement('option');
            opt.value = `ollama|${m.name}|http://127.0.0.1:11434`;
            opt.textContent = `Local: ${m.name}`;
            modelSelect.appendChild(opt);
        });
    }

    if (customModels && customModels.length > 0) {
        customModels.forEach(m => {
            const opt = document.createElement('option');
            opt.value = `${m.provider}|${m.modelId}|${m.baseUrl}|${m.apiKey}`;
            opt.textContent = `${m.name}`;
            modelSelect.appendChild(opt);
        });
    }

    if (modelSelect.options.length > 0) {
        statusDot.className = 'dot online';
        statusText.textContent = 'Ready';
    } else {
        statusText.textContent = 'No Models';
    }
}

function renderCustomModelsList() {
    if (!customModelsList) return;
    customModelsList.innerHTML = '';
    customModels.forEach((m, index) => {
        const item = document.createElement('div');
        item.className = 'model-item';
        item.innerHTML = `
            <div class="model-info">
                <strong>${m.name}</strong>
                <span>${m.provider} - ${m.modelId}</span>
            </div>
            <button class="secondary-btn delete-model-btn" data-index="${index}" style="padding: 6px 12px; font-size: 12px; color: #ff6b6b; border-color: rgba(255, 107, 107, 0.3);">Remove</button>
        `;
        customModelsList.appendChild(item);
    });

    document.querySelectorAll('.delete-model-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = btn.getAttribute('data-index');
            customModels.splice(index, 1);
            Config.saveModels(customModels);
            renderCustomModelsList();
            loadModels();
        });
    });
}

function setupEventListeners() {
    promptInput.addEventListener('input', () => UI.autoGrowTextarea(promptInput));

    newModelProvider.addEventListener('change', () => {
        const provider = newModelProvider.value;
        apiKeyGroup.style.display = provider === 'openrouter' ? 'block' : 'none';
        baseUrlGroup.style.display = provider === 'ollama' ? 'block' : 'none';
        if (provider === 'openrouter') {
            newModelId.placeholder = 'e.g. qwen/qwen3.6-plus:free';
            newModelUrl.value = '';
        } else {
            newModelId.placeholder = 'e.g. llama3';
            newModelUrl.value = 'http://127.0.0.1:11434';
        }
    });

    addModelBtn.addEventListener('click', () => {
        const name = newModelLabel.value.trim();
        const modelId = newModelId.value.trim();
        const provider = newModelProvider.value;
        const apiKey = newModelKey.value.trim();
        const baseUrl = newModelUrl.value.trim();

        if (name && modelId) {
            customModels.push({ name, modelId, provider, apiKey, baseUrl });
            Config.saveModels(customModels);
            renderCustomModelsList();
            loadModels();
            newModelLabel.value = '';
            newModelId.value = '';
            newModelKey.value = '';
        }
    });

    searchBtn.addEventListener('click', performSearch);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            performSearch();
        }
    });

    settingsBtn.addEventListener('click', () => {
        settingsNameInput.value = userConfig.name;
        settingsPromptInput.value = userConfig.systemPrompt;
        settingsAppMode.value = userConfig.appMode || 'stealth';
        settingsAssemblyKey.value = userConfig.assemblyKey || '';
        settingsOverlay.classList.remove('hidden');
    });

    document.getElementById('close-settings').addEventListener('click', () => settingsOverlay.classList.add('hidden'));

    saveSettingsBtn.addEventListener('click', () => {
        const name = settingsNameInput.value.trim();
        const prompt = settingsPromptInput.value.trim();
        const appMode = settingsAppMode.value;
        const assemblyKey = settingsAssemblyKey.value.trim();

        if (name) {
            userConfig = Config.saveConfig(name, prompt, appMode, assemblyKey);
            UI.updateGreeting(document.getElementById('greeting-container'), userConfig.name);
            applyAppMode(appMode);
            settingsOverlay.classList.add('hidden');
            statusText.textContent = 'Settings Saved';
            setTimeout(() => statusText.textContent = 'Ready', 2000);
        }
    });

    testVoiceBtn.addEventListener('click', async () => {
        const key = settingsAssemblyKey.value.trim();
        if (!key) {
            voiceTestStatus.textContent = '❌ Please enter an API key';
            return;
        }

        voiceTestStatus.textContent = 'Testing...';
        const result = await window.electronAPI.testAssemblyKey(key);
        if (result.success) {
            voiceTestStatus.textContent = '✅ Connection Successful!';
            voiceTestStatus.style.color = '#00ffcc';
        } else {
            voiceTestStatus.textContent = `❌ Failed: ${result.error}`;
            voiceTestStatus.style.color = '#ff4d4d';
        }
    });

    saveConfigBtn.addEventListener('click', () => {
        const name = userNameInput.value.trim();
        const prompt = systemPromptInput.value.trim();
        if (name) {
            userConfig = Config.saveConfig(name, prompt, 'stealth', '');
            onboardingOverlay.classList.add('hidden');
            if (conversationHistory.length === 0) {
                UI.updateGreeting(resultContent.querySelector('#greeting-container'), userConfig.name);
            }
        }
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-pane').forEach(p => {
                p.classList.toggle('active', p.id === `tab-${tabId}`);
            });
            saveSettingsBtn.style.display = (tabId === 'shortcuts' || tabId === 'about') ? 'none' : 'block';
        });
    });

    if (winMinBtn) winMinBtn.addEventListener('click', () => window.electronAPI.minimizeApp());
    if (winCloseBtn) winCloseBtn.addEventListener('click', () => window.electronAPI.closeApp());

    window.electronAPI.onFocusInput(() => promptInput.focus());
    window.electronAPI.onTriggerSearch(() => performSearch());
    window.electronAPI.onScroll((dir) => chatStage.scrollBy({ top: dir * 150, behavior: 'smooth' }));
    window.electronAPI.onCopyMain(() => {
        if (currentRawResponse) {
            navigator.clipboard.writeText(currentRawResponse);
            statusText.textContent = 'Copied!';
            setTimeout(() => statusText.textContent = 'Ready', 2000);
        }
    });

    window.electronAPI.onTriggerAiSearch(() => {
        const lastTranscript = AssemblyService.getLastFinalTranscript();
        if (lastTranscript) {
            window.electronAPI.sendAiResponseToIsland('thinking...');
            promptInput.value = lastTranscript;
            performSearch(true);
        }
    });

    window.electronAPI.onToggleAutoReply(async () => {
        if (isRecording) {
            AssemblyService.stop();
            window.electronAPI.closeIslandWindow();
            isRecording = false;
            statusText.textContent = 'Ready';
        } else {
            try {
                if (!userConfig.assemblyKey) {
                    statusText.textContent = 'Missing API Key';
                    return;
                }

                statusText.textContent = 'Connecting...';
                const started = await AssemblyService.start(userConfig.assemblyKey);

                if (started) {
                    window.electronAPI.openIslandWindow();
                    isRecording = true;
                    statusText.textContent = 'Live • Recording';
                } else {
                    statusText.textContent = 'Failed to Start';
                }
            } catch (err) {
                statusText.textContent = 'Mic Error';
            }
        }
    });

    if (window.electronAPI.onOcrResult) {
        window.electronAPI.onOcrResult((text) => {
            promptInput.value += (promptInput.value ? '\n' : '') + text;
            UI.autoGrowTextarea(promptInput);
            promptInput.focus();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            settingsOverlay.classList.add('hidden');
            onboardingOverlay.classList.add('hidden');
        }
    });
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            conversationHistory = [];
            resultContent.innerHTML = emptyStateHtml;
            UI.updateGreeting(resultContent.querySelector('#greeting-container'), userConfig.name);
        });
    }
}

function appendChatMessage(msg) {
    if (msg.role === 'system') return null;

    if (conversationHistory.length === 1 && conversationHistory[0] === msg) {
        resultContent.innerHTML = '';
    }

    const bubble = document.createElement('div');
    if (msg.role === 'user') {
        bubble.className = 'chat-message-user';
        bubble.textContent = msg.content;
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
}

async function performSearch(isF10 = false) {
    if (searchBtn.disabled) return;
    const text = promptInput.value.trim();
    const modelSelection = modelSelect.value;
    if (!text || !modelSelection) return;

    const [provider, modelId, baseUrl, apiKey] = modelSelection.split('|');
    promptInput.value = '';
    promptInput.style.height = 'auto';
    currentRawResponse = '';
    searchBtn.disabled = true;

    if (conversationHistory.length === 0) {
        resultContent.innerHTML = '';
        if (userConfig.systemPrompt && provider === 'ollama') {
            conversationHistory.push({ role: 'system', content: userConfig.systemPrompt });
        }
    }

    const userMsg = { role: 'user', content: text };
    conversationHistory.push(userMsg);
    appendChatMessage(userMsg);

    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-message-ai';
    UI.showLoading(loadingBubble);
    resultContent.appendChild(loadingBubble);
    setTimeout(() => { chatStage.scrollTop = chatStage.scrollHeight; }, 10);
    chatStage.scrollTop = chatStage.scrollHeight;

    try {
        let responseData;
        let reasoningHtml = '';

        if (provider === 'ollama') {
            responseData = await API.generateOllamaResponse(baseUrl, {
                model: modelId,
                messages: conversationHistory,
                stream: false
            });
            currentRawResponse = responseData.message?.content || responseData.response || '';
        } else if (provider === 'openrouter') {
            const orMessages = conversationHistory.filter(m => m.role !== 'system');
            const data = await API.generateOpenRouterResponse(apiKey, {
                model: modelId,
                messages: orMessages,
                system_prompt: userConfig.systemPrompt || undefined,
                reasoning: { enabled: true }
            });
            if (data.choices && data.choices[0]) {
                const msg = data.choices[0].message;
                currentRawResponse = msg.content;
                if (msg.reasoning_details) reasoningHtml = UI.renderReasoningTrace(msg.reasoning_details);
            }
        }

        const aiMsg = {
            role: 'assistant',
            content: currentRawResponse,
            reasoningHtml
        };
        conversationHistory.push(aiMsg);

        // Replace loading UI with actual content block logic instead of recreating everything
        resultContent.removeChild(loadingBubble);
        appendChatMessage(aiMsg);

        if (isF10 && currentRawResponse) {
            window.electronAPI.sendAiResponseToIsland(currentRawResponse);
        }

    } catch (err) {
        const errorMsg = {
            role: 'assistant',
            content: err.message,
            isError: true
        };
        conversationHistory.push(errorMsg);
        resultContent.removeChild(loadingBubble);
        appendChatMessage(errorMsg);

        if (isF10) window.electronAPI.sendAiResponseToIsland('Error: Could not reach AI');
    } finally {
        searchBtn.disabled = false;
        setTimeout(() => { chatStage.scrollTo({ top: chatStage.scrollHeight, behavior: 'smooth' }); }, 50);
    }
}

init();
