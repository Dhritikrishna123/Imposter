let audioContext = null;
let sourceNode = null;
let workletNode = null;
let stream = null;
let lastFinalTranscript = '';

export const AssemblyService = {
    async start(apiKey) {
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: { width: 1, height: 1, frameRate: 1 }
            });

            stream.getVideoTracks().forEach(track => track.stop());

            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('No audio track found. Ensure Share Audio was selected.');
            }

            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            await audioContext.audioWorklet.addModule('js/pcm-worklet.js');

            const mediaStream = new MediaStream(audioTracks);
            sourceNode = audioContext.createMediaStreamSource(mediaStream);

            const started = await window.electronAPI.startTranscription(apiKey);
            if (!started) throw new Error('Failed to start transcription on backend');

            workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
            
            workletNode.port.onmessage = (event) => {
                const buffer = event.data;
                const uint8Array = new Uint8Array(buffer);
                let binary = '';
                const len = uint8Array.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(uint8Array[i]);
                }
                window.electronAPI.sendAudioChunk(btoa(binary));
            };

            sourceNode.connect(workletNode);
            workletNode.connect(audioContext.destination);

            window.electronAPI.onTranscriptionData((data) => {
                if (data.type === 'Turn' && data.end_of_turn) {
                    lastFinalTranscript = data.transcript;
                } else if (data.message_type === 'FinalTranscript') {
                    lastFinalTranscript = data.text;
                }
            });

            return true;
        } catch (err) {
            console.error('AssemblyService error:', err);
            this.stop();
            throw err;
        }
    },

    stop() {
        if (workletNode) {
            workletNode.disconnect();
            workletNode = null;
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
