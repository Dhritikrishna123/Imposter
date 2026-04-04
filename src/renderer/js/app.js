import * as API from './api.js';
import * as Config from './config.js';
import * as UI from './ui.js';
import { setupMarkdown, parseMarkdown } from './markdown.js';

// DOM Elements
const promptInput = document.getElementById('prompt-input');
const searchBtn = document.getElementById('search-btn');
const resultContent = document.getElementById('result-content');
const modelSelect = document.getElementById('modelSelect');
const statusDot = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const chatStage = document.getElementById('chat-stage');
const greetingContainer = document.getElementById('greeting-container');

// Overlays
const onboardingOverlay = document.getElementById('onboarding-overlay');
const settingsOverlay = document.getElementById('settings-overlay');

// Form Inputs
const userNameInput = document.getElementById('user-name');
const systemPromptInput = document.getElementById('system-prompt');
const settingsNameInput = document.getElementById('settings-name');
const settingsPromptInput = document.getElementById('settings-prompt');

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
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');

// State
let userConfig = { name: '', systemPrompt: '' };
let customModels = [];
let currentRawResponse = '';

async function init() {
    setupMarkdown();
    loadAppConfig();
    customModels = Config.getSavedModels();
    await loadModels();
    setupEventListeners();
    renderCustomModelsList();
}

function loadAppConfig() {
    const saved = Config.getSavedConfig();
    if (saved) {
        userConfig = saved;
        onboardingOverlay.classList.add('hidden');
        UI.updateGreeting(greetingContainer, userConfig.name);
    } else {
        onboardingOverlay.classList.remove('hidden');
    }
}

async function loadModels() {
    statusDot.className = 'dot offline';
    statusText.textContent = 'Scanning...';
    
    const ollamaModels = await API.fetchModels();
    modelSelect.innerHTML = '';

    // Add Ollama Models
    if (ollamaModels) {
        ollamaModels.forEach(m => {
            const opt = document.createElement('option');
            opt.value = `ollama|${m.name}|http://127.0.0.1:11434`;
            opt.textContent = `Local: ${m.name}`;
            modelSelect.appendChild(opt);
        });
        statusDot.className = 'dot online';
        statusText.textContent = 'Ready';
    }

    // Add Custom Models
    customModels.forEach(m => {
        const opt = document.createElement('option');
        const providerName = m.provider === 'openrouter' ? 'OpenRouter' : 'Custom';
        opt.value = `${m.provider}|${m.modelId}|${m.baseUrl || ''}|${m.apiKey || ''}`;
        opt.textContent = `${providerName}: ${m.name}`;
        modelSelect.appendChild(opt);
    });

    if (modelSelect.options.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = 'No models found';
        modelSelect.appendChild(opt);
        statusText.textContent = 'No Models';
    } else if (!ollamaModels && statusDot.className === 'dot offline') {
         statusText.textContent = 'Ollama Offline';
    }
}

function renderCustomModelsList() {
    if (!customModelsList) return;
    
    if (customModels.length === 0) {
        customModelsList.innerHTML = '<div class="models-list-empty">No custom models registered</div>';
        return;
    }

    customModelsList.innerHTML = customModels.map((m, index) => `
        <div class="model-item">
            <div class="model-info">
                <span class="model-name">${m.name}</span>
                <span class="model-provider">${m.provider.toUpperCase()} - ${m.modelId}</span>
            </div>
            <button class="remove-model-btn" data-index="${index}" title="Remove Model">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </div>
    `).join('');

    // Attach delete listeners
    customModelsList.querySelectorAll('.remove-model-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.getAttribute('data-index'));
            customModels.splice(index, 1);
            Config.saveModels(customModels);
            renderCustomModelsList();
            loadModels();
        });
    });
}

function setupEventListeners() {
    // Input Auto-grow
    promptInput.addEventListener('input', () => UI.autoGrowTextarea(promptInput));

    // Provider Change in Form
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

    // Add Model Action
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
            
            // Clear fields
            newModelLabel.value = '';
            newModelId.value = '';
            newModelKey.value = '';
        }
    });

    // Search Interaction
    searchBtn.addEventListener('click', performSearch);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            performSearch();
        }
    });

    // Settings Toggle
    settingsBtn.addEventListener('click', () => {
        settingsNameInput.value = userConfig.name;
        settingsPromptInput.value = userConfig.systemPrompt;
        settingsOverlay.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => settingsOverlay.classList.add('hidden'));

    saveSettingsBtn.addEventListener('click', () => {
        const name = settingsNameInput.value.trim();
        const prompt = settingsPromptInput.value.trim();
        if (name) {
            userConfig = Config.saveConfig(name, prompt);
            UI.updateGreeting(greetingContainer, userConfig.name);
            settingsOverlay.classList.add('hidden');
            statusText.textContent = 'Settings Saved';
            setTimeout(() => statusText.textContent = 'Ready', 2000);
        }
    });

    // Onboarding
    saveConfigBtn.addEventListener('click', () => {
        const name = userNameInput.value.trim();
        const prompt = systemPromptInput.value.trim();
        if (name) {
            userConfig = Config.saveConfig(name, prompt);
            onboardingOverlay.classList.add('hidden');
            UI.updateGreeting(greetingContainer, userConfig.name);
        }
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-pane').forEach(p => {
                p.classList.toggle('active', p.id === `tab-${tabId}`);
            });
        });
    });

    // Global IPC Events
    window.electronAPI.onFocusInput(() => promptInput.focus());
    window.electronAPI.onTriggerSearch(() => performSearch());
    window.electronAPI.onScroll((dir) => {
        chatStage.scrollBy({ top: dir * 150, behavior: 'smooth' });
    });
    window.electronAPI.onCopyMain(() => {
        if (currentRawResponse) {
            navigator.clipboard.writeText(currentRawResponse);
            statusText.textContent = 'Copied!';
            setTimeout(() => statusText.textContent = 'Ready', 2000);
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            settingsOverlay.classList.add('hidden');
            onboardingOverlay.classList.add('hidden');
        }
    });
}

async function performSearch() {
    const text = promptInput.value.trim();
    const modelSelection = modelSelect.value;
    if (!text || !modelSelection) return;

    const [provider, modelId, baseUrl, apiKey] = modelSelection.split('|');

    promptInput.value = '';
    promptInput.style.height = 'auto';
    currentRawResponse = '';
    
    UI.showLoading(resultContent);
    searchBtn.disabled = true;

    try {
        let responseData;
        let reasoningHtml = '';

        if (provider === 'ollama') {
            const prompt = userConfig.systemPrompt ? 
                `System: ${userConfig.systemPrompt}\n\nUser: ${text}` : text;
            
            responseData = await API.generateOllamaResponse(baseUrl, {
                model: modelId,
                prompt,
                stream: false
            });
            currentRawResponse = responseData.response;
        } else if (provider === 'openrouter') {
            const messages = [{ role: 'user', content: text }];
            
            const data = await API.generateOpenRouterResponse(apiKey, {
                model: modelId,
                messages: messages,
                system_prompt: userConfig.systemPrompt || undefined,
                reasoning: { enabled: true }
            });
            
            if (data.choices && data.choices[0]) {
                const msg = data.choices[0].message;
                currentRawResponse = msg.content;
                if (msg.reasoning_details) {
                    reasoningHtml = UI.renderReasoningTrace(msg.reasoning_details);
                }
            } else {
                throw new Error("No response from OpenRouter");
            }
        }

        resultContent.innerHTML = reasoningHtml + parseMarkdown(currentRawResponse);
    } catch (err) {
        UI.showError(resultContent, err);
    } finally {
        searchBtn.disabled = false;
        chatStage.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

init();
