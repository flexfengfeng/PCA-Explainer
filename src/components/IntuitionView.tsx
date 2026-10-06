import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, Target, Sparkles, HelpCircle } from 'lucide-react';
import { Point2D, computePCA2D, computeProjectionStats, generate2DPreset } from '../utils/math';

export const IntuitionView: React.FC = () => {
  const [points, setPoints] = useState<Point2D[]>(() => generate2DPreset('strong_corr', 42));
  const [angleDeg, setAngleDeg] = useState<number>(25);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showProjections, setShowProjections] = useState<boolean>(true);
  const [showProjectedPoints, setShowProjectedPoints] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Compute 2D PCA ground truth
  const pca = useMemo(() => computePCA2D(points), [points]);
  const truePC1Deg = useMemo(() => {
    let deg = (pca.pc1Angle * 180) / Math.PI;
    while (deg < 0) deg += 180;
    while (deg >= 180) deg -= 180;
    return Math.round(deg * 10) / 10;
  }, [pca.pc1Angle]);

  const truePC2Deg = useMemo(() => {
    let deg = (pca.pc2Angle * 180) / Math.PI;
    while (deg < 0) deg += 180;
    while (deg >= 180) deg -= 180;
    return Math.round(deg * 10) / 10;
  }, [pca.pc2Angle]);

  const angleRad = (angleDeg * Math.PI) / 180;

  // Compute live stats for current angle
  const stats = useMemo(() => {
    return computeProjectionStats(points, pca.meanX, pca.meanY, angleRad);
  }, [points, pca.meanX, pca.meanY, angleRad]);

  const varianceRatio = Math.min(1, stats.variance / Math.max(1e-6, pca.totalVariance));
  const maxPossibleVariance = pca.lambda1;
  const isNearPC1 = Math.abs(angleDeg - truePC1Deg) < 2.5 || Math.abs(angleDeg - (truePC1Deg + 180) % 180) < 2.5;

  // Generate curve data across 0 to 180 deg
  const curveData = useMemo(() => {
    const samples: { deg: number; variance: number; ssd: number }[] = [];
    for (let d = 0; d <= 180; d += 2) {
      const rad = (d * Math.PI) / 180;
      const st = computeProjectionStats(points, pca.meanX, pca.meanY, rad);
      samples.push({ deg: d, variance: st.variance, ssd: st.ssd });
    }
    return samples;
  }, [points, pca.meanX, pca.meanY]);

  // Animation sweep loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const step = () => {
      setAngleDeg(prev => (prev + 0.35) % 180);
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Draw 2D Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Center of canvas
    const cx = width / 2;
    const cy = height / 2;
    const scale = 22; // pixels per unit

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = -10; x <= 10; x += 2) {
      ctx.beginPath();
      ctx.moveTo(cx + x * scale, 0);
      ctx.lineTo(cx + x * scale, height);
      ctx.stroke();
    }
    for (let y = -10; y <= 10; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, cy - y * scale);
      ctx.lineTo(width, cy - y * scale);
      ctx.stroke();
    }

    // Centered axes (X and Y)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    // Candidate axis line (rotatable line)
    const ux = Math.cos(angleRad);
    const uy = Math.sin(angleRad);
    const lineLen = 380;

    // Line shadow/glow
    ctx.strokeStyle = isNearPC1 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = isNearPC1 ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(cx - ux * lineLen, cy + uy * lineLen);
    ctx.lineTo(cx + ux * lineLen, cy - uy * lineLen);
    ctx.stroke();

    // Line core
    ctx.strokeStyle = isNearPC1 ? '#38bdf8' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - ux * lineLen, cy + uy * lineLen);
    ctx.lineTo(cx + ux * lineLen, cy - uy * lineLen);
    ctx.stroke();

    // Arrow on positive direction
    const arrowX = cx + ux * (lineLen - 15);
    const arrowY = cy - uy * (lineLen - 15);
    ctx.fillStyle = isNearPC1 ? '#38bdf8' : '#94a3b8';
    ctx.beginPath();
    ctx.arc(arrowX, arrowY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Render points, projections, and orthogonal drops
    const centeredPts = pca.centeredPoints;

    centeredPts.forEach(p => {
      const px = cx + p.x * scale;
      const py = cy - p.y * scale;

      // Scalar projection coordinate
      const projScalar = p.x * ux + p.y * uy;
      const projX = cx + projScalar * ux * scale;
      const projY = cy - projScalar * uy * scale;

      // Projection drop line (dashed)
      if (showProjections) {
        ctx.strokeStyle = isNearPC1 ? 'rgba(56, 189, 248, 0.28)' : 'rgba(244, 63, 94, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(projX, projY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Projected footprint on the axis line
      if (showProjectedPoints) {
        ctx.fillStyle = isNearPC1 ? '#38bdf8' : '#e2e8f0';
        ctx.beginPath();
        ctx.arc(projX, projY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Original data point
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Center Origin (Mean point)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label on origin
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('(0,0) Centered Mean', cx + 10, cy + 16);
  }, [points, angleRad, pca, showProjections, showProjectedPoints, isNearPC1]);

  // Snap handlers
  const handleSnapPC1 = () => {
    setIsPlaying(false);
    setAngleDeg(truePC1Deg);
  };

  const handleSnapPC2 = () => {
    setIsPlaying(false);
    setAngleDeg(truePC2Deg);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs font-mono text-sky-400 tracking-wider uppercase mb-1">
            Intuitive Core Principle
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Rotate the Axis to Maximize Variance
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Principal Component Analysis finds a new coordinate axis that maximizes the spread
            (variance) of projected points. By the Pythagorean theorem, maximizing projected
            variance <span className="text-sky-300 font-medium">simultaneously minimizes the reconstruction error</span> (distance from points to the line).
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Dataset:</span>
          <select
            aria-label="Dataset preset selection"
            onChange={e => {
              setPoints(generate2DPreset(e.target.value as any, 42));
              setIsPlaying(false);
            }}
            className="text-xs bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="strong_corr">Strong Correlation (Elongated)</option>
            <option value="moderate_corr">Moderate Correlation</option>
            <option value="two_clusters">Two Distant Clusters</option>
            <option value="circular">Circular (Isotropic)</option>
            <option value="outlier">Outlier Stress Test</option>
          </select>
        </div>
      </div>

      {/* Main Interactive Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 2D Stage Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 relative flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300">Candidate 1D Projection Line</span>
              {isNearPC1 && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                  <Sparkles className="w-3 h-3" /> Optimal PC1 Aligned!
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={showProjections}
                  onChange={e => setShowProjections(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                Error Lines
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={showProjectedPoints}
                  onChange={e => setShowProjectedPoints(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                1D Projected Dots
              </label>
            </div>
          </div>

          {/* Canvas */}
          <div className="relative w-full aspect-square max-w-[500px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800/80 shadow-inner flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Canvas Legend */}
          <div className="w-full flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-100" />
              <span>Original Points (x_i, y_i)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Projected Footprint</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t border-dashed border-rose-400" />
              <span>Projection Error d_i</span>
            </div>
          </div>
        </div>

        {/* Right: Controls, Live Gauges & Curve (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Angle Controller */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="angle-slider" className="text-sm font-semibold text-white">Axis Rotation Angle θ</label>
              <span className="text-sm font-mono text-sky-400 font-semibold tabular-nums">
                {angleDeg.toFixed(1)}°
              </span>
            </div>

            {/* Slider */}
            <input
              id="angle-slider"
              type="range"
              min={0}
              max={180}
              step={0.5}
              value={angleDeg}
              onChange={e => {
                setIsPlaying(false);
                setAngleDeg(parseFloat(e.target.value));
              }}
              className="w-full h-2 bg-slate-800 rounded-lg cursor-pointer"
            />

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause Sweep' : 'Auto Sweep'}</span>
              </button>

              <button
                onClick={handleSnapPC1}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-400 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 rounded-lg transition-colors"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Snap to PC1 ({truePC1Deg}°)</span>
              </button>

              <button
                onClick={handleSnapPC2}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-400 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 rounded-lg transition-colors"
              >
                <span>Snap to PC2 ({truePC2Deg}°)</span>
              </button>
            </div>
          </div>

          {/* Dual Gauges: Variance vs Reconstruction Error */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Real-Time Trade-Off Metrics
            </h2>

            {/* Variance Metric */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Projected Variance σ²(θ)</span>
                <span className="font-mono text-sky-400 font-semibold tabular-nums">
                  {stats.variance.toFixed(2)} ({(varianceRatio * 100).toFixed(1)}% of total)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, (stats.variance / maxPossibleVariance) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>0.00</span>
                <span>Max Target (PC1): {maxPossibleVariance.toFixed(2)}</span>
              </div>
            </div>

            {/* Reconstruction Error SSD */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Reconstruction Error (SSD) ∑ d_i²</span>
                <span className="font-mono text-rose-400 font-semibold tabular-nums">
                  {stats.ssd.toFixed(1)}
                </span>
              </div>
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-75"
                  style={{ width: `${Math.min(100, (stats.ssd / (stats.totalDistSq || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Min Target (PC1): {(pca.lambda2 * (points.length - 1)).toFixed(1)}</span>
                <span>Max Error: {(pca.lambda1 * (points.length - 1)).toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Variance Profile Curve Graph */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Variance vs. Rotation Curve
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">θ ∈ [0°, 180°]</span>
            </div>

            {/* SVG Plot */}
            <div className="w-full h-28 bg-slate-950 rounded-lg p-2 border border-slate-800 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 180 80" preserveAspectRatio="none">
                {/* Horizontal baseline */}
                <line x1="0" y1="75" x2="180" y2="75" stroke="#1e293b" strokeWidth="1" />

                {/* Variance curve */}
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  points={curveData
                    .map(pt => {
                      const y = 75 - (pt.variance / (maxPossibleVariance || 1)) * 65;
                      return `${pt.deg},${y}`;
                    })
                    .join(' ')}
                />

                {/* Marker at True PC1 */}
                <line
                  x1={truePC1Deg}
                  y1="5"
                  x2={truePC1Deg}
                  y2="75"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="2,2"
                />
                <circle cx={truePC1Deg} cy={10} r="3" fill="#38bdf8" />

                {/* Marker at current user angle */}
                <circle
                  cx={angleDeg}
                  cy={75 - (stats.variance / (maxPossibleVariance || 1)) * 65}
                  r="4"
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1 text-sky-400">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Peak = PC1 ({truePC1Deg}°)</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Current Angle: {angleDeg.toFixed(0)}°</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deep-Dive Pedagogy Callout */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white">
              The Fundamental Theorem: Why Max Variance = Min Reconstruction Error
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              For any centered data point x_i and candidate unit direction vector u, the right triangle formed with its orthogonal projection satisfies the Pythagorean theorem:
            </p>
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-sky-300 overflow-x-auto">
              ||x_i||² = (projected length x_i · u)² + (orthogonal error d_i)²
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Summing across all N data points, the left-hand side ∑ ||x_i||² is the <strong className="text-slate-200">total variance of the dataset</strong>, which is a fixed constant independent of u. Therefore:
            </p>
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto">
              Total Variance (Fixed) = (N - 1) · Projected Variance + ∑ d_i² (Reconstruction Error)
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Because their sum is constant, <em>increasing projected variance necessarily drives the reconstruction error down to its absolute minimum</em>. The eigenvector corresponding to the largest eigenvalue of the covariance matrix Σ guarantees this global optimum!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
