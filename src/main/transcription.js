const { WebSocket } = require('ws');
const { getMainWindow, getIslandWindow } = require('./window-manager');

let assemblySocket = null;
const SAMPLE_RATE = 16000;

function startTranscription(apiKey) {
    if (assemblySocket) {
        assemblySocket.close();
    }

    try {
        const url = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${SAMPLE_RATE}&speech_model=u3-rt-pro`;
        assemblySocket = new WebSocket(url, { headers: { Authorization: apiKey } });

        assemblySocket.on('open', () => {
            const mainWindow = getMainWindow();
            if (mainWindow) mainWindow.webContents.send('transcription-status', 'connected');
        });

        assemblySocket.on('message', (message) => {
            const data = JSON.parse(message);
            const mainWindow = getMainWindow();
            const islandWindow = getIslandWindow();
            if (mainWindow) mainWindow.webContents.send('transcription-data', data);
            if (islandWindow) islandWindow.webContents.send('transcription-data', data);
        });

        assemblySocket.on('error', (err) => {
            const mainWindow = getMainWindow();
            if (mainWindow) mainWindow.webContents.send('transcription-status', 'error', err.message);
        });

        assemblySocket.on('close', () => {
            assemblySocket = null;
            const mainWindow = getMainWindow();
            if (mainWindow) mainWindow.webContents.send('transcription-status', 'disconnected');
        });

        return true;
    } catch (err) {
        return false;
    }
}

function stopTranscription() {
    if (assemblySocket) {
        assemblySocket.send(JSON.stringify({ type: 'Terminate' }));
        setTimeout(() => {
            if (assemblySocket) {
                assemblySocket.close();
                assemblySocket = null;
            }
        }, 500);
    }
}

function sendAudioChunk(base64Audio) {
    if (assemblySocket && assemblySocket.readyState === WebSocket.OPEN) {
        const buffer = Buffer.from(base64Audio, 'base64');
        assemblySocket.send(buffer);
    }
}

async function testConnection(apiKey) {
    if (!apiKey) return { success: false, error: 'No API Key provided' };
    
    return new Promise((resolve) => {
        const tempSocket = new WebSocket('wss://streaming.assemblyai.com/v3/ws?sample_rate=16000', {
            headers: { Authorization: apiKey }
        });

        tempSocket.on('open', () => {
            tempSocket.close();
            resolve({ success: true });
        });

        tempSocket.on('error', (err) => {
            resolve({ success: false, error: err.message });
        });
    });
}

module.exports = {
    startTranscription,
    stopTranscription,
    sendAudioChunk,
    testConnection
};
