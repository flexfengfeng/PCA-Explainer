import React from 'react';
import { Compass, GitMerge, Sliders, Box, Flower2, BookOpen, RotateCcw } from 'lucide-react';

export type ActiveTab = 'intuition' | 'pipeline' | 'sandbox' | 'reduction3d' | 'iris';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onReset: () => void;
  onOpenMathGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onReset,
  onOpenMathGuide,
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'intuition', label: 'Rotate & Maximize', icon: <Compass className="w-4 h-4" /> },
    { id: 'pipeline', label: '5-Step Pipeline', icon: <GitMerge className="w-4 h-4" /> },
    { id: 'sandbox', label: '2D Sandbox', icon: <Sliders className="w-4 h-4" /> },
    { id: 'reduction3d', label: '3D to 2D Reduction', icon: <Box className="w-4 h-4" /> },
    { id: 'iris', label: 'Iris 4D Biplot', icon: <Flower2 className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand title wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-bold text-sm shadow-inner">
            λ
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
            PCA Explorer
          </span>
        </div>

        {/* Zone 2: Navigation Links / Segmented Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-lg overflow-x-auto max-w-full">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            title="Reset current view"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg border border-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenMathGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-400 bg-sky-950/50 hover:bg-sky-900/50 border border-sky-800/60 rounded-lg transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Math Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
};
