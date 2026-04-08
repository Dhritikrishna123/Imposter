const { globalShortcut, app, screen, desktopCapturer } = require('electron');
const { getMainWindow, createIslandWindow, createSnipperWindow } = require('./window-manager');
const path = require('path');

function safeRegister(accelerator, callback) {
    try {
        const success = globalShortcut.register(accelerator, callback);
        if (!success) console.warn(`[SHORTCUT] Failed to register: ${accelerator}`);
    } catch (err) {
        console.error(`[SHORTCUT] Error registering "${accelerator}":`, err.message);
    }
}

function safeSend(channel, ...args) {
    try {
        const win = getMainWindow();
        if (win && !win.isDestroyed() && win.webContents) {
            win.webContents.send(channel, ...args);
        }
    } catch (err) {
        console.error(`[SHORTCUT] Failed to send "${channel}":`, err.message);
    }
}

function registerShortcuts() {
    safeRegister('CommandOrControl+Shift+Q', () => {
        app.quit();
    });

    const moveAmount = 10;
    safeRegister('CommandOrControl+Up', () => {
        try {
            const win = getMainWindow();
            if (!win || win.isDestroyed()) return;
            const bounds = win.getBounds();
            win.setBounds({ x: bounds.x, y: bounds.y - moveAmount, width: bounds.width, height: bounds.height });
        } catch (err) { console.error('[SHORTCUT] Move up error:', err.message); }
    });
    safeRegister('CommandOrControl+Down', () => {
        try {
            const win = getMainWindow();
            if (!win || win.isDestroyed()) return;
            const bounds = win.getBounds();
            win.setBounds({ x: bounds.x, y: bounds.y + moveAmount, width: bounds.width, height: bounds.height });
        } catch (err) { console.error('[SHORTCUT] Move down error:', err.message); }
    });
    safeRegister('CommandOrControl+Left', () => {
        try {
            const win = getMainWindow();
            if (!win || win.isDestroyed()) return;
            const bounds = win.getBounds();
            win.setBounds({ x: bounds.x - moveAmount, y: bounds.y, width: bounds.width, height: bounds.height });
        } catch (err) { console.error('[SHORTCUT] Move left error:', err.message); }
    });
    safeRegister('CommandOrControl+Right', () => {
        try {
            const win = getMainWindow();
            if (!win || win.isDestroyed()) return;
            const bounds = win.getBounds();
            win.setBounds({ x: bounds.x + moveAmount, y: bounds.y, width: bounds.width, height: bounds.height });
        } catch (err) { console.error('[SHORTCUT] Move right error:', err.message); }
    });

    const resizeAmount = 50;
    const handleZoomIn = () => {
        try {
            const win = getMainWindow();
            if (!win || win.isDestroyed()) return;
            const bounds = win.getBounds();
            win.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width + resizeAmount, height: bounds.height + resizeAmount });
        } catch (err) { console.error('[SHORTCUT] Zoom in error:', err.message); }
    };
    const handleZoomOut = () => {
        try {
            const win = getMainWindow();
            if (!win || win.isDestroyed()) return;
            const bounds = win.getBounds();
            const newWidth = Math.max(200, bounds.width - resizeAmount);
            const newHeight = Math.max(150, bounds.height - resizeAmount);
            win.setBounds({ x: bounds.x, y: bounds.y, width: newWidth, height: newHeight });
        } catch (err) { console.error('[SHORTCUT] Zoom out error:', err.message); }
    };

    safeRegister('CommandOrControl+=', handleZoomIn);
    safeRegister('CommandOrControl+-', handleZoomOut);

    safeRegister('CommandOrControl+Shift+Up', () => safeSend('scroll', -1));
    safeRegister('CommandOrControl+Shift+Down', () => safeSend('scroll', 1));
    safeRegister('CommandOrControl+Shift+I', () => safeSend('focus-input'));
    safeRegister('CommandOrControl+Shift+B', () => safeSend('toggle-auto-reply'));
    safeRegister('CommandOrControl+Shift+Enter', () => safeSend('trigger-search'));
    safeRegister('F10', () => safeSend('trigger-ai-search'));

    safeRegister('CommandOrControl+Shift+S', async () => {
        try {
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width, height } = primaryDisplay.bounds;
            await new Promise(r => setTimeout(r, 100));

            const sources = await desktopCapturer.getSources({ 
                types: ['screen'], 
                thumbnailSize: { width: Math.max(width, 1920), height: Math.max(height, 1080) } 
            });
            
            if (!sources || sources.length === 0) {
                console.warn('[SHORTCUT] No screen sources found for snip');
                return;
            }

            const screenSource = sources[0].thumbnail.toDataURL();
            const preloadPath = path.join(__dirname, 'preload_snipper.js');
            createSnipperWindow(preloadPath, screenSource);
        } catch (err) {
            console.error('[SHORTCUT] Snipping error:', err);
        }
    });

    safeRegister('CommandOrControl+Shift+D', () => {
        try {
            const win = getMainWindow();
            if (win && !win.isDestroyed()) win.webContents.toggleDevTools();
        } catch (err) { console.error('[SHORTCUT] DevTools error:', err.message); }
    });
}

function unregisterShortcuts() {
    try {
        globalShortcut.unregisterAll();
    } catch (err) {
        console.error('[SHORTCUT] Cleanup error:', err.message);
    }
}

module.exports = {
    registerShortcuts,
    unregisterShortcuts
};
