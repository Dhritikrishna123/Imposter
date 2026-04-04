export const CONFIG_KEY = 'imposter_config';
export const MODELS_KEY = 'imposter_models';

export function getSavedConfig() {
    const saved = localStorage.getItem(CONFIG_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    if (parsed && !parsed.appMode) parsed.appMode = 'stealth';
    return parsed;
}

export function saveConfig(name, systemPrompt, appMode = 'stealth') {
    const config = { name, systemPrompt, appMode };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return config;
}

export function getSavedModels() {
    const saved = localStorage.getItem(MODELS_KEY);
    return saved ? JSON.parse(saved) : [];
}

export function saveModels(models) {
    localStorage.setItem(MODELS_KEY, JSON.stringify(models));
    return models;
}
