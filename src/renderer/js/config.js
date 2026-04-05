export const CONFIG_KEY = 'imposter_config';
export const MODELS_KEY = 'imposter_models';

export const getSavedConfig = () => {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        // Validate shape — merge with defaults to fill missing keys
        return { ...getDefaultConfig(), ...parsed };
    } catch (err) {
        console.error('[CONFIG] Failed to load saved config:', err);
        return null;
    }
};

export const getDefaultConfig = () => ({
    name: '',
    systemPrompt: 'You are an expert technical interviewer. Help the candidate with concise, accurate, and professional answers based on the transcription.',
    appMode: 'stealth',
    assemblyKey: '',
    resumeContent: '',
    jobDescription: '',
    persona: 'engineer'
});

export const saveConfig = (name, systemPrompt, appMode, assemblyKey, extra = {}) => {
    try {
        const config = { name, systemPrompt, appMode, assemblyKey, ...extra };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        return config;
    } catch (err) {
        console.error('[CONFIG] Failed to save config:', err);
        return { name, systemPrompt, appMode, assemblyKey, ...extra };
    }
};

export function buildSystemPrompt(config) {
    try {
        let prompt = config.systemPrompt || '';

        if (config.persona && config.persona !== 'default') {
            const personas = {
                engineer: 'Answer as a hands-on Software Engineer. Focus on implementation details, code quality, and problem-solving.',
                frontend: 'Answer as a Frontend Engineer. Focus on UI/UX, React/Vue/Angular, CSS architecture, performance optimization, and accessibility.',
                backend: 'Answer as a Backend Engineer. Focus on APIs, databases, server architecture, authentication, caching, and scalability patterns.',
                fullstack: 'Answer as a Full Stack Engineer. Cover both frontend and backend concerns. Show breadth across the entire stack.',
                mobile: 'Answer as a Mobile App Developer. Focus on React Native, Flutter, Swift, or Kotlin. Cover app lifecycle, state management, and platform-specific APIs.',
                devops: 'Answer as a DevOps / Cloud Engineer. Focus on CI/CD, Docker, Kubernetes, AWS/GCP/Azure, infrastructure-as-code, and monitoring.',
                ml: 'Answer as an ML / AI Engineer. Focus on model training, data pipelines, feature engineering, MLOps, and inference optimization.',
                qa: 'Answer as a QA / Test Engineer. Focus on testing strategies, automation frameworks, CI integration, edge cases, and quality metrics.',
                architect: 'Answer as a Senior System Architect. Focus on high-level design, scalability, trade-offs, and distributed systems.',
                manager: 'Answer as an Engineering Manager. Focus on leadership, team dynamics, project delivery, and stakeholder communication.',
                analyst: 'Answer as a Data/Business Analyst. Focus on metrics, data-driven decisions, and analytical frameworks.',
                product: 'Answer as a Product Manager. Focus on user stories, roadmap prioritization, stakeholder alignment, and product metrics.'
            };
            if (personas[config.persona]) {
                prompt += `\n\n[PERSONA]: ${personas[config.persona]}`;
            }
        }

        if (config.resumeContent && config.resumeContent.trim()) {
            prompt += `\n\n[CANDIDATE RESUME / EXPERIENCE]:\n${config.resumeContent.trim()}`;
        }

        if (config.jobDescription && config.jobDescription.trim()) {
            prompt += `\n\n[TARGET JOB DESCRIPTION]:\n${config.jobDescription.trim()}\n\nPrioritize skills and technologies mentioned in this JD when answering.`;
        }

        return prompt;
    } catch (err) {
        console.error('[CONFIG] Failed to build system prompt:', err);
        return config.systemPrompt || '';
    }
}

export function getSavedModels() {
    try {
        const saved = localStorage.getItem(MODELS_KEY);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error('[CONFIG] Failed to load saved models:', err);
        return [];
    }
}

export function saveModels(models) {
    try {
        localStorage.setItem(MODELS_KEY, JSON.stringify(models));
    } catch (err) {
        console.error('[CONFIG] Failed to save models:', err);
    }
    return models;
}
