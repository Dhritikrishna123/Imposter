const { ipcMain, desktopCapturer, nativeImage, app, net } = require('electron');
const Tesseract = require('tesseract.js');
const { getMainWindow, createIslandWindow, closeIslandWindow, closeSnipperWindow } = require('./window-manager');
const { startTranscription, stopTranscription, sendAudioChunk, testConnection } = require('./transcription');

let handlersRegistered = false;

function registerIpcHandlers() {
    if (handlersRegistered) return;
    handlersRegistered = true;

    ipcMain.handle('get-desktop-source-id', async () => {
        try {
            const sources = await desktopCapturer.getSources({ 
                types: ['screen'],
                thumbnailSize: { width: 0, height: 0 }
            });
            return sources.length > 0 ? sources[0].id : null;
        } catch (err) {
            console.error('Desktop source error:', err);
            return null;
        }
    });

    ipcMain.handle('test-assembly-key', async (event, apiKey) => {
        return await testConnection(apiKey);
    });

    ipcMain.handle('start-transcription', async (event, apiKeyFromRenderer) => {
        const apiKey = apiKeyFromRenderer || process.env.ASSEMBLY_AI_API_KEY || process.env.ASSEMBLY_API;
        if (!apiKey) return false;
        return startTranscription(apiKey);
    });

    ipcMain.on('stop-transcription', stopTranscription);
    ipcMain.on('send-audio-chunk', (event, chunk) => sendAudioChunk(chunk));

    ipcMain.on('snip-crop', async (event, { x, y, width, height, source }) => {
        closeSnipperWindow();
        try {
            const img = nativeImage.createFromDataURL(source);
            const cropped = img.crop({ 
                x: Math.floor(x), y: Math.floor(y), 
                width: Math.floor(width), height: Math.floor(height) 
            });
            
            Tesseract.recognize(cropped.toPNG(), 'eng')
                .then(({ data: { text } }) => {
                    const mainWindow = getMainWindow();
                    if (text.trim() && mainWindow) {
                        mainWindow.webContents.send('ocr-result', text.trim());
                    }
                })
                .catch(console.error);
        } catch (err) {
            console.error('OCR error:', err);
        }
    });

    ipcMain.on('cancel-snip', closeSnipperWindow);

    ipcMain.on('set-app-mode', (event, mode) => {
        const mainWindow = getMainWindow();
        if (!mainWindow) return;
        if (mode === 'normal') {
            mainWindow.setSkipTaskbar(false);
            mainWindow.setAlwaysOnTop(false);
            mainWindow.setResizable(true);
            mainWindow.setContentProtection(false);
        } else {
            mainWindow.setSkipTaskbar(true);
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.setResizable(false);
            mainWindow.setContentProtection(true);
        }
    });

    ipcMain.handle('ollama-call', async (event, { url, options }) => {
        try {
            if (!url) return { error: 'No URL' };
            const response = await net.fetch(url, options);
            if (!response.ok) {
                const text = await response.text();
                return { error: true, status: response.status, message: text };
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('IPC Ollama error:', error.message);
            return { error: true, message: error.message };
        }
    });

    ipcMain.on('minimize-app', () => {
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('close-app', () => app.quit());
    ipcMain.on('restart-app', () => {
        app.relaunch();
        app.exit(0);
    });

    ipcMain.on('open-island-window', () => {
        const path = require('path');
        createIslandWindow(path.join(__dirname, 'preload.js'));
    });
    
    ipcMain.on('close-island-window', closeIslandWindow);
}

module.exports = { registerIpcHandlers };
