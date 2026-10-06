import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Sliders, Layers, Sparkles, RefreshCw } from 'lucide-react';
import { Point2D, computePCA2D, generate2DPreset } from '../utils/math';

export const StepByStepLab: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [points, setPoints] = useState<Point2D[]>(() => generate2DPreset('strong_corr', 35));
  const [projectionProgress, setProjectionProgress] = useState<number>(1); // 0 (original) to 1 (projected)
  const [reconstructionProgress, setReconstructionProgress] = useState<number>(1);
  const [showNaiveComparison, setShowNaiveComparison] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute PCA
  const pca = useMemo(() => computePCA2D(points), [points]);

  const steps = [
    {
      title: '1. Raw Features & Original Coordinates',
      subtitle: 'Observation of uncentered data cloud in original feature dimensions (X₁, X₂)',
      description:
        'Real-world observations possess arbitrary coordinate scales and non-zero central tendencies. Here, each point represents two correlated attributes (e.g. Size vs. Price, or Height vs. Weight). The golden marker indicates the empirical center of mass (sample mean vector x̄).',
    },
    {
      title: '2. Mean Centering (Origin Alignment)',
      subtitle: 'Translating the dataset center of mass to (0, 0)',
      description:
        'PCA models variance around the center of mass. By subtracting the mean vector x̄ from every observation, we eliminate constant bias without altering relative distances or variance. After centering, the covariance matrix simplifies to simple vector inner products.',
    },
    {
      title: '3. Covariance Matrix & Eigenvectors',
      subtitle: 'Identifying the orthogonal axes of maximum variance (PC1 & PC2)',
      description:
        'We construct the 2×2 Covariance Matrix Σ and solve the characteristic equation det(Σ - λI) = 0. The resulting eigenvectors v₁ and v₂ define brand new, mutually perpendicular axes. The eigenvalue λ₁ quantifies the exact variance along PC1.',
    },
    {
      title: '4. Dimensionality Reduction (2D → 1D)',
      subtitle: 'Orthogonal projection of 2D coordinates onto the 1st Principal Component',
      description:
        'To reduce dimensionality from 2D to 1D, we project each centered point onto PC1: z_i = x_i · v₁. Notice how PCA retains the natural spread of the data, whereas naive feature dropping (simply discarding X₂) results in overlapping clusters and lost variance.',
    },
    {
      title: '5. Reconstruction & Information Preservation',
      subtitle: 'Quantifying preserved variance vs. compression error',
      description:
        'From our compact 1D representation z_i, we can reconstruct approximate 2D coordinates: x̂_i = x̄ + z_i v₁. The eigenvalue ratio λ₁ / (λ₁ + λ₂) tells us the exact percentage of total information preserved in our 1D model!',
    },
  ];

  // Render Canvas
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
    const scale = 20;

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = -12; x <= 12; x += 2) {
      ctx.beginPath();
      ctx.moveTo(cx + x * scale, 0);
      ctx.lineTo(cx + x * scale, height);
      ctx.stroke();
    }
    for (let y = -12; y <= 12; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, cy - y * scale);
      ctx.lineTo(width, cy - y * scale);
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

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('X₁', width - 20, cy - 8);
    ctx.fillText('X₂', cx + 8, 20);

    const isCentered = currentStep >= 1;

    // Render Mean Point in Step 0
    if (currentStep === 0) {
      const mx = cx + pca.meanX * scale;
      const my = cy - pca.meanY * scale;

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText(
        `Mean x̄ (${pca.meanX.toFixed(1)}, ${pca.meanY.toFixed(1)})`,
        mx + 10,
        my - 10
      );
    }

    // Principal Component Lines (Step 2, 3, 4)
    if (currentStep >= 2) {
      const v1 = pca.v1;
      const v2 = pca.v2;
      const lineLen = 320;

      // PC1 Line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - v1.x * lineLen, cy + v1.y * lineLen);
      ctx.lineTo(cx + v1.x * lineLen, cy - v1.y * lineLen);
      ctx.stroke();

      // PC2 Line
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - v2.x * (lineLen * 0.6), cy + v2.y * (lineLen * 0.6));
      ctx.lineTo(cx + v2.x * (lineLen * 0.6), cy - v2.y * (lineLen * 0.6));
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Eigenvector Arrows scaled by sqrt(lambda) (standard deviation)
      const std1 = Math.sqrt(pca.lambda1) * scale;
      const std2 = Math.sqrt(pca.lambda2) * scale;

      // Vector 1 (PC1)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + v1.x * std1, cy - v1.y * std1);
      ctx.stroke();

      // Vector 2 (PC2)
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + v2.x * std2, cy - v2.y * std2);
      ctx.stroke();

      // Arrow heads
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx + v1.x * std1, cy - v1.y * std1, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(cx + v2.x * std2, cy - v2.y * std2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Labels for PCs
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(
        `PC1 (λ₁=${pca.lambda1.toFixed(1)}, ${(pca.explainedVariance1 * 100).toFixed(0)}%)`,
        cx + v1.x * std1 + 8,
        cy - v1.y * std1 - 8
      );

      ctx.fillStyle = '#c084fc';
      ctx.fillText(
        `PC2 (λ₂=${pca.lambda2.toFixed(1)})`,
        cx + v2.x * std2 + 8,
        cy - v2.y * std2 - 8
      );

      // Variance confidence ellipse in Step 2
      if (currentStep === 2) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-pca.pc1Angle);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, std1 * 1.96, std2 * 1.96, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Render Data Points based on current step
    points.forEach(pt => {
      let curX = pt.x;
      let curY = pt.y;

      if (isCentered) {
        curX = pt.x - pca.meanX;
        curY = pt.y - pca.meanY;
      }

      // If Step 3 (Dimensionality reduction), animate projection onto PC1
      if (currentStep === 3) {
        const v1 = pca.v1;
        const proj = curX * v1.x + curY * v1.y;
        const targetX = proj * v1.x;
        const targetY = proj * v1.y;

        // Interpolate between centered 2D and 1D line
        const interpX = curX + (targetX - curX) * projectionProgress;
        const interpY = curY + (targetY - curY) * projectionProgress;

        const screenX = cx + interpX * scale;
        const screenY = cy - interpY * scale;

        // Projection dashed line
        if (projectionProgress > 0.05) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(cx + curX * scale, cy - curY * scale);
          ctx.lineTo(cx + targetX * scale, cy - targetY * scale);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Naive comparison (drop X2, project to X1)
        if (showNaiveComparison && projectionProgress > 0.5) {
          const naiveX = cx + curX * scale;
          const naiveY = cy; // collapsed onto X axis

          ctx.fillStyle = 'rgba(244, 63, 94, 0.6)';
          ctx.beginPath();
          ctx.arc(naiveX, naiveY, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        return;
      }

      // Step 4: Reconstruction
      if (currentStep === 4) {
        const v1 = pca.v1;
        const proj = curX * v1.x + curY * v1.y;
        const reconX = proj * v1.x;
        const reconY = proj * v1.y;

        const screenOrigX = cx + curX * scale;
        const screenOrigY = cy - curY * scale;
        const screenReconX = cx + reconX * scale;
        const screenReconY = cy - reconY * scale;

        // Residual error vector
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(screenOrigX, screenOrigY);
        ctx.lineTo(screenReconX, screenReconY);
        ctx.stroke();

        // Original point
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(screenOrigX, screenOrigY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Reconstructed point on PC1
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(screenReconX, screenReconY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        return;
      }

      // Default rendering for steps 0, 1, 2
      const screenX = cx + curX * scale;
      const screenY = cy - curY * scale;

      ctx.fillStyle = isCentered ? '#38bdf8' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [points, currentStep, pca, projectionProgress, reconstructionProgress, showNaiveComparison]);

  return (
    <div className="space-y-6">
      {/* Step Stepper Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-mono text-sky-400 tracking-wider uppercase mb-1">
              Linear Algebra Workflow
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              5-Step PCA Computational Pipeline
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStep === steps.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {steps.map((st, idx) => {
            const isCurrent = currentStep === idx;
            const isCompleted = currentStep > idx;
            return (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isCurrent
                    ? 'bg-sky-950/70 border-sky-500/80 text-white shadow-sm'
                    : isCompleted
                    ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-slate-900/20 border-slate-800/60 text-slate-500 hover:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Step 0{idx + 1}
                  </span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <div className="text-xs font-medium truncate font-sans">
                  {st.title.split('. ')[1]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Interactive Canvas & Pedagogical Step Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 2D Interactive Stage (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-300">
            <span className="font-semibold">{steps[currentStep].title}</span>
            <button
              onClick={() => setPoints(generate2DPreset('strong_corr', 35))}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reseed Points</span>
            </button>
          </div>

          <div className="relative w-full aspect-square max-w-[500px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
            <canvas ref={canvasRef} width={500} height={500} className="w-full h-full object-contain" />
          </div>

          {/* Interactive controls specific to the step */}
          {currentStep === 3 && (
            <div className="w-full mt-4 pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="dim-slider" className="text-slate-300 font-medium">Projection onto 1D PC1 Line</label>
                <span className="font-mono text-sky-400 tabular-nums">
                  {(projectionProgress * 100).toFixed(0)}%
                </span>
              </div>
              <input
                id="dim-slider"
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={projectionProgress}
                onChange={e => setProjectionProgress(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={showNaiveComparison}
                    onChange={e => setShowNaiveComparison(e.target.checked)}
                    className="rounded border-slate-700 text-rose-500"
                  />
                  <span>Compare with Naive Feature Drop (dropping X₂ onto X₁ in red)</span>
                </label>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="w-full mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-500" />
                <span>Original 2D x_i</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400" />
                <span>Reconstructed x̂_i = x̄ + z_i v₁</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-rose-400" />
                <span>Residual Error Vector e_i</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Mathematical Details & Live Matrices (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Step Explanation Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
            <h2 className="text-xs font-mono text-sky-400 uppercase tracking-wider">
              Mathematical Rationale
            </h2>
            <h3 className="text-base font-semibold text-white">
              {steps[currentStep].subtitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Live Matrix Inspector */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Live Linear Algebra Inspector
              </h2>
              <span className="text-[11px] font-mono text-slate-500">N = {points.length} samples</span>
            </div>

            {/* Mean Vector */}
            <div className="space-y-1">
              <div className="text-xs text-slate-400">Sample Mean Vector x̄:</div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-amber-400 flex items-center justify-around">
                <span>X̄₁ = {pca.meanX.toFixed(2)}</span>
                <span className="text-slate-600">|</span>
                <span>X̄₂ = {pca.meanY.toFixed(2)}</span>
              </div>
            </div>

            {/* Covariance Matrix */}
            <div className="space-y-1">
              <div className="text-xs text-slate-400">
                Sample Covariance Matrix Σ = 1/(N - 1) Xᵀ X:
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-sky-300 grid grid-cols-2 gap-2 text-center">
                <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Var(X₁)</div>
                  {pca.covXX.toFixed(2)}
                </div>
                <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Cov(X₁, X₂)</div>
                  {pca.covXY.toFixed(2)}
                </div>
                <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Cov(X₂, X₁)</div>
                  {pca.covXY.toFixed(2)}
                </div>
                <div className="p-1.5 bg-slate-900/80 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">Var(X₂)</div>
                  {pca.covYY.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Eigenvalues & Eigenvectors */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="text-xs text-slate-400">Eigendecomposition:</div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {/* PC1 */}
                <div className="p-2.5 bg-sky-950/40 border border-sky-800/60 rounded-lg space-y-1">
                  <div className="text-sky-400 font-bold">PC1 (Dominant)</div>
                  <div className="text-slate-300">λ₁ = {pca.lambda1.toFixed(2)}</div>
                  <div className="text-[11px] text-slate-400">
                    v₁ = [{pca.v1.x.toFixed(2)}, {pca.v1.y.toFixed(2)}]
                  </div>
                  <div className="text-sky-300 font-semibold pt-1">
                    {(pca.explainedVariance1 * 100).toFixed(1)}% variance
                  </div>
                </div>

                {/* PC2 */}
                <div className="p-2.5 bg-purple-950/40 border border-purple-800/60 rounded-lg space-y-1">
                  <div className="text-purple-400 font-bold">PC2 (Orthogonal)</div>
                  <div className="text-slate-300">λ₂ = {pca.lambda2.toFixed(2)}</div>
                  <div className="text-[11px] text-slate-400">
                    v₂ = [{pca.v2.x.toFixed(2)}, {pca.v2.y.toFixed(2)}]
                  </div>
                  <div className="text-purple-300 font-semibold pt-1">
                    {(pca.explainedVariance2 * 100).toFixed(1)}% variance
                  </div>
                </div>
              </div>
            </div>

            {/* Preserved Variance Progress */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Preserved 1D Information</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {(pca.explainedVariance1 * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${pca.explainedVariance1 * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
