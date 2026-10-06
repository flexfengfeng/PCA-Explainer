import React, { useState, useMemo } from 'react';
import { Flower2, Compass, Layers, CheckCircle2, Info } from 'lucide-react';
import {
  IRIS_DATASET,
  IRIS_FEATURE_NAMES,
  computePCA_ND,
  IrisSample,
} from '../utils/math';

export const IrisBiplotView: React.FC = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showBiplotVectors, setShowBiplotVectors] = useState<boolean>(true);
  const [filterSpecies, setFilterSpecies] = useState<'All' | 'Setosa' | 'Versicolor' | 'Virginica'>('All');

  // Format data matrix: 60 samples x 4 features
  const rawData = useMemo(() => {
    return IRIS_DATASET.map(sample => [
      sample.sepalLength,
      sample.sepalWidth,
      sample.petalLength,
      sample.petalWidth,
    ]);
  }, []);

  // Compute 4D PCA
  const pcaResults = useMemo(() => {
    return computePCA_ND(rawData, IRIS_FEATURE_NAMES);
  }, [rawData]);

  // Biplot feature loadings
  // Loading = eigenvector element scaled by sqrt(eigenvalue)
  const loadings = useMemo(() => {
    const ev1 = pcaResults.eigenvectors[0];
    const ev2 = pcaResults.eigenvectors[1];
    const s1 = Math.sqrt(pcaResults.eigenvalues[0]);
    const s2 = Math.sqrt(pcaResults.eigenvalues[1]);

    return IRIS_FEATURE_NAMES.map((name, i) => ({
      name,
      x: ev1[i] * s1 * 0.8,
      y: ev2[i] * s2 * 0.8,
    }));
  }, [pcaResults]);

  const preservedVariance = (
    (pcaResults.explainedVarianceRatio[0] + pcaResults.explainedVarianceRatio[1]) *
    100
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs font-mono text-sky-400 tracking-wider uppercase mb-1">
            Real-World High-Dimensional Benchmark
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
            Fisher's Iris Flower Dataset (4D → 2D Biplot)
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Each flower sample has 4 biological measurements (Sepal Length, Sepal Width, Petal Length, Petal Width). By compressing 4 dimensions down to 2 principal components, we retain <strong className="text-emerald-400">{preservedVariance}%</strong> of the complete morphometric variation!
          </p>
        </div>

        {/* Species Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {(['All', 'Setosa', 'Versicolor', 'Virginica'] as const).map(spec => (
            <button
              key={spec}
              onClick={() => setFilterSpecies(spec)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterSpecies === spec
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Biplot Stage & Scree/Feature Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 2D Biplot Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Flower2 className="w-4 h-4 text-sky-400" />
              <span>PC1 vs PC2 Projection Space</span>
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={showBiplotVectors}
                onChange={e => setShowBiplotVectors(e.target.checked)}
                className="rounded border-slate-700 text-amber-500"
              />
              <span>Feature Loading Arrows (Biplot)</span>
            </label>
          </div>

          {/* SVG Biplot Stage */}
          <div className="relative w-full aspect-square max-w-[500px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center p-4">
            <svg className="w-full h-full overflow-visible" viewBox="-4.5 -3.5 9 7">
              {/* Coordinate Grid & Axes */}
              <line x1="-4.5" y1="0" x2="4.5" y2="0" stroke="#1e293b" strokeWidth="0.04" />
              <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#1e293b" strokeWidth="0.04" />

              {/* Biplot Feature Loadings Vectors */}
              {showBiplotVectors &&
                loadings.map((load, idx) => {
                  return (
                    <g key={idx}>
                      <line
                        x1="0"
                        y1="0"
                        x2={load.x}
                        y2={-load.y}
                        stroke="#f59e0b"
                        strokeWidth="0.06"
                      />
                      <circle cx={load.x} cy={-load.y} r="0.09" fill="#f59e0b" />
                      <text
                        x={load.x > 0 ? load.x + 0.15 : load.x - 0.15}
                        y={-load.y}
                        fill="#fbbf24"
                        fontSize="0.25"
                        fontWeight="600"
                        textAnchor={load.x > 0 ? 'start' : 'end'}
                        alignmentBaseline="middle"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {load.name.split(' (')[0]}
                      </text>
                    </g>
                  );
                })}

              {/* Data Points (Flowers) */}
              {pcaResults.projected2D.map((pt, i) => {
                const sample = IRIS_DATASET[pt.sampleIndex];
                if (filterSpecies !== 'All' && sample.species !== filterSpecies) return null;

                const isHovered = hoveredIndex === i;
                const color =
                  sample.species === 'Setosa'
                    ? '#38bdf8'
                    : sample.species === 'Versicolor'
                    ? '#c084fc'
                    : '#34d399';

                return (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={-pt.y}
                    r={isHovered ? 0.22 : 0.13}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 0.04 : 0.015}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="w-full flex flex-wrap items-center justify-around gap-3 text-xs text-slate-300 mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-400" />
              <span>Iris Setosa (Dwarf Petals)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-400" />
              <span>Iris Versicolor (Intermediate)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span>Iris Virginica (Large)</span>
            </div>
          </div>
        </div>

        {/* Right: Scree Plot & Biplot Interpretation (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Sample Details Card on Hover */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Sample Morphometrics
              </h2>
              {hoveredIndex !== null ? (
                <span className="text-xs font-mono text-sky-400">Sample #{hoveredIndex + 1}</span>
              ) : (
                <span className="text-xs text-slate-500">Hover over any point</span>
              )}
            </div>

            {hoveredIndex !== null ? (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-sans">Species</div>
                  <div className="text-white font-semibold">{IRIS_DATASET[hoveredIndex].species}</div>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-sans">Petal Length</div>
                  <div className="text-amber-400 font-semibold">{IRIS_DATASET[hoveredIndex].petalLength} cm</div>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-sans">Petal Width</div>
                  <div className="text-amber-400 font-semibold">{IRIS_DATASET[hoveredIndex].petalWidth} cm</div>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-sans">Sepal Length</div>
                  <div className="text-slate-300 font-semibold">{IRIS_DATASET[hoveredIndex].sepalLength} cm</div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 text-center">
                Hover over any flower node to inspect its true 4-dimensional biological measurements!
              </div>
            )}
          </div>

          {/* Scree Plot Across All 4 Dimensions */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Eigenvalue Scree Plot (4D Spectrum)
            </h2>

            <div className="space-y-3">
              {pcaResults.eigenvalues.map((ev, idx) => {
                const ratio = pcaResults.explainedVarianceRatio[idx] * 100;
                const isKept = idx < 2;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={isKept ? 'text-sky-300 font-semibold' : 'text-slate-500'}>
                        PC{idx + 1} {isKept ? '(Retained)' : '(Discarded)'}
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
                            : 'bg-slate-700'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-sky-950/40 border border-sky-800/50 rounded-lg text-xs text-slate-300 space-y-1">
              <div className="text-sky-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>95.8% Total Variance Preserved in Just 2 Dimensions!</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                By transforming 4 correlated features into 2 principal components, biologists can visualize species clusters and petal length gradients without losing significant biological signal.
              </p>
            </div>
          </div>

          {/* Biplot Interpretation Guide */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-2">
            <h2 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              How to Read Biplot Arrows
            </h2>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>
                  <strong>Arrow Direction:</strong> Shows the direction in which the original feature increases most rapidly in the new PC coordinate space.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>
                  <strong>Arrow Length:</strong> Indicates how strongly that feature correlates with the first two principal components. Notice Petal Length and Petal Width have long arrows along PC1!
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>
                  <strong>Angle Between Arrows:</strong> Small angles (like Petal Length and Petal Width) indicate high positive correlation between those two features.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
