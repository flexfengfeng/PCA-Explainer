import React from 'react';
import { X, BookOpen, CheckCircle, Sigma } from 'lucide-react';

interface MathExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MathExplainerModal: React.FC<MathExplainerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white font-sans">
              Mathematical Foundation of PCA
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-sm text-slate-300 leading-relaxed font-sans">
          {/* Section 1: Optimization Objective */}
          <section className="space-y-2">
            <h3 className="text-xs font-mono text-sky-400 uppercase tracking-wider">
              1. The Optimization Objective (Maximizing Variance)
            </h3>
            <p>
              Given N observations x₁, ..., x_N in R^D centered around their mean (mean x̄ = 0), we seek a unit direction vector u (with ||u|| = 1) such that the variance of the scalar projections z_i = x_i · u is maximized:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto">
              Var(z) = 1/(N - 1) ∑ (x_i · u)² = uᵀ [ 1/(N - 1) ∑ x_i x_iᵀ ] u = uᵀ Σ u
            </div>
            <p>
              where Σ in R^(D×D) is the empirical sample covariance matrix.
            </p>
          </section>

          {/* Section 2: Lagrange Multiplier Derivation */}
          <section className="space-y-2">
            <h3 className="text-xs font-mono text-sky-400 uppercase tracking-wider">
              2. Lagrange Multiplier Derivation
            </h3>
            <p>
              To maximize uᵀ Σ u subject to the unit-norm constraint uᵀ u = 1, we formulate the Lagrangian function:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-purple-300 overflow-x-auto">
              L(u, λ) = uᵀ Σ u - λ (uᵀ u - 1)
            </div>
            <p>
              Taking the gradient with respect to u and equating to zero:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
              ∇_u L = 2 Σ u - 2 λ u = 0  ⟹  Σ u = λ u
            </div>
            <p>
              This is the fundamental <strong>eigenvalue equation</strong>! Premultiplying both sides by uᵀ:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto">
              uᵀ Σ u = λ uᵀ u = λ
            </div>
            <p>
              Thus, the projected variance along direction u is exactly equal to the eigenvalue λ. To achieve maximal variance, we select the eigenvector corresponding to the <strong>largest eigenvalue λ₁</strong>.
            </p>
          </section>

          {/* Section 3: Dual Equivalence: Minimizing Projection Error */}
          <section className="space-y-2">
            <h3 className="text-xs font-mono text-sky-400 uppercase tracking-wider">
              3. Dual Equivalence: Minimizing Reconstruction Error
            </h3>
            <p>
              By the Pythagorean theorem, every centered data vector x_i decomposes into its projection along u and its orthogonal residual error e_i:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
              ||x_i||² = (x_i · u)² + ||e_i||²
            </div>
            <p>
              Summing across all N observations:
            </p>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-rose-300 overflow-x-auto">
              ∑ ||x_i||² = (N - 1) · Var(proj) + ∑ ||e_i||²
            </div>
            <p>
              Because the left side is the fixed total data variance, <em>maximizing projected variance is mathematically identical to minimizing reconstruction error</em>.
            </p>
          </section>

          {/* Section 4: Dimensionality Reduction & Reconstruction */}
          <section className="space-y-2">
            <h3 className="text-xs font-mono text-sky-400 uppercase tracking-wider">
              4. Projection & Reconstruction Formulas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-400 font-sans font-semibold">Encoding (D → k):</div>
                <div className="text-sky-300">z_i = V_kᵀ (x_i - x̄)</div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Reduces dimension from D features to k principal coordinates.
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-400 font-sans font-semibold">Decoding (k → D):</div>
                <div className="text-purple-300">x̂_i = x̄ + V_k z_i</div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Optimal least-squares reconstruction in original feature space.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg font-semibold transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
