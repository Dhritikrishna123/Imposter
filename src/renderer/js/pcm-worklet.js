class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 1600; // 100ms at 16000Hz (AssemblyAI expects 50ms - 1000ms)
        this.buffer = new Int16Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputData = input[0]; // Single channel
            
            for (let i = 0; i < inputData.length; i++) {
                // Convert Float32 to Int16
                const s = Math.max(-1, Math.min(1, inputData[i]));
                this.buffer[this.bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7FFF;

                // When buffer is full (100ms), send it to the renderer
                if (this.bufferIndex >= this.bufferSize) {
                    // Create a copy to send (transferable)
                    const dataToSend = new Int16Array(this.buffer);
                    this.port.postMessage(dataToSend.buffer, [dataToSend.buffer]);
                    
                    // Reset index
                    this.bufferIndex = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);
