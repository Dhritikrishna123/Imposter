const { globalShortcut, app, screen, desktopCapturer } = require('electron');
const { getMainWindow, createIslandWindow, createSnipperWindow } = require('./window-manager');
const path = require('path');

function registerShortcuts() {
    globalShortcut.register('CommandOrControl+Shift+Q', () => {
        app.quit();
    });

    const moveAmount = 10;
    globalShortcut.register('CommandOrControl+Up', () => {
        const win = getMainWindow();
        if (!win) return;
        const bounds = win.getBounds();
        win.setBounds({ x: bounds.x, y: bounds.y - moveAmount, width: bounds.width, height: bounds.height });
    });
    globalShortcut.register('CommandOrControl+Down', () => {
        const win = getMainWindow();
        if (!win) return;
        const bounds = win.getBounds();
        win.setBounds({ x: bounds.x, y: bounds.y + moveAmount, width: bounds.width, height: bounds.height });
    });
    globalShortcut.register('CommandOrControl+Left', () => {
        const win = getMainWindow();
        if (!win) return;
        const bounds = win.getBounds();
        win.setBounds({ x: bounds.x - moveAmount, y: bounds.y, width: bounds.width, height: bounds.height });
    });
    globalShortcut.register('CommandOrControl+Right', () => {
        const win = getMainWindow();
        if (!win) return;
        const bounds = win.getBounds();
        win.setBounds({ x: bounds.x + moveAmount, y: bounds.y, width: bounds.width, height: bounds.height });
    });

    const resizeAmount = 50;
    const handleZoomIn = () => {
        const win = getMainWindow();
        if (!win) return;
        const bounds = win.getBounds();
        win.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width + resizeAmount, height: bounds.height + resizeAmount });
    };
    const handleZoomOut = () => {
        const win = getMainWindow();
        if (!win) return;
        const bounds = win.getBounds();
        win.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width - resizeAmount, height: bounds.height - resizeAmount });
    };

    globalShortcut.register('CommandOrControl+=', handleZoomIn);
    globalShortcut.register('CommandOrControl+-', handleZoomOut);

    globalShortcut.register('CommandOrControl+Shift+I', () => {
        const win = getMainWindow();
        if (win) win.webContents.send('focus-input');
    });
    
    globalShortcut.register('CommandOrControl+Shift+B', () => {
        const win = getMainWindow();
        if (win) win.webContents.send('toggle-auto-reply');
    });

    globalShortcut.register('CommandOrControl+Shift+Enter', () => {
        const win = getMainWindow();
        if (win) win.webContents.send('trigger-search');
    });

    globalShortcut.register('F10', () => {
        const win = getMainWindow();
        if (win) win.webContents.send('trigger-ai-search');
    });

    globalShortcut.register('CommandOrControl+Shift+S', async () => {
        try {
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width, height } = primaryDisplay.bounds;
            await new Promise(r => setTimeout(r, 100)); // Release keys delay

            const sources = await desktopCapturer.getSources({ 
                types: ['screen'], 
                thumbnailSize: { width: Math.max(width, 1920), height: Math.max(height, 1080) } 
            });
            
            const screenSource = sources[0].thumbnail.toDataURL();
            const preloadPath = path.join(__dirname, 'preload_snipper.js');
            createSnipperWindow(preloadPath, screenSource);
        } catch (err) {
            console.error('Snipping error:', err);
        }
    });

    globalShortcut.register('CommandOrControl+Shift+D', () => {
        const win = getMainWindow();
        if (win) win.webContents.toggleDevTools();
    });
}

function unregisterShortcuts() {
    globalShortcut.unregisterAll();
}

module.exports = {
    registerShortcuts,
    unregisterShortcuts
};
