import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

const Canvas = forwardRef(({ color, brushSize, opacity, isEraser, setCanUndo, setCanRedo }, ref) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const history = useRef([]);
  const historyStep = useRef(-1);

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyStep.current > 0) {
        historyStep.current -= 1;
        restoreCanvas();
      }
      updateUndoRedoState();
    },
    redo: () => {
      if (historyStep.current < history.current.length - 1) {
        historyStep.current += 1;
        restoreCanvas();
      }
      updateUndoRedoState();
    },
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // On retina, the scale is applied, so filling width/dpr, height/dpr
      // Actually, rect coords are in scaled coordinate space, so we use canvas.width/dpr
      const dpr = window.devicePixelRatio || 1;
      
      // Reset composite operation to fill the rect properly
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      saveState();
    },
    download: () => {
      const canvas = canvasRef.current;
      // create a temporary canvas to apply background if we used transparent destination-out
      // Since our background is #000000 visually, but 'destination-out' creates transparent holes.
      // Wait, erasing with destination-out creates transparent holes. When downloaded, they are transparent.
      // We should probably fill black behind it before download.
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = '#000000';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);

      const dataUrl = tempCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'tracing_sketch.png';
      link.href = dataUrl;
      link.click();
    }
  }));

  const updateUndoRedoState = () => {
    setCanUndo(historyStep.current > 0);
    setCanRedo(historyStep.current < history.current.length - 1);
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    if (historyStep.current < history.current.length - 1) {
      history.current = history.current.slice(0, historyStep.current + 1);
    }
    history.current.push(canvas.toDataURL());
    if (history.current.length > 20) {
      history.current.shift();
    } else {
      historyStep.current += 1;
    }
    updateUndoRedoState();
  };

  const restoreCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = history.current[historyStep.current];
    img.onload = () => {
      // Need to temporarily reset transformations to draw exactly
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      // Restore scale
      ctx.scale(dpr, dpr);
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    
    const setCanvasSize = () => {
      const { innerWidth, innerHeight } = window;
      const dpr = window.devicePixelRatio || 1;
      
      const data = canvas.toDataURL();
      
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      contextRef.current = ctx;

      const img = new Image();
      img.src = data;
      img.onload = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0);
        ctx.scale(dpr, dpr);
      };
      
      if (history.current.length === 0) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, innerWidth, innerHeight);
        saveState();
      }
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    return () => window.removeEventListener('resize', setCanvasSize);
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    requestAnimationFrame(() => {
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.globalAlpha = isEraser ? 1 : opacity;
      ctx.lineWidth = brushSize;
      ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
      ctx.stroke();
    });
  };

  const stopDrawing = () => {
    if (isDrawing) {
      contextRef.current.closePath();
      setIsDrawing(false);
      saveState();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseOut={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      onTouchCancel={stopDrawing}
      className="block touch-none"
    />
  );
});

export default Canvas;
