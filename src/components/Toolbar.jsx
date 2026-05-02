import React from 'react';

const Toolbar = ({
  onUndo,
  canUndo,
  onClear,
  onNextLetter,
  currentLetter
}) => {
  return (
    <aside className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl shadow-black/50 text-white select-none z-50">
      
      {/* Learning Controls */}
      <div className="flex flex-col gap-2 border-r border-white/10 pr-6">
        <label className="text-xs font-semibold text-white/70 uppercase tracking-wider text-center">Tracing</label>
        <div className="flex items-center gap-3">
          <button
            onClick={onNextLetter}
            className="px-6 py-2 rounded-lg font-bold bg-white/20 hover:bg-white/30 transition-all shadow-inner"
            title="Next Letter"
          >
            Next Letter: {String.fromCharCode(currentLetter.charCodeAt(0) + 1 > 90 ? 65 : currentLetter.charCodeAt(0) + 1)}
          </button>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-lg transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex flex-col items-center gap-1"
          title="Undo"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span className="text-[10px] uppercase font-bold text-white/70">Undo</span>
        </button>
        
        <div className="w-px h-8 bg-white/10 mx-1" />
        
        <button
          onClick={onClear}
          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all flex flex-col items-center gap-1"
          title="Clear Canvas"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-[10px] uppercase font-bold text-red-400/70">Clear</span>
        </button>
      </div>

    </aside>
  );
};

export default Toolbar;
