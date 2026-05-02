import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Canvas from './Canvas';

const LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

const TracingWorkspace = forwardRef(({ setCanUndo, onLetterChange }, ref) => {
  const canvasRef = useRef(null);
  const successTimerRef = useRef(null);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [resetToken, setResetToken] = useState(0);

  const currentLetter = LETTERS[currentLetterIndex];

  const handleNext = useCallback(() => {
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }

    setCurrentLetterIndex((previousIndex) => (previousIndex + 1) % LETTERS.length);
    setResetToken((token) => token + 1);
    canvasRef.current?.clear?.();
  }, []);

  const handleSuccess = useCallback(() => {
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }

    successTimerRef.current = window.setTimeout(() => {
      handleNext();
    }, 800);
  }, [handleNext]);

  useImperativeHandle(ref, () => ({
    undo: () => {
      canvasRef.current?.undo?.();
    },
    clear: () => {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }

      canvasRef.current?.clear?.();
    },
    nextLetter: handleNext,
  }), [handleNext]);

  useEffect(() => {
    onLetterChange?.(currentLetter);
  }, [currentLetter, onLetterChange]);

  useEffect(() => () => {
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <Canvas
        ref={canvasRef}
        letter={currentLetter}
        resetToken={resetToken}
        onSuccess={handleSuccess}
        setCanUndo={setCanUndo}
      />
    </div>
  );
});

export default TracingWorkspace;
