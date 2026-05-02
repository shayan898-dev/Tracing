import React, { useRef, useState } from 'react';
import TracingWorkspace from './components/TracingWorkspace';
import Toolbar from './components/Toolbar';

function App() {
  const [currentLetter, setCurrentLetter] = useState('A');
  const [canUndo, setCanUndo] = useState(false);

  const workspaceRef = useRef(null);

  const handleUndo = () => {
    if (workspaceRef.current) workspaceRef.current.undo();
  };

  const handleClear = () => {
    if (workspaceRef.current) workspaceRef.current.clear();
  };

  const handleNextLetter = () => {
    if (workspaceRef.current) workspaceRef.current.nextLetter();
  };

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <TracingWorkspace
        ref={workspaceRef}
        setCanUndo={setCanUndo}
        onLetterChange={setCurrentLetter}
      />
      <Toolbar
        onUndo={handleUndo}
        canUndo={canUndo}
        onClear={handleClear}
        onNextLetter={handleNextLetter}
        currentLetter={currentLetter}
      />
    </div>
  );
}

export default App;
