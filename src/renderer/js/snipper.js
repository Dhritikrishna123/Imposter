let isDrawing = false;
let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;
const selectionBox = document.getElementById('selection-box');
let screenSource = null;

window.electronAPI.onLoadImage((source) => {
    document.body.style.backgroundImage = `url(${source})`;
    screenSource = source;
});

window.addEventListener('mousedown', (e) => {
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = `0px`;
    selectionBox.style.height = `0px`;
    selectionBox.style.display = 'block';
});

window.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    endX = e.clientX;
    endY = e.clientY;

    const currentX = Math.min(startX, endX);
    const currentY = Math.min(startY, endY);
    const width = Math.abs(startX - endX);
    const height = Math.abs(startY - endY);

    selectionBox.style.left = `${currentX}px`;
    selectionBox.style.top = `${currentY}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
});

window.addEventListener('mouseup', () => {
    if (!isDrawing) return;
    isDrawing = false;
    
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(startX - endX);
    const height = Math.abs(startY - endY);

    if (width < 5 || height < 5) {
        window.electronAPI.cancelSnip();
        return;
    }

    selectionBox.style.display = 'none';
    window.electronAPI.snipCrop({ x, y, width, height, source: screenSource });
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.electronAPI.cancelSnip();
    }
});
