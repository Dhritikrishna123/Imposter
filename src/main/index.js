const { app, BrowserWindow, globalShortcut, ipcMain, session } = require('electron');
const path = require('path');

let mainWindow;
const width = 900;
const height = 500;

function createWindow() {
    mainWindow = new BrowserWindow({
        width,
        height,
        transparent: true,
        frame: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        hasShadow: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setContentProtection(true);
    mainWindow.setOpacity(0.9);
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    globalShortcut.register('CommandOrControl+Shift+Q', () => {
        app.quit();
    });

    const moveAmount = 10;
    globalShortcut.register('CommandOrControl+Up', () => {
        const bounds = mainWindow.getBounds();
        mainWindow.setBounds({ x: bounds.x, y: bounds.y - moveAmount, width: bounds.width, height: bounds.height });
    });
    globalShortcut.register('CommandOrControl+Down', () => {
        const bounds = mainWindow.getBounds();
        mainWindow.setBounds({ x: bounds.x, y: bounds.y + moveAmount, width: bounds.width, height: bounds.height });
    });
    globalShortcut.register('CommandOrControl+Left', () => {
        const bounds = mainWindow.getBounds();
        mainWindow.setBounds({ x: bounds.x - moveAmount, y: bounds.y, width: bounds.width, height: bounds.height });
    });
    globalShortcut.register('CommandOrControl+Right', () => {
        const bounds = mainWindow.getBounds();
        mainWindow.setBounds({ x: bounds.x + moveAmount, y: bounds.y, width: bounds.width, height: bounds.height });
    });

    const resizeAmount = 50;
    const handleZoomIn = () => {
        const bounds = mainWindow.getBounds();
        mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width + resizeAmount, height: bounds.height + resizeAmount });
    };
    const handleZoomOut = () => {
        const bounds = mainWindow.getBounds();
        mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width - resizeAmount, height: bounds.height - resizeAmount });
    };

    globalShortcut.register('CommandOrControl+=', handleZoomIn);
    globalShortcut.register('CommandOrControl+numadd', handleZoomIn);
    globalShortcut.register('CommandOrControl+-', handleZoomOut);
    globalShortcut.register('CommandOrControl+numsub', handleZoomOut);

    globalShortcut.register('CommandOrControl+Shift+I', () => {
        if (mainWindow) mainWindow.webContents.send('focus-input');
    });
    
    globalShortcut.register('CommandOrControl+Shift+Enter', () => {
        if (mainWindow) mainWindow.webContents.send('trigger-search');
    });

    globalShortcut.register('CommandOrControl+Shift+Up', () => {
        if (mainWindow) mainWindow.webContents.send('scroll', -1);
    });
    globalShortcut.register('CommandOrControl+Shift+Down', () => {
        if (mainWindow) mainWindow.webContents.send('scroll', 1);
    });

    globalShortcut.register('CommandOrControl+Shift+C', () => {
        if (mainWindow) mainWindow.webContents.send('copy-main');
    });

    globalShortcut.register('CommandOrControl+Shift+D', () => {
        if (mainWindow) mainWindow.webContents.toggleDevTools();
    });

    ipcMain.handle('ollama-call', async (event, { url, options }) => {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            return await response.json();
        } catch (error) {
            console.error('[Main Process] IPC Ollama error:', error.message);
            throw error;
        }
    });

    ipcMain.on('set-app-mode', (event, mode) => {
        if (!mainWindow) return;
        if (mode === 'normal') {
            mainWindow.setSkipTaskbar(false);
            mainWindow.setAlwaysOnTop(false);
            mainWindow.setResizable(true);
            mainWindow.setContentProtection(false); // Allow screenshots
        } else {
            // Default to stealth
            mainWindow.setSkipTaskbar(true);
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
            mainWindow.setResizable(false);
            mainWindow.setContentProtection(true); // Block screenshots
        }
    });

    ipcMain.on('minimize-app', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('close-app', () => {
        if (mainWindow) app.quit();
    });

    ipcMain.on('restart-app', () => {
        app.relaunch();
        app.exit(0);
    });
}

app.whenReady().then(() => {
    session.defaultSession.setProxy({
        proxyRules: 'direct://',
        proxyBypassRules: '127.0.0.1,localhost'
    });

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
