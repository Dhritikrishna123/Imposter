const { WebSocket } = require('ws');
const { getMainWindow, getIslandWindow } = require('./window-manager');

let assemblySocket = null;
let isConnecting = false;
const SAMPLE_RATE = 16000;

function safeSendStatus(status, error) {
    try {
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('transcription-status', status, error);
        }
    } catch (_) { /* window may be destroyed */ }
}

function startTranscription(apiKey) {
    if (isConnecting) return false;

    if (assemblySocket) {
        try { assemblySocket.close(); } catch (_) {}
        assemblySocket = null;
    }

    isConnecting = true;

    try {
        const url = `wss://streaming.assemblyai.com/v3/ws?sample_rate=${SAMPLE_RATE}&speech_model=u3-rt-pro`;
        assemblySocket = new WebSocket(url, { headers: { Authorization: apiKey } });

        const connectionTimeout = setTimeout(() => {
            isConnecting = false;
            if (assemblySocket && assemblySocket.readyState !== WebSocket.OPEN) {
                console.error('[TRANSCRIPTION] Connection timeout');
                try { assemblySocket.close(); } catch (_) {}
                assemblySocket = null;
                safeSendStatus('error', 'Connection timed out');
            }
        }, 15000);

        assemblySocket.on('open', () => {
            clearTimeout(connectionTimeout);
            isConnecting = false;
            safeSendStatus('connected');
        });

        assemblySocket.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                
                if (data.error) {
                    console.error('[TRANSCRIPTION] Server error:', data.error);
                }

                const mainWindow = getMainWindow();
                const islandWindow = getIslandWindow();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('transcription-data', data);
                }
                if (islandWindow && !islandWindow.isDestroyed()) {
                    islandWindow.webContents.send('transcription-data', data);
                }
            } catch (err) {
                console.error('[TRANSCRIPTION] Parse error:', err.message);
            }
        });

        assemblySocket.on('error', (err) => {
            clearTimeout(connectionTimeout);
            isConnecting = false;
            console.error('[TRANSCRIPTION] WebSocket error:', err.message);
            safeSendStatus('error', err.message);
        });

        assemblySocket.on('close', (code, reason) => {
            clearTimeout(connectionTimeout);
            isConnecting = false;
            assemblySocket = null;
            safeSendStatus('disconnected');
        });

        return true;
    } catch (err) {
        isConnecting = false;
        console.error('[TRANSCRIPTION] Start error:', err);
        return false;
    }
}

function stopTranscription() {
    isConnecting = false;
    if (assemblySocket) {
        try {
            if (assemblySocket.readyState === WebSocket.OPEN) {
                assemblySocket.send(JSON.stringify({ type: 'Terminate' }));
            }
        } catch (err) {
            console.error('[TRANSCRIPTION] Terminate send error:', err.message);
        }

        const socketRef = assemblySocket;
        setTimeout(() => {
            try {
                if (socketRef && socketRef.readyState !== WebSocket.CLOSED) {
                    socketRef.close();
                }
            } catch (_) {}
        }, 500);

        assemblySocket = null;
    }
}

function sendAudioChunk(base64Audio) {
    try {
        if (assemblySocket && assemblySocket.readyState === WebSocket.OPEN) {
            const buffer = Buffer.from(base64Audio, 'base64');
            assemblySocket.send(buffer);
        }
    } catch (err) {
        // Silent — high-frequency operation, don't spam logs
    }
}

async function testConnection(apiKey) {
    if (!apiKey) return { success: false, error: 'No API Key provided' };
    
    return new Promise((resolve) => {
        let resolved = false;

        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                try { tempSocket.close(); } catch (_) {}
                resolve({ success: false, error: 'Connection timed out (10s)' });
            }
        }, 10000);

        let tempSocket;
        try {
            tempSocket = new WebSocket('wss://streaming.assemblyai.com/v3/ws?sample_rate=16000', {
                headers: { Authorization: apiKey }
            });
        } catch (err) {
            clearTimeout(timeout);
            return resolve({ success: false, error: err.message });
        }

        tempSocket.on('open', () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                try { tempSocket.close(); } catch (_) {}
                resolve({ success: true });
            }
        });

        tempSocket.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve({ success: false, error: err.message });
            }
        });
    });
}

module.exports = {
    startTranscription,
    stopTranscription,
    sendAudioChunk,
    testConnection
};
