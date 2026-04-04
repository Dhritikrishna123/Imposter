const { app, BrowserWindow, globalShortcut, ipcMain, session, desktopCapturer, screen, nativeImage } = require('electron');
const path = require('path');
const Tesseract = require('tesseract.js');

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

    let snipperWindow = null;
    globalShortcut.register('CommandOrControl+Shift+S', async () => {
        if (snipperWindow) return;
        try {
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width, height } = primaryDisplay.bounds;
            
            // Wait for 100ms before taking screenshot to allow user to release keys
            await new Promise(r => setTimeout(r, 100));

            const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.max(width, 1920), height: Math.max(height, 1080) } });
            // Using first source as primary monitor
            const screenSource = sources[0].thumbnail.toDataURL();

            snipperWindow = new BrowserWindow({
                width, height, x: primaryDisplay.bounds.x, y: primaryDisplay.bounds.y,
                transparent: true,
                frame: false,
                alwaysOnTop: true,
                skipTaskbar: true,
                enableLargerThanScreen: true,
                webPreferences: {
                    preload: path.join(__dirname, 'preload_snipper.js'),
                    contextIsolation: true
                }
            });

            // CRITICAL FOR STEALTH: Prevent screenshares from seeing the dim overlay or selection box
            snipperWindow.setContentProtection(true);
            snipperWindow.setAlwaysOnTop(true, 'screen-saver');
            snipperWindow.loadFile(path.join(__dirname, '../renderer/snipper.html'));

            snipperWindow.webContents.on('did-finish-load', () => {
                snipperWindow.webContents.send('load-image', screenSource);
            });

            snipperWindow.on('closed', () => {
                snipperWindow = null;
            });
        } catch (err) {
            console.error('Snipping error:', err);
        }
    });

    ipcMain.on('cancel-snip', () => {
        if (snipperWindow) snipperWindow.close();
    });

    ipcMain.on('snip-crop', async (event, { x, y, width, height, source }) => {
        if (snipperWindow) snipperWindow.close();
        
        try {
            // Restore mainWindow focus and tell it we are processing OCR maybe?
            
            const img = nativeImage.createFromDataURL(source);
            // Crop image to selection
            const cropped = img.crop({ 
                x: Math.floor(x), 
                y: Math.floor(y), 
                width: Math.floor(width), 
                height: Math.floor(height) 
            });
            const buffer = cropped.toPNG();
            
            Tesseract.recognize(buffer, 'eng')
                .then(({ data: { text } }) => {
                    const cleaned = text.trim();
                    if (cleaned && mainWindow) {
                        mainWindow.webContents.send('ocr-result', cleaned);
                    }
                })
                .catch(console.error);
        } catch (err) {
            console.error('Crop error:', err);
        }
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
