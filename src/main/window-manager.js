const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;
let islandWindow = null;
let snipperWindow = null;

function createMainWindow(preloadPath) {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 500,
        transparent: true,
        frame: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        hasShadow: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath
        }
    });

    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setContentProtection(true);
    mainWindow.setOpacity(0.9);
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    return mainWindow;
}

function createIslandWindow(preloadPath) {
    if (islandWindow) return islandWindow;

    islandWindow = new BrowserWindow({
        width: 600,
        height: 80,
        x: 0,
        y: 0,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath
        }
    });

    islandWindow.setAlwaysOnTop(true, 'screen-saver');
    islandWindow.setContentProtection(true);
    islandWindow.loadFile(path.join(__dirname, '../renderer/island.html'));

    islandWindow.on('closed', () => {
        islandWindow = null;
    });

    return islandWindow;
}

function closeIslandWindow() {
    if (islandWindow) {
        islandWindow.close();
        islandWindow = null;
    }
}

function createSnipperWindow(preloadPath, screenSource) {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    snipperWindow = new BrowserWindow({
        width, height, x: primaryDisplay.bounds.x, y: primaryDisplay.bounds.y,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        enableLargerThanScreen: true,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true
        }
    });

    snipperWindow.setContentProtection(true);
    snipperWindow.setAlwaysOnTop(true, 'screen-saver');
    snipperWindow.loadFile(path.join(__dirname, '../renderer/snipper.html'));

    snipperWindow.webContents.on('did-finish-load', () => {
        snipperWindow.webContents.send('load-image', screenSource);
    });

    snipperWindow.on('closed', () => {
        snipperWindow = null;
    });

    return snipperWindow;
}

function closeSnipperWindow() {
    if (snipperWindow) {
        snipperWindow.close();
        snipperWindow = null;
    }
}

module.exports = {
    createMainWindow,
    getMainWindow: () => mainWindow,
    createIslandWindow,
    getIslandWindow: () => islandWindow,
    closeIslandWindow,
    createSnipperWindow,
    getSnipperWindow: () => snipperWindow,
    closeSnipperWindow
};
