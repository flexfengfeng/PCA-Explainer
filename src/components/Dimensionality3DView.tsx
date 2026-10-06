import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Box, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Point3D, generate3DPreset, computePCA_ND } from '../utils/math';

export const Dimensionality3DView: React.FC = () => {
  const [datasetType, setDatasetType] = useState<'cigar' | 'disc' | 'three_clusters'>('three_clusters');
  const [points3D, setPoints3D] = useState<Point3D[]>(() => generate3DPreset('three_clusters', 60));
  const [projectionProgress, setProjectionProgress] = useState<number>(0); // 0 = 3D cloud, 1 = projected onto 2D plane
  const [showPlane, setShowPlane] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);

  // 3D Orbit Camera State
  const [rotX, setRotX] = useState<number>(0.5);
  const [rotY, setRotY] = useState<number>(0.65);
  const [zoom, setZoom] = useState<number>(20);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute 3D PCA
  const pca3D = useMemo(() => {
    const rawData = points3D.map(p => [p.x, p.y, p.z]);
    return computePCA_ND(rawData, ['X', 'Y', 'Z']);
  }, [points3D]);

  // Handle Mouse Drag for Orbiting
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setRotY(prev => prev + dx * 0.008);
    setRotX(prev => Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, prev + dy * 0.008)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Render 3D Canvas
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

    // 3D Rotation matrices
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);

    // Project 3D (x,y,z) to 2D screen coordinates with perspective
    const project = (x: number, y: number, z: number) => {
      // Rotate around Y
      const x1 = cosY * x + sinY * z;
      const z1 = -sinY * x + cosY * z;

      // Rotate around X
      const y2 = cosX * y - sinX * z1;
      const z2 = sinX * y + cosX * z1;

      // Simple perspective
      const distance = 40;
      const fov = distance / (distance + z2);
      const sx = cx + x1 * zoom * fov;
      const sy = cy - y2 * zoom * fov;

      return { sx, sy, depth: z2 };
    };

    // Draw 3D coordinate frame axes
    const axisLen = 8;
    const origin = project(0, 0, 0);
    const axX = project(axisLen, 0, 0);
    const axY = project(0, axisLen, 0);
    const axZ = project(0, 0, axisLen);

    ctx.lineWidth = 1;
    // X Axis
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    ctx.lineTo(axX.sx, axX.sy);
    ctx.stroke();

    // Y Axis
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    ctx.lineTo(axY.sx, axY.sy);
    ctx.stroke();

    // Z Axis
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    ctx.lineTo(axZ.sx, axZ.sy);
    ctx.stroke();

    // Eigenvectors
    const ev1 = pca3D.eigenvectors[0] || [1, 0, 0];
    const ev2 = pca3D.eigenvectors[1] || [0, 1, 0];
    const ev3 = pca3D.eigenvectors[2] || [0, 0, 1];

    // Principal Hyperplane Quad in 3D (spanned by v1 and v2)
    if (showPlane) {
      const planeSpan = 8;
      const p1 = project(
        -ev1[0] * planeSpan - ev2[0] * planeSpan,
        -ev1[1] * planeSpan - ev2[1] * planeSpan,
        -ev1[2] * planeSpan - ev2[2] * planeSpan
      );
      const p2 = project(
        ev1[0] * planeSpan - ev2[0] * planeSpan,
        ev1[1] * planeSpan - ev2[1] * planeSpan,
        ev1[2] * planeSpan - ev2[2] * planeSpan
      );
      const p3 = project(
        ev1[0] * planeSpan + ev2[0] * planeSpan,
        ev1[1] * planeSpan + ev2[1] * planeSpan,
        ev1[2] * planeSpan + ev2[2] * planeSpan
      );
      const p4 = project(
        -ev1[0] * planeSpan + ev2[0] * planeSpan,
        -ev1[1] * planeSpan + ev2[1] * planeSpan,
        -ev1[2] * planeSpan + ev2[2] * planeSpan
      );

      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.lineTo(p3.sx, p3.sy);
      ctx.lineTo(p4.sx, p4.sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Principal Component Vector Arrows
    if (showVectors) {
      const vLen1 = Math.sqrt(pca3D.eigenvalues[0]) * 1.5;
      const vLen2 = Math.sqrt(pca3D.eigenvalues[1]) * 1.5;
      const vLen3 = Math.sqrt(pca3D.eigenvalues[2]) * 1.5;

      const pPC1 = project(ev1[0] * vLen1, ev1[1] * vLen1, ev1[2] * vLen1);
      const pPC2 = project(ev2[0] * vLen2, ev2[1] * vLen2, ev2[2] * vLen2);
      const pPC3 = project(ev3[0] * vLen3, ev3[1] * vLen3, ev3[2] * vLen3);

      // PC1 Vector (Electric Blue)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(pPC1.sx, pPC1.sy);
      ctx.stroke();

      // PC2 Vector (Purple)
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(pPC2.sx, pPC2.sy);
      ctx.stroke();

      // PC3 Vector (Emerald - discarded noise)
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(pPC3.sx, pPC3.sy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Points rendering (depth sorted)
    const projectedPoints = points3D.map((p, idx) => {
      const cx = p.x - pca3D.means[0];
      const cy = p.y - pca3D.means[1];
      const cz = p.z - pca3D.means[2];

      // Projections along ev1 and ev2
      const proj1 = cx * ev1[0] + cy * ev1[1] + cz * ev1[2];
      const proj2 = cx * ev2[0] + cy * ev2[1] + cz * ev2[2];

      // Target position on 2D principal plane
      const targetX = proj1 * ev1[0] + proj2 * ev2[0];
      const targetY = proj1 * ev1[1] + proj2 * ev2[1];
      const targetZ = proj1 * ev1[2] + proj2 * ev2[2];

      // Interpolated position between 3D and 2D plane
      const curX = cx + (targetX - cx) * projectionProgress;
      const curY = cy + (targetY - cy) * projectionProgress;
      const curZ = cz + (targetZ - cz) * projectionProgress;

      const screenPt = project(curX, curY, curZ);
      const origScreenPt = project(cx, cy, cz);
      const targetScreenPt = project(targetX, targetY, targetZ);

      return {
        id: p.id,
        group: p.group,
        sx: screenPt.sx,
        sy: screenPt.sy,
        origSx: origScreenPt.sx,
        origSy: origScreenPt.sy,
        targetSx: targetScreenPt.sx,
        targetSy: targetScreenPt.sy,
        depth: screenPt.depth,
      };
    });

    // Sort by depth (painters algorithm)
    projectedPoints.sort((a, b) => b.depth - a.depth);

    projectedPoints.forEach(p => {
      // Drop line
      if (projectionProgress > 0.05 && projectionProgress < 0.98) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(p.origSx, p.origSy);
        ctx.lineTo(p.targetSx, p.targetSy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Point color according to group
      ctx.fillStyle =
        p.group === 'Species Alpha'
          ? '#38bdf8'
          : p.group === 'Species Beta'
          ? '#f43f5e'
          : p.group === 'Species Gamma'
          ? '#34d399'
          : '#e2e8f0';

      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [
    points3D,
    pca3D,
    rotX,
    rotY,
    zoom,
    projectionProgress,
    showPlane,
    showVectors,
  ]);

  const preservedVariance = (
    (pca3D.explainedVarianceRatio[0] + pca3D.explainedVarianceRatio[1]) *
    100
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs font-mono text-sky-400 tracking-wider uppercase mb-1">
            Higher Dimensions
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            3D to 2D Dimensionality Reduction
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            In 3D, PCA identifies the optimal 2-dimensional plane (hyperplane) spanned by the first two eigenvectors v₁ and v₂. Click and drag to orbit in 3D, and drag the slider to watch points collapse onto the best-fit subspace!
          </p>
        </div>

        {/* Dataset selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Dataset:</span>
          <select
            aria-label="3D dataset preset selection"
            value={datasetType}
            onChange={e => {
              const val = e.target.value as any;
              setDatasetType(val);
              setPoints3D(generate3DPreset(val, 60));
              setProjectionProgress(0);
            }}
            className="text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="three_clusters">3 Clusters in 3D (Multiclass)</option>
            <option value="cigar">Elongated 1D Cigar in 3D</option>
            <option value="disc">Tilted 2D Disc in 3D</option>
          </select>
        </div>
      </div>

      {/* Main Grid: 3D Viewport & 2D Unfolded Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 3D Viewport (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Box className="w-4 h-4 text-sky-400" />
              <span>3D Orbital Space (Drag to Rotate)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(prev => Math.min(35, prev + 2))}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(prev => Math.max(10, prev - 2))}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setRotX(0.5);
                  setRotY(0.65);
                  setZoom(20);
                }}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                title="Reset Camera"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="relative w-full aspect-square max-w-[500px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing">
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

          {/* 3D Controls */}
          <div className="w-full mt-4 pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="hyperplane-slider" className="text-slate-300 font-medium">
                Drop Orthogonally to 2D Principal Plane
              </label>
              <span className="font-mono text-sky-400 tabular-nums">
                {(projectionProgress * 100).toFixed(0)}% Flattened
              </span>
            </div>
            <input
              id="hyperplane-slider"
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={projectionProgress}
              onChange={e => setProjectionProgress(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={showPlane}
                  onChange={e => setShowPlane(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500"
                />
                <span>Principal 2D Plane</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={showVectors}
                  onChange={e => setShowVectors(e.target.checked)}
                  className="rounded border-slate-700 text-purple-500"
                />
                <span>Principal Vectors (PC1, PC2, PC3)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Flattened 2D Representation & Scree Plot (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Resulting 2D PCA Plot */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Unfolded 2D PCA Embedding
              </h2>
              <span className="text-[11px] font-mono text-emerald-400">
                {preservedVariance}% Variance Retained
              </span>
            </div>

            {/* SVG 2D Scatter of Projected Points */}
            <div className="w-full aspect-[4/3] bg-slate-950 rounded-lg p-2 border border-slate-800 relative flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="-12 -12 24 24">
                {/* 2D Axes */}
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#1e293b" strokeWidth="0.3" />
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#1e293b" strokeWidth="0.3" />

                {/* Points projected onto PC1 & PC2 */}
                {pca3D.projected2D.map(p => {
                  const original = points3D[p.sampleIndex];
                  const color =
                    original?.group === 'Species Alpha'
                      ? '#38bdf8'
                      : original?.group === 'Species Beta'
                      ? '#f43f5e'
                      : original?.group === 'Species Gamma'
                      ? '#34d399'
                      : '#e2e8f0';

                  return (
                    <circle
                      key={p.sampleIndex}
                      cx={p.x}
                      cy={-p.y}
                      r={0.45}
                      fill={color}
                      stroke="#0f172a"
                      strokeWidth={0.1}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Horizontal: PC1</span>
              <span>Vertical: PC2</span>
            </div>
          </div>

          {/* Scree Plot */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Eigenvalue Scree Plot (Variance Explained)
            </h2>

            <div className="space-y-3">
              {pca3D.eigenvalues.map((ev, idx) => {
                const ratio = pca3D.explainedVarianceRatio[idx] * 100;
                const isKept = idx < 2;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={isKept ? 'text-sky-300 font-medium' : 'text-slate-500'}>
                        PC{idx + 1} {isKept ? '(Preserved)' : '(Discarded Noise)'}
                      </span>
                      <span className="font-mono text-slate-300 tabular-nums">
                        {ratio.toFixed(1)}% (λ = {ev.toFixed(2)})
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full ${
                          idx === 0
                            ? 'bg-sky-400'
                            : idx === 1
                            ? 'bg-purple-400'
                            : 'bg-slate-600'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-400">
              By keeping the first 2 principal components, we reduce the dimensions from <strong className="text-white">3 to 2</strong> (33% storage reduction) while preserving <strong className="text-emerald-400">{preservedVariance}%</strong> of the complete statistical variance!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
