export const CONFIG_KEY = 'imposter_config';
export const MODELS_KEY = 'imposter_models';

export function getSavedConfig() {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved) : null;
}

export function saveConfig(name, systemPrompt) {
    const config = { name, systemPrompt };
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
