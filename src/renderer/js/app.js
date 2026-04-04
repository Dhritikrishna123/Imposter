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

// Buttons
const saveConfigBtn = document.getElementById('save-config-btn');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');

// State
let userConfig = { name: '', systemPrompt: '' };
let currentRawResponse = '';

async function init() {
    setupMarkdown();
    loadAppConfig();
    await loadModels();
    setupEventListeners();
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
    const models = await API.fetchModels();
    if (models) {
        modelSelect.innerHTML = '';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.textContent = m.name;
            modelSelect.appendChild(opt);
        });
        statusDot.className = 'dot online';
        statusText.textContent = 'Ready';
    } else {
        statusDot.className = 'dot offline';
        statusText.textContent = 'Ollama Offline';
    }
}

function setupEventListeners() {
    // Input Auto-grow
    promptInput.addEventListener('input', () => UI.autoGrowTextarea(promptInput));

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
    if (!text || !modelSelect.value) return;

    promptInput.value = '';
    promptInput.style.height = 'auto';
    currentRawResponse = '';
    
    UI.showLoading(resultContent);
    searchBtn.disabled = true;

    try {
        const baseUrl = statusDot.classList.contains('online') ? 
            (modelSelect.innerHTML.includes('127.0.0.1') ? 'http://127.0.0.1:11434' : 'http://localhost:11434') : 
            'http://127.0.0.1:11434';

        let prompt = text;
        if (userConfig.systemPrompt) {
            prompt = `System: ${userConfig.systemPrompt}\n\nUser: ${text}`;
        }

        const data = await API.generateResponse(baseUrl, {
            model: modelSelect.value,
            prompt,
            stream: false
        });

        currentRawResponse = data.response;
        resultContent.innerHTML = parseMarkdown(data.response);
    } catch (err) {
        UI.showError(resultContent, err);
    } finally {
        searchBtn.disabled = false;
        chatStage.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

init();
