# Imposter Voice & AI Engine Documentation

This document provides a technical overview of the real-time voice transcription and AI-triggering system implemented in the Imposter Desktop application.

## 🏗 System Architecture

The voice engine operates across three main layers:
1.  **Main Process**: Manages global hotkeys and window lifecycle.
2.  **Renderer (Settings/App Hub)**: Manages the `AssemblyService` and audio stream.
3.  **Companion Window (Island)**: A transparent, always-on-top overlay for dynamic subtitles.

---

## 🎤 AssemblyAI Integration

The core transcription is powered by **AssemblyAI's Real-time WebSocket API**.

### 1. Audio Capture
The application captures system audio (or microphone) using the Electron `desktopCapturer`.
-   **Channel**: `get-desktop-source-id`
-   **Implementation**: `navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } } })`

### 2. Main Process WebSocket (`src/main/transcription.js`)
The main process handles the secure WebSocket connection to AssemblyAI to keep API keys hidden from the frontend environment.

```javascript
// Initializing the WebSocket with ultra-low latency model
const url = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=u3-rt-pro`;
assemblySocket = new WebSocket(url, { 
    headers: { Authorization: apiKey } 
});

// Relaying transcriptions to all active windows
assemblySocket.on('message', (message) => {
    const data = JSON.parse(message);
    const mainWindow = getMainWindow();
    const islandWindow = getIslandWindow();
    
    // Broadcast to Main Hub and the Subtitle Island
    if (mainWindow) mainWindow.webContents.send('transcription-data', data);
    if (islandWindow) islandWindow.webContents.send('transcription-data', data);
});
```

### 3. Audio Streaming Logic (`src/renderer/js/assembly-service.js`)
The renderer captures the stream and converts float32 audio to 16-bit PCM for AssemblyAI.

```javascript
processorNode = audioContext.createScriptProcessor(4096, 1, 1);
processorNode.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);
    const pcmData = new Int16Array(inputData.length);
    
    // Convert to Int16 PCM
    for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
    }
    
    // Send as Base64 chunk via IPC bridge
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
    window.electronAPI.sendAudioChunk(base64Audio);
};
```

---

## 🏝 The Dynamic Island (Subtitles)

The "Island" is a dedicated window (`src/renderer/island.html`) designed for stealth and visibility.

### Key Features:
-   **Stealth Mode**: Uses `win.setContentProtection(true)` to remain invisible to screen-sharing software (Zoom, Teams, Google Meet).
-   **Always On Top**: Pinned above all other windows.
-   **Inter-process Communication (IPC)**:
    -   Renderer sends: `window.electronAPI.send('transcription-update', text)`
    -   Island receives: `window.electronAPI.on('transcription-update', ...)`

---

## ⌨️ Global Hotkeys & Triggers

Shortcuts are registered globally via `src/main/shortcuts.js`.

### 1. `Ctrl + Shift + B` (Toggle Mode)
-   **Action**: Toggles the recording state.
-   **Workflow**: 
    -   Initializes `AssemblyService`.
    -   Opens the **Island Window**.
    -   Starts the transcription stream.

### 2. F10 (Smart AI Trigger)
-   **Action**: Captures the **Last Final Transcript** and sends it to the AI.
-   **Workflow**:
    -   `app.js` listens for `trigger-ai-search`.
    -   Retrieves `AssemblyService.getLastFinalTranscript()`.
    -   Sends the text to the selected LLM (Ollama/OpenRouter).

```javascript
// Core AI completion logic in app.js
async function getAIResponse(prompt) {
    const body = {
        model: selectedModel.id,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ],
        stream: false
    };

    const response = await window.electronAPI.ollamaCall({
        url: isRemote ? 'https://openrouter.ai/api/v1/chat/completions' : `${localUrl}/api/chat`,
        options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
    });
}
```

---

## 🔐 Security & APIs

-   **Keys**: AssemblyAI API keys are stored in the local `config.json` via the `Config` service. They are never hardcoded or stored in plain text environment variables for open-source distribution.
-   **Testing**: Users can verify their connection in the **Settings > Voice & AI** tab using the "Test Connection" button, which uses `https://api.assemblyai.com/v2/realtime/token`.

---

## 🤖 Guide for Future AI Assistants
To recreate this system, ensure:
1.  The `Content-Security-Policy` allows WebSocket connections to `assemblyai.com`.
2.  `webPreferences` for both windows have `nodeIntegration: false` and `contextIsolation: true` with a secure IPC bridge.
3.  The Audio context uses a `ScriptProcessor` or `AudioWorklet` to convert float32 audio to Int16 PCM.
