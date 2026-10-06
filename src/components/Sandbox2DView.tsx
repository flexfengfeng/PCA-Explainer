import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, RotateCcw, Move } from 'lucide-react';
import { Point2D, computePCA2D, generate2DPreset } from '../utils/math';

export const Sandbox2DView: React.FC = () => {
  const [points, setPoints] = useState<Point2D[]>(() => generate2DPreset('strong_corr', 30));
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'drag' | 'add'>('drag');

  // Visualization options
  const [showPC1, setShowPC1] = useState<boolean>(true);
  const [showPC2, setShowPC2] = useState<boolean>(true);
  const [showProjections, setShowProjections] = useState<boolean>(true);
  const [showEllipse, setShowEllipse] = useState<boolean>(true);
  const [showCenter, setShowCenter] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute live PCA
  const pca = useMemo(() => computePCA2D(points), [points]);

  const canvasScale = 22;

  // Convert mouse event coordinates to data units
  const screenToData = useCallback((canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const dataX = (x - cx) / canvasScale;
    const dataY = (cy - y) / canvasScale;

    return { dataX, dataY };
  }, [canvasScale]);

  // Mouse handlers for dragging points or adding points
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { dataX, dataY } = screenToData(canvas, e.clientX, e.clientY);

    if (interactionMode === 'add') {
      const newPt: Point2D = {
        id: `custom-${Date.now()}-${Math.random()}`,
        x: Math.round(dataX * 10) / 10,
        y: Math.round(dataY * 10) / 10,
      };
      setPoints(prev => [...prev, newPt]);
      return;
    }

    // Check if clicked close to an existing point
    let closestId: string | null = null;
    let closestDist = 0.8; // threshold in units

    for (const p of points) {
      const d = Math.hypot(p.x - dataX, p.y - dataY);
      if (d < closestDist) {
        closestDist = d;
        closestId = p.id;
      }
    }

    if (closestId) {
      setDraggedPointId(closestId);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedPointId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { dataX, dataY } = screenToData(canvas, e.clientX, e.clientY);

    setPoints(prev =>
      prev.map(p => (p.id === draggedPointId ? { ...p, x: dataX, y: dataY } : p))
    );
  };

  const handleMouseUp = () => {
    setDraggedPointId(null);
  };

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = -10; x <= 10; x += 2) {
      ctx.beginPath();
      ctx.moveTo(cx + x * canvasScale, 0);
      ctx.lineTo(cx + x * canvasScale, height);
      ctx.stroke();
    }
    for (let y = -10; y <= 10; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, cy - y * canvasScale);
      ctx.lineTo(width, cy - y * canvasScale);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    const lineLen = 380;
    const v1 = pca.v1;
    const v2 = pca.v2;

    // PC1 line through mean
    const mx = cx + pca.meanX * canvasScale;
    const my = cy - pca.meanY * canvasScale;

    if (showPC1 && points.length >= 2) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx - v1.x * lineLen, my + v1.y * lineLen);
      ctx.lineTo(mx + v1.x * lineLen, my - v1.y * lineLen);
      ctx.stroke();

      // Vector arrow scaled by std
      const std1 = Math.sqrt(pca.lambda1) * canvasScale;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + v1.x * std1, my - v1.y * std1);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mx + v1.x * std1, my - v1.y * std1, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`PC1 (${(pca.explainedVariance1 * 100).toFixed(0)}%)`, mx + v1.x * std1 + 8, my - v1.y * std1 - 6);
    }

    // PC2 line through mean
    if (showPC2 && points.length >= 2) {
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mx - v2.x * lineLen * 0.7, my + v2.y * lineLen * 0.7);
      ctx.lineTo(mx + v2.x * lineLen * 0.7, my - v2.y * lineLen * 0.7);
      ctx.stroke();
      ctx.setLineDash([]);

      const std2 = Math.sqrt(pca.lambda2) * canvasScale;
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + v2.x * std2, my - v2.y * std2);
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(mx + v2.x * std2, my - v2.y * std2, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillStyle = '#c084fc';
      ctx.fillText(`PC2 (${(pca.explainedVariance2 * 100).toFixed(0)}%)`, mx + v2.x * std2 + 8, my - v2.y * std2 - 6);
    }

    // Confidence Ellipse
    if (showEllipse && points.length >= 3) {
      const std1 = Math.sqrt(pca.lambda1) * canvasScale;
      const std2 = Math.sqrt(pca.lambda2) * canvasScale;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(-pca.pc1Angle);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, std1 * 2, std2 * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Mean Center Marker
    if (showCenter) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Data points & projections
    points.forEach(p => {
      const px = cx + p.x * canvasScale;
      const py = cy - p.y * canvasScale;

      // Projection line to PC1
      if (showProjections && showPC1 && points.length >= 2) {
        const dx = p.x - pca.meanX;
        const dy = p.y - pca.meanY;
        const proj = dx * v1.x + dy * v1.y;
        const projX = mx + proj * v1.x * canvasScale;
        const projY = my - proj * v1.y * canvasScale;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(projX, projY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(projX, projY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Point circle
      const isDragged = p.id === draggedPointId;
      ctx.fillStyle = isDragged ? '#38bdf8' : p.group === 'Outlier' ? '#f43f5e' : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(px, py, isDragged ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isDragged ? '#ffffff' : '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [
    points,
    draggedPointId,
    pca,
    showPC1,
    showPC2,
    showProjections,
    showEllipse,
    showCenter,
    canvasScale,
  ]);

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs font-mono text-sky-400 tracking-wider uppercase mb-1">
            Dynamic Manipulation
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Interactive 2D Sandbox & Matrix Inspector
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Drag any point across the canvas to see the eigenvectors rotate and eigenvalues recalibrate in real time. Switch modes to add new points or simulate outlier leverage.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setInteractionMode('drag')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              interactionMode === 'drag'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Drag Points</span>
          </button>
          <button
            onClick={() => setInteractionMode('add')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              interactionMode === 'add'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Click to Add Point</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Canvas Area (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col items-center">
          {/* Canvas Toolbar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Preset:</span>
              <select
                aria-label="Preset shape selection"
                onChange={e => setPoints(generate2DPreset(e.target.value as any, 30))}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="strong_corr">Strong Linear Trend</option>
                <option value="moderate_corr">Moderate Correlation</option>
                <option value="two_clusters">Two Clusters</option>
                <option value="circular">Circular (No Correlation)</option>
                <option value="outlier">High-Leverage Outliers</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPoints(generate2DPreset('strong_corr', 30))}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                title="Reset points"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                onClick={() => setPoints([])}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors ml-2"
                title="Clear all points"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Interactive Canvas */}
          <div className="relative w-full aspect-square max-w-[500px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Canvas View Toggles */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={showPC1}
                onChange={e => setShowPC1(e.target.checked)}
                className="rounded border-slate-700 text-sky-500"
              />
              <span>PC1 Axis</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={showPC2}
                onChange={e => setShowPC2(e.target.checked)}
                className="rounded border-slate-700 text-purple-500"
              />
              <span>PC2 Axis</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={showProjections}
                onChange={e => setShowProjections(e.target.checked)}
                className="rounded border-slate-700 text-sky-500"
              />
              <span>Projections</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={showEllipse}
                onChange={e => setShowEllipse(e.target.checked)}
                className="rounded border-slate-700 text-sky-500"
              />
              <span>Variance Ellipse</span>
            </label>
          </div>
        </div>

        {/* Right: Dynamic Matrices & Variance Ratios (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Variance Breakdown Bar */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Variance Conservation & Scree Share
            </h2>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-sky-400 font-semibold">
                  PC1: {(pca.explainedVariance1 * 100).toFixed(1)}%
                </span>
                <span className="text-purple-400 font-semibold">
                  PC2: {(pca.explainedVariance2 * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-4 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex">
                <div
                  className="h-full bg-sky-500 transition-all duration-100"
                  style={{ width: `${pca.explainedVariance1 * 100}%` }}
                />
                <div
                  className="h-full bg-purple-500 transition-all duration-100"
                  style={{ width: `${pca.explainedVariance2 * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500">
                Total Variance = λ₁ + λ₂ = {pca.totalVariance.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Covariance Matrix Inspector */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Covariance Matrix Σ
            </h2>

            <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 font-sans">Var(X₁)</div>
                <div className="text-sky-400 text-sm font-semibold tabular-nums">
                  {pca.covXX.toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 font-sans">Cov(X₁, X₂)</div>
                <div className="text-slate-200 text-sm font-semibold tabular-nums">
                  {pca.covXY.toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 font-sans">Cov(X₂, X₁)</div>
                <div className="text-slate-200 text-sm font-semibold tabular-nums">
                  {pca.covXY.toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 font-sans">Var(X₂)</div>
                <div className="text-purple-400 text-sm font-semibold tabular-nums">
                  {pca.covYY.toFixed(2)}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              {Math.abs(pca.covXY) < 0.2
                ? 'The features show near-zero covariance (uncorrelated). PCA axes will align closely with the original coordinate axes.'
                : pca.covXY > 0
                ? 'Positive covariance indicates that as X₁ increases, X₂ tends to increase. PC1 rotates into the positive diagonal.'
                : 'Negative covariance indicates an inverse relationship. PC1 rotates into the negative diagonal.'}
            </p>
          </div>

          {/* Eigenvalues & Eigenvectors */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3 font-mono text-xs">
            <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider font-sans">
              Eigensystem Solution
            </h2>

            <div className="space-y-2">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between text-sky-400 font-semibold font-sans">
                  <span>Eigenvalue λ₁: {pca.lambda1.toFixed(2)}</span>
                  <span>{(pca.explainedVariance1 * 100).toFixed(1)}%</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Unit Vector v₁ = [{pca.v1.x.toFixed(3)}, {pca.v1.y.toFixed(3)}]
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="flex justify-between text-purple-400 font-semibold font-sans">
                  <span>Eigenvalue λ₂: {pca.lambda2.toFixed(2)}</span>
                  <span>{(pca.explainedVariance2 * 100).toFixed(1)}%</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Unit Vector v₂ = [{pca.v2.x.toFixed(3)}, {pca.v2.y.toFixed(3)}]
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
