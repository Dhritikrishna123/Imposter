let isDrawing = false;
let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;
const selectionBox = document.getElementById('selection-box');
let screenSource = null;

// Global error handler for snipper window
window.onerror = (message, source, lineno, colno, error) => {
    console.error('[SNIPPER ERROR]', message, error);
    try { window.electronAPI.cancelSnip(); } catch (_) {}
    return true;
};

if (window.electronAPI && window.electronAPI.onLoadImage) {
    window.electronAPI.onLoadImage((source) => {
        try {
            document.body.style.backgroundImage = `url(${source})`;
            screenSource = source;
        } catch (err) {
            console.error('[SNIPPER] Load image error:', err);
            try { window.electronAPI.cancelSnip(); } catch (_) {}
        }
    });
}

window.addEventListener('mousedown', (e) => {
    try {
        isDrawing = true;
        startX = e.clientX;
        startY = e.clientY;
        if (selectionBox) {
            selectionBox.style.left = `${startX}px`;
            selectionBox.style.top = `${startY}px`;
            selectionBox.style.width = `0px`;
            selectionBox.style.height = `0px`;
            selectionBox.style.display = 'block';
        }
    } catch (err) {
        console.error('[SNIPPER] Mousedown error:', err);
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    try {
        endX = e.clientX;
        endY = e.clientY;

        const currentX = Math.min(startX, endX);
        const currentY = Math.min(startY, endY);
        const width = Math.abs(startX - endX);
        const height = Math.abs(startY - endY);

        if (selectionBox) {
            selectionBox.style.left = `${currentX}px`;
            selectionBox.style.top = `${currentY}px`;
            selectionBox.style.width = `${width}px`;
            selectionBox.style.height = `${height}px`;
        }
    } catch (err) {
        console.error('[SNIPPER] Mousemove error:', err);
    }
});

window.addEventListener('mouseup', () => {
    if (!isDrawing) return;
    isDrawing = false;
    
    try {
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(startX - endX);
        const height = Math.abs(startY - endY);

        if (width < 5 || height < 5) {
            window.electronAPI.cancelSnip();
            return;
        }

        if (selectionBox) selectionBox.style.display = 'none';
        
        if (!screenSource) {
            console.error('[SNIPPER] No screen source available');
            window.electronAPI.cancelSnip();
            return;
        }

        window.electronAPI.snipCrop({ x, y, width, height, source: screenSource });
    } catch (err) {
        console.error('[SNIPPER] Mouseup error:', err);
        try { window.electronAPI.cancelSnip(); } catch (_) {}
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        try { window.electronAPI.cancelSnip(); } catch (_) {}
    }
});
