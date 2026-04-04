const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onLoadImage: (callback) => ipcRenderer.on('load-image', (event, source) => callback(source)),
    snipCrop: (rect) => ipcRenderer.send('snip-crop', rect),
    cancelSnip: () => ipcRenderer.send('cancel-snip')
});
