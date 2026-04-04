const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onFocusInput: (callback) => ipcRenderer.on('focus-input', callback),
    onTriggerSearch: (callback) => ipcRenderer.on('trigger-search', callback),
    onScroll: (callback) => ipcRenderer.on('scroll', (event, ...args) => callback(...args)),
    onCopyMain: (callback) => ipcRenderer.on('copy-main', (event, ...args) => callback(...args)),
    ollamaCall: (url, options) => ipcRenderer.invoke('ollama-call', { url, options }),
    setAppMode: (mode) => ipcRenderer.send('set-app-mode', mode),
    minimizeApp: () => ipcRenderer.send('minimize-app'),
    closeApp: () => ipcRenderer.send('close-app'),
    restartApp: () => ipcRenderer.send('restart-app'),
    onOcrResult: (callback) => ipcRenderer.on('ocr-result', (event, text) => callback(text))
});
