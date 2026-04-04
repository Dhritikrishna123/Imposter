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
            console.log('✅ AssemblyAI WebSocket Connected');
            const mainWindow = getMainWindow();
            if (mainWindow) mainWindow.webContents.send('transcription-status', 'connected');
        });

        assemblySocket.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                
                // Detailed logging to see what AssemblyAI is actually sending
                if (data.message_type === 'SessionBegins') {
                    console.log('🚀 Session Started! ID:', data.session_id);
                } else if (data.message_type === 'FinalTranscript' || data.message_type === 'PartialTranscript') {
                    // Only log transcripts we care about
                    if (data.text) {
                        console.log(`🎙️ [${data.message_type}] ${data.text}`);
                    }
                } else {
                    console.log('📬 Server Message:', data);
                }

                if (data.error) {
                    console.error('❌ AssemblyAI Server Error:', data.error);
                }

                const mainWindow = getMainWindow();
                const islandWindow = getIslandWindow();
                if (mainWindow) mainWindow.webContents.send('transcription-data', data);
                if (islandWindow) islandWindow.webContents.send('transcription-data', data);
            } catch (err) {
                console.error('❌ Failed to parse message:', err.message);
            }
        });

        assemblySocket.on('error', (err) => {
            console.error('❌ WebSocket Error:', err.message);
            const mainWindow = getMainWindow();
            if (mainWindow) mainWindow.webContents.send('transcription-status', 'error', err.message);
        });

        assemblySocket.on('close', (code, reason) => {
            console.log(`ℹ️ AssemblyAI WebSocket Closed | Code: ${code} | Reason: ${reason || 'No reason provided'}`);
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
