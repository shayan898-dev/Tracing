import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

const TracingWorkspace = forwardRef(({ currentLetter, setCanUndo, onNextLetter }, ref) => {
  const containerRef = useRef(null);
  const refCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const glowCanvasRef = useRef(null);
  const contextRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const validationTimerRef = useRef(null);
  const history = useRef([]);
  const historyStep = useRef(-1);

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyStep.current > 0) {
        historyStep.current -= 1;
        restoreCanvas();
      } else if (historyStep.current === 0) {
        historyStep.current = -1;
        clearDrawCanvas();
      }
      updateUndoRedoState();
      setIsSuccess(false); // Cancel success state if they undo
    },
    clear: () => {
      clearDrawCanvas();
      saveState();
      setIsSuccess(false);
    }
  }));

  const updateUndoRedoState = () => {
    setCanUndo(historyStep.current >= 0);
  };

  const clearDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveState = () => {
    const canvas = drawCanvasRef.current;
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
    if (historyStep.current < 0) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = history.current[historyStep.current];
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ctx.scale(dpr, dpr);
    };
  };

  const renderReferenceLetter = (canvas, ctx, dpr, letter, color, shadowBlur = 0, shadowColor = 'transparent') => {
    const { innerWidth, innerHeight } = window;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Scale font size based on screen size
    const fontSize = Math.min(innerWidth, innerHeight) * 0.6;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    
    if (shadowBlur > 0) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    
    ctx.fillText(letter, innerWidth / 2, innerHeight / 2);
  };

  useEffect(() => {
    // 1. Immediately reset states to ensure no carry-over
    setIsSuccess(false);
    history.current = [];
    historyStep.current = -1;
    updateUndoRedoState();

    const setCanvasSize = () => {
      const { innerWidth, innerHeight } = window;
      const dpr = window.devicePixelRatio || 1;
      
      const canvases = [refCanvasRef.current, drawCanvasRef.current, glowCanvasRef.current];
      
      canvases.forEach((canvas) => {
        if (!canvas) return;
        // Setting width/height automatically clears the canvas
        canvas.width = innerWidth * dpr;
        canvas.height = innerHeight * dpr;
        canvas.style.width = `${innerWidth}px`;
        canvas.style.height = `${innerHeight}px`;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.scale(dpr, dpr);
      });

      // Setup drawing context
      const drawCtx = drawCanvasRef.current.getContext('2d', { willReadFrequently: true });
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';
      contextRef.current = drawCtx;

      // Render letter layers
      renderReferenceLetter(refCanvasRef.current, refCanvasRef.current.getContext('2d', { willReadFrequently: true }), dpr, currentLetter, '#333333');
      renderReferenceLetter(glowCanvasRef.current, glowCanvasRef.current.getContext('2d', { willReadFrequently: true }), dpr, currentLetter, '#ffffff', 60, '#00ffff');
      
      // Restore drawing only if we have valid history for THIS letter
      if (historyStep.current >= 0) {
        restoreCanvas();
      }
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    return () => window.removeEventListener('resize', setCanvasSize);
  }, [currentLetter]); // Re-initialize fully when letter changes

  const startDrawing = (e) => {
    if (isSuccess) return; // Prevent drawing if success
    
    // Clear the validation timer because the user started drawing again
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    const canvas = drawCanvasRef.current;
    const ctx = contextRef.current;
    
    e.preventDefault();

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
    if (!isDrawing || isSuccess) return;
    e.preventDefault();
    
    const canvas = drawCanvasRef.current;
    const ctx = contextRef.current;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    requestAnimationFrame(() => {
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 50; 
      ctx.stroke();

      // MASKING: Ensure ink only appears inside the letter
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      const fontSize = Math.min(window.innerWidth, window.innerHeight) * 0.6;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText(currentLetter, window.innerWidth / 2, window.innerHeight / 2);
      ctx.restore();
    });
  };

  const validateDrawing = () => {
    const refCanvas = refCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    
    // Check validation on a smaller bounding box if possible, or just the whole canvas.
    const width = Math.ceil(refCanvas.width);
    const height = Math.ceil(refCanvas.height);
    
    const refCtx = refCanvas.getContext('2d', { willReadFrequently: true });
    const drawCtx = drawCanvas.getContext('2d', { willReadFrequently: true });
    
    const refData = refCtx.getImageData(0, 0, width, height).data;
    const drawData = drawCtx.getImageData(0, 0, width, height).data;
    
    let totalRefPixels = 0;
    let coveredPixels = 0;
    let strayPixels = 0;

    // Check EVERY pixel for 100% accuracy (RGBA = 4 channels)
    for (let i = 0; i < refData.length; i += 4) {
      const isRefSolid = refData[i + 3] > 10; // Alpha > 10
      const isDrawSolid = drawData[i + 3] > 10;
      
      if (isRefSolid) totalRefPixels++;
      if (isDrawSolid && isRefSolid) coveredPixels++;
      if (isDrawSolid && !isRefSolid) strayPixels++;
    }

    if (totalRefPixels === 0) return false;

    // We check how much of the drawing is actually "useful" (on the letter) vs "stray"
    const userPixels = coveredPixels + strayPixels;
    const strayRatio = userPixels > 0 ? strayPixels / userPixels : 0;

    // SUCCESS: If they've covered half of the letter (50%+), we count it as completed.
    // This is much more achievable while still requiring a full trace of the shape.
    const isCorrect = coverage > 0.50;

    if (isCorrect) {
      setIsSuccess(true);
      // Auto-advance after showing the success state
      setTimeout(() => {
        onNextLetter();
      }, 1500);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      contextRef.current.closePath();
      setIsDrawing(false);
      saveState();
      
      // Wait for 1.5 seconds of inactivity before validating
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
      validationTimerRef.current = setTimeout(() => {
         validateDrawing();
      }, 1500);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full flex justify-center items-center ${isShaking ? 'animate-shake' : ''}`}
    >
      {/* Layer 1: Reference Shadow */}
      <canvas
        ref={refCanvasRef}
        className="absolute inset-0 pointer-events-none opacity-50"
      />
      
      {/* Layer 3: Success Glow (Rendered beneath drawing so it transitions smoothly, or on top) */}
      <canvas
        ref={glowCanvasRef}
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${isSuccess ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Layer 2: Active Drawing Canvas */}
      <canvas
        ref={drawCanvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        onTouchCancel={stopDrawing}
        className={`absolute inset-0 block touch-none transition-opacity duration-500 ${isSuccess ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      />
    </div>
  );
});

export default TracingWorkspace;
