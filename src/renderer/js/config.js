export const CONFIG_KEY = 'imposter_config';
export const MODELS_KEY = 'imposter_models';

export const getSavedConfig = () => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved) : null;
};

export const getDefaultConfig = () => ({
    name: '',
    systemPrompt: 'You are an expert technical interviewer. Help the candidate with concise, accurate, and professional answers based on the transcription.',
    appMode: 'stealth',
    assemblyKey: ''
});

export const saveConfig = (name, systemPrompt, appMode, assemblyKey) => {
    const config = { name, systemPrompt, appMode, assemblyKey };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return config;
};

export function getSavedModels() {
    const saved = localStorage.getItem(MODELS_KEY);
    return saved ? JSON.parse(saved) : [];
}

export function saveModels(models) {
    localStorage.setItem(MODELS_KEY, JSON.stringify(models));
    return models;
}
