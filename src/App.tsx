/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { IntuitionView } from './components/IntuitionView';
import { StepByStepLab } from './components/StepByStepLab';
import { Sandbox2DView } from './components/Sandbox2DView';
import { Dimensionality3DView } from './components/Dimensionality3DView';
import { IrisBiplotView } from './components/IrisBiplotView';
import { MathExplainerModal } from './components/MathExplainerModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('intuition');
  const [resetKey, setResetKey] = useState<number>(0);
  const [isMathModalOpen, setIsMathModalOpen] = useState<boolean>(false);

  const handleReset = () => {
    setResetKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-300">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleReset}
        onOpenMathGuide={() => setIsMathModalOpen(true)}
      />

      {/* Main Sandbox Stage Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div key={resetKey}>
          {activeTab === 'intuition' && <IntuitionView />}
          {activeTab === 'pipeline' && <StepByStepLab />}
          {activeTab === 'sandbox' && <Sandbox2DView />}
          {activeTab === 'reduction3d' && <Dimensionality3DView />}
          {activeTab === 'iris' && <IrisBiplotView />}
        </div>
      </main>

      {/* Subtle Scientific Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Principal Component Analysis</span>
            <span aria-hidden="true">·</span>
            <span>Unsupervised Dimensionality Reduction</span>
            <span aria-hidden="true">·</span>
            <span>Orthogonal Linear Transformation</span>
          </div>
          <div className="text-slate-500">
            Maximizing Variance ⟺ Minimizing Projection Loss
          </div>
        </div>
      </footer>

      {/* Mathematical Guide Modal */}
      <MathExplainerModal
        isOpen={isMathModalOpen}
        onClose={() => setIsMathModalOpen(false)}
      />
    </div>
  );
}
