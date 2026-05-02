import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const BRUSH_SIZE = 20;
const BACKGROUND_COLOR = '#1a1a1a';
const GHOST_COLOR = '#6b6b6b';
const SUCCESS_COLOR = '#00f5ff';
const LETTER_FONT_FAMILY = 'Arial, sans-serif';

const Canvas = forwardRef(({ letter, resetToken, onSuccess, setCanUndo }, ref) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const syncUndoState = () => {
    setCanUndo?.(strokesRef.current.length > 0);
  };

  const getMetrics = () => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    return {
      canvas,
      dpr,
      width: canvas.width / dpr,
      height: canvas.height / dpr,
    };
  };

  const renderLetter = (ctx, width, height, color, shadowBlur = 0, shadowColor = 'transparent') => {
    const fontSize = Math.min(width, height) * 0.6;

    ctx.save();
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);
    ctx.font = `700 ${fontSize}px ${LETTER_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowColor = shadowColor;
    ctx.fillText(letter, width / 2, height / 2);
    ctx.restore();
  };

  const drawStroke = (ctx, stroke) => {
    if (!stroke || stroke.points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let index = 1; index < stroke.points.length; index += 1) {
      const point = stroke.points[index];
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
    ctx.restore();
  };

  const renderCanvas = (forceSuccess = isSuccess) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const { width, height, dpr } = getMetrics();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    renderLetter(ctx, width, height, GHOST_COLOR);

    if (forceSuccess) {
      renderLetter(ctx, width, height, SUCCESS_COLOR, 24, SUCCESS_COLOR);
      return;
    }

    strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
  };

  const resetCanvas = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setIsDrawing(false);
    setIsSuccess(false);
    setIsShaking(false);
    syncUndoState();
    renderCanvas();
  };

  const getLetterBounds = () => {
    const { canvas, width, height, dpr } = getMetrics();
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;

    const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offscreenCtx) return null;

    offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
    offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height);
    offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    offscreenCtx.font = `700 ${Math.min(width, height) * 0.6}px ${LETTER_FONT_FAMILY}`;
    offscreenCtx.textAlign = 'center';
    offscreenCtx.textBaseline = 'middle';
    offscreenCtx.fillStyle = '#ffffff';
    offscreenCtx.fillText(letter, width / 2, height / 2);

    const pixels = offscreenCtx.getImageData(0, 0, offscreen.width, offscreen.height).data;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasPixels = false;

    for (let pixelIndex = 0; pixelIndex < pixels.length; pixelIndex += 4) {
      if (pixels[pixelIndex + 3] <= 10) continue;
      hasPixels = true;
      const index = pixelIndex / 4;
      const x = (index % offscreen.width) / dpr;
      const y = Math.floor(index / offscreen.width) / dpr;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    if (!hasPixels) return null;

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };

  const getStrokeBounds = () => {
    if (strokesRef.current.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    strokesRef.current.forEach((stroke) => {
      stroke.points.forEach((point) => {
        minX = Math.min(minX, point.x - stroke.lineWidth / 2);
        minY = Math.min(minY, point.y - stroke.lineWidth / 2);
        maxX = Math.max(maxX, point.x + stroke.lineWidth / 2);
        maxY = Math.max(maxY, point.y + stroke.lineWidth / 2);
      });
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };

  const checkAccuracy = () => {
    const letterBounds = getLetterBounds();
    const strokeBounds = getStrokeBounds();

    if (!letterBounds || !strokeBounds) {
      return 0;
    }

    const overlapWidth = Math.max(0, Math.min(letterBounds.maxX, strokeBounds.maxX) - Math.max(letterBounds.minX, strokeBounds.minX));
    const overlapHeight = Math.max(0, Math.min(letterBounds.maxY, strokeBounds.maxY) - Math.max(letterBounds.minY, strokeBounds.minY));
    const overlapArea = overlapWidth * overlapHeight;
    const letterArea = Math.max(1, letterBounds.width * letterBounds.height);
    const strokeArea = Math.max(1, strokeBounds.width * strokeBounds.height);

    const coverageScore = overlapArea / letterArea;
    const sizeScore = 1 - Math.min(1, Math.abs(strokeArea - letterArea) / Math.max(strokeArea, letterArea));
    const letterCenterX = (letterBounds.minX + letterBounds.maxX) / 2;
    const letterCenterY = (letterBounds.minY + letterBounds.maxY) / 2;
    const strokeCenterX = (strokeBounds.minX + strokeBounds.maxX) / 2;
    const strokeCenterY = (strokeBounds.minY + strokeBounds.maxY) / 2;
    const centerDistance = Math.hypot(strokeCenterX - letterCenterX, strokeCenterY - letterCenterY);
    const maxDistance = Math.hypot(letterBounds.width, letterBounds.height);
    const positionScore = 1 - Math.min(1, centerDistance / Math.max(1, maxDistance));

    const accuracy = Math.max(0, Math.min(1, (coverageScore + sizeScore + positionScore) / 3));

    if (accuracy >= 0.8) {
      setIsSuccess(true);
      strokesRef.current = [];
      currentStrokeRef.current = null;
      syncUndoState();
      renderCanvas(true);
      onSuccess?.(accuracy);
    } else {
      setIsShaking(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }

      window.setTimeout(() => {
        setIsShaking(false);
      }, 500);
    }

    return accuracy;
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      resetCanvas();
    },
    undo: () => {
      if (strokesRef.current.length === 0) return;
      strokesRef.current.pop();
      syncUndoState();
      renderCanvas();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const setCanvasSize = () => {
      const { innerWidth, innerHeight } = window;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      contextRef.current = ctx;
      renderCanvas();
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    return () => {
      window.removeEventListener('resize', setCanvasSize);
    };
  }, [letter, isSuccess]);

  useEffect(() => {
    resetCanvas();
  }, [letter, resetToken]);

  const getPointFromEvent = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    if (isSuccess) return;

    event.preventDefault();
    setIsShaking(false);

    const point = getPointFromEvent(event);

    currentStrokeRef.current = {
      points: [point],
      color: '#ffffff',
      opacity: 1,
      lineWidth: BRUSH_SIZE,
    };
    strokesRef.current.push(currentStrokeRef.current);
    setIsDrawing(true);
    syncUndoState();
    renderCanvas(false);
  };

  const draw = (event) => {
    if (!isDrawing || isSuccess) return;

    event.preventDefault();
    const point = getPointFromEvent(event);
    const currentStroke = currentStrokeRef.current;

    if (!currentStroke) return;

    currentStroke.points.push(point);
    renderCanvas();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    currentStrokeRef.current = null;
    checkAccuracy();
  };

  return (
    <div className={`relative w-full h-full ${isShaking ? 'animate-shake' : ''}`}>
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
        className="block touch-none w-full h-full"
      />
    </div>
  );
});

export default Canvas;
