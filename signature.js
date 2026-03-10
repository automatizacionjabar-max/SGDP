/**
 * SGD-P Web — Signature Pad Component
 * Captura de firma digital táctil + mouse usando Canvas API
 */
class SignaturePad {
  constructor(canvasParam, options = {}) {
    this.canvas = typeof canvasParam === 'string' 
      ? document.getElementById(canvasParam) 
      : canvasParam;
      
    if (!this.canvas) {
      console.error('SignaturePad: Canvas element not found', canvasParam);
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.options = Object.assign({
      penColor: '#1a237e',
      lineWidth: 3.0
    }, options);

    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.hasSignature = false;

    this._setupCanvas();
    this._bindEvents();
  }

  _setupCanvas() {
    // Ajustar resolución al tamaño real del canvas
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    // Estilo de la línea (firma profesional)
    this.ctx.strokeStyle = this.options.penColor;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  _getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  _startDrawing(e) {
    e.preventDefault();
    this.isDrawing = true;
    const pos = this._getPos(e);
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  _draw(e) {
    if (!this.isDrawing) return;
    e.preventDefault();
    const pos = this._getPos(e);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.hasSignature = true;
  }

  _stopDrawing() {
    this.isDrawing = false;
  }

  _bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this._startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this._draw(e));
    this.canvas.addEventListener('mouseup', () => this._stopDrawing());
    this.canvas.addEventListener('mouseleave', () => this._stopDrawing());

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this._startDrawing(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this._draw(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this._stopDrawing());
    this.canvas.addEventListener('touchcancel', () => this._stopDrawing());

    // Resize handler
    window.addEventListener('resize', () => {
      const imageData = this.toBase64();
      this._setupCanvas();
      if (imageData && this.hasSignature) {
        // Restore drawing after resize
        const img = new Image();
        img.onload = () => {
          this.ctx.drawImage(img, 0, 0, this.canvas.getBoundingClientRect().width, this.canvas.getBoundingClientRect().height);
        };
        img.src = imageData;
      }
    });
  }

  clear() {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.hasSignature = false;
  }

  isEmpty() {
    return !this.hasSignature;
  }

  toBase64() {
    if (!this.hasSignature) return '';
    return this.canvas.toDataURL('image/png');
  }

  toBase64Raw() {
    // Returns just the base64 data without the data:image/png;base64, prefix
    const full = this.toBase64();
    if (!full) return '';
    return full.split(',')[1] || '';
  }
}
