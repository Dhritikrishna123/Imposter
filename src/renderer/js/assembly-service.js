let audioContext = null;
let sourceNode = null;
let processorNode = null;
let stream = null;
let lastFinalTranscript = '';

export const AssemblyService = {
    async start(apiKey) {
        try {
            // Use the modern getDisplayMedia API (Electron 30+ compatible)
            // The main process handles the source selection via setDisplayMediaRequestHandler
            stream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: { width: 1, height: 1, frameRate: 1 } // minimal video (required by API)
            });

            // Stop the video track immediately - we only need audio
            stream.getVideoTracks().forEach(track => track.stop());

            // Check we actually got an audio track
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('No audio track captured. Make sure to share audio.');
            }

            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            sourceNode = audioContext.createMediaStreamSource(new MediaStream(audioTracks));

            const success = await window.electronAPI.startTranscription(apiKey);
            if (!success) throw new Error('Transcription failed to start');

            processorNode = audioContext.createScriptProcessor(4096, 1, 1);
            processorNode.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                
                // Send in smaller chunks to avoid btoa overflow
                const bytes = new Uint8Array(pcmData.buffer);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                window.electronAPI.sendAudioChunk(btoa(binary));
            };

            sourceNode.connect(processorNode);
            processorNode.connect(audioContext.destination);

            window.electronAPI.onTranscriptionData((data) => {
                if (data.message_type === 'FinalTranscript') {
                    lastFinalTranscript = data.text;
                }
            });

            return true;
        } catch (err) {
            console.error('Transcription error:', err);
            this.stop();
            throw err;
        }
    },

    stop() {
        if (processorNode) {
            processorNode.disconnect();
            processorNode = null;
        }
        if (sourceNode) {
            sourceNode.disconnect();
            sourceNode = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        window.electronAPI.stopTranscription();
    },

    getLastFinalTranscript() {
        return lastFinalTranscript;
    }
};
