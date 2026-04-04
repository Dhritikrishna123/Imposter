export const CONFIG_KEY = 'imposter_config';

export function getSavedConfig() {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved) : null;
}

export function saveConfig(name, systemPrompt) {
    const config = { name, systemPrompt };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    return config;
}
