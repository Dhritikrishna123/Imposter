const { app, session, BrowserWindow } = require('electron');
const path = require('path');
require('dotenv').config();

const { createMainWindow } = require('./window-manager');
const { registerShortcuts, unregisterShortcuts } = require('./shortcuts');
const { registerIpcHandlers } = require('./ipc-handlers');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        const { getMainWindow } = require('./window-manager');
        const mainWindow = getMainWindow();
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.commandLine.appendSwitch('disable-gpu-cache');

    app.whenReady().then(async () => {
        // 1. Initialize IPC FIRST
        registerIpcHandlers();
        
        // 2. Initialize Shortcuts
        registerShortcuts();

        // 3. Optimize networking
        session.defaultSession.setProxy({
            proxyRules: 'direct://',
            proxyBypassRules: '127.0.0.1,localhost'
        });

        // 4. Auto-approve display media requests (for audio capture)
        //    This replaces the deprecated chromeMediaSource: 'desktop' API
        const { desktopCapturer } = require('electron');
        session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
            try {
                const sources = await desktopCapturer.getSources({ types: ['screen'] });
                if (sources.length > 0) {
                    callback({ video: sources[0], audio: 'loopback' });
                } else {
                    callback({});
                }
            } catch (err) {
                console.error('Display media handler error:', err);
                callback({});
            }
        });

        // 5. Create Window LAST
        createMainWindow(path.join(__dirname, 'preload.js'));

        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createMainWindow(path.join(__dirname, 'preload.js'));
        });
    });
}

app.on('will-quit', unregisterShortcuts);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
