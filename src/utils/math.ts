/**
 * Mathematical utilities and statistical engines for Principal Component Analysis (PCA).
 * Includes 2D analytical solutions, N-D Jacobi eigenvalue solver, and projection helpers.
 */

export interface Point2D {
  id: string;
  x: number;
  y: number;
  label?: string;
  group?: string;
}

export interface Point3D {
  id: string;
  x: number;
  y: number;
  z: number;
  group?: string;
}

export interface PCA2DResult {
  meanX: number;
  meanY: number;
  centeredPoints: { id: string; x: number; y: number; originalX: number; originalY: number }[];
  covXX: number;
  covYY: number;
  covXY: number;
  lambda1: number; // largest eigenvalue
  lambda2: number; // second eigenvalue
  totalVariance: number;
  explainedVariance1: number; // ratio [0, 1]
  explainedVariance2: number; // ratio [0, 1]
  pc1Angle: number; // radians
  pc2Angle: number; // radians
  v1: { x: number; y: number }; // unit eigenvector 1
  v2: { x: number; y: number }; // unit eigenvector 2
}

/**
 * Computes exact 2D PCA for a set of points.
 */
export function computePCA2D(points: Point2D[]): PCA2DResult {
  const n = points.length;
  if (n < 2) {
    return {
      meanX: points[0]?.x ?? 0,
      meanY: points[0]?.y ?? 0,
      centeredPoints: points.map(p => ({ id: p.id, x: 0, y: 0, originalX: p.x, originalY: p.y })),
      covXX: 1,
      covYY: 1,
      covXY: 0,
      lambda1: 1,
      lambda2: 1,
      totalVariance: 2,
      explainedVariance1: 0.5,
      explainedVariance2: 0.5,
      pc1Angle: 0,
      pc2Angle: Math.PI / 2,
      v1: { x: 1, y: 0 },
      v2: { x: 0, y: 1 },
    };
  }

  // 1. Compute means
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += points[i].x;
    sumY += points[i].y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  // 2. Center points
  const centered = points.map(p => ({
    id: p.id,
    x: p.x - meanX,
    y: p.y - meanY,
    originalX: p.x,
    originalY: p.y,
  }));

  // 3. Sample Covariance Matrix (divisor n - 1)
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;
  for (let i = 0; i < n; i++) {
    const cx = centered[i].x;
    const cy = centered[i].y;
    sumXX += cx * cx;
    sumYY += cy * cy;
    sumXY += cx * cy;
  }
  const covXX = sumXX / (n - 1);
  const covYY = sumYY / (n - 1);
  const covXY = sumXY / (n - 1);

  // 4. Exact Eigenvalues of 2x2 symmetric matrix
  const trace = covXX + covYY;
  const diff = covXX - covYY;
  const discr = Math.sqrt(diff * diff + 4 * covXY * covXY);
  const lambda1 = (trace + discr) / 2;
  const lambda2 = Math.max(0, (trace - discr) / 2);

  // 5. Eigenvectors
  // Principal component angle (direction of maximum variance)
  const pc1Angle = 0.5 * Math.atan2(2 * covXY, diff);
  const pc2Angle = pc1Angle + Math.PI / 2;

  const v1 = { x: Math.cos(pc1Angle), y: Math.sin(pc1Angle) };
  const v2 = { x: Math.cos(pc2Angle), y: Math.sin(pc2Angle) };

  const totalVariance = Math.max(1e-9, lambda1 + lambda2);
  const explainedVariance1 = lambda1 / totalVariance;
  const explainedVariance2 = lambda2 / totalVariance;

  return {
    meanX,
    meanY,
    centeredPoints: centered,
    covXX,
    covYY,
    covXY,
    lambda1,
    lambda2,
    totalVariance,
    explainedVariance1,
    explainedVariance2,
    pc1Angle,
    pc2Angle,
    v1,
    v2,
  };
}

/**
 * Calculates projected variance and reconstruction sum of squared distance (SSD)
 * for an arbitrary candidate projection line at angle theta (radians).
 */
export function computeProjectionStats(
  points: Point2D[],
  meanX: number,
  meanY: number,
  theta: number
) {
  const n = points.length;
  if (n < 2) return { variance: 0, ssd: 0, totalDistSq: 0 };

  const ux = Math.cos(theta);
  const uy = Math.sin(theta);

  let sumProjSq = 0;
  let sumErrorSq = 0;
  let sumTotalSq = 0;

  for (let i = 0; i < n; i++) {
    const cx = points[i].x - meanX;
    const cy = points[i].y - meanY;
    const ptDistSq = cx * cx + cy * cy;
    sumTotalSq += ptDistSq;

    // Dot product = scalar projection
    const proj = cx * ux + cy * uy;
    sumProjSq += proj * proj;

    // Orthogonal distance squared: ||x||^2 - (x . u)^2
    const errorSq = Math.max(0, ptDistSq - proj * proj);
    sumErrorSq += errorSq;
  }

  const variance = sumProjSq / (n - 1);
  const ssd = sumErrorSq;
  const totalDistSq = sumTotalSq;

  return {
    variance,
    ssd,
    totalDistSq,
  };
}

/**
 * Jacobi eigenvalue algorithm for small real symmetric matrices (N x N).
 * Computes all eigenvalues and orthogonal eigenvectors.
 */
export function jacobiEigenvalues(
  matrix: number[][],
  maxIter = 100,
  tol = 1e-10
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = matrix.length;
  // Deep clone matrix A
  const A: number[][] = matrix.map(row => [...row]);
  // Initialize eigenvectors V as identity
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxOff = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const val = Math.abs(A[i][j]);
        if (val > maxOff) {
          maxOff = val;
          p = i;
          q = j;
        }
      }
    }

    if (maxOff < tol) break;

    const app = A[p][p];
    const aqq = A[q][q];
    const apq = A[p][q];

    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    // Apply Givens rotation to A
    for (let k = 0; k < n; k++) {
      if (k !== p && k !== q) {
        const akp = A[k][p];
        const akq = A[k][q];
        A[k][p] = c * akp - s * akq;
        A[p][k] = A[k][p];
        A[k][q] = s * akp + c * akq;
        A[q][k] = A[k][q];
      }
    }

    A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    A[p][q] = 0;
    A[q][p] = 0;

    // Accumulate eigenvectors in V
    for (let k = 0; k < n; k++) {
      const vkp = V[k][p];
      const vkq = V[k][q];
      V[k][p] = c * vkp - s * vkq;
      V[k][q] = s * vkp + c * vkq;
    }
  }

  // Extract eigenvalues and sort descending
  const indexed = Array.from({ length: n }, (_, i) => ({
    val: Math.max(0, A[i][i]),
    vector: V.map(row => row[i]),
  }));

  indexed.sort((a, b) => b.val - a.val);

  return {
    eigenvalues: indexed.map(item => item.val),
    eigenvectors: indexed.map(item => item.vector), // columns transposed as rows: [eigenvector0, eigenvector1, ...]
  };
}

/**
 * N-Dimensional PCA engine for multidimensional data.
 */
export function computePCA_ND(
  data: number[][],
  featureNames: string[]
): {
  means: number[];
  centeredData: number[][];
  covMatrix: number[][];
  eigenvalues: number[];
  eigenvectors: number[][];
  explainedVarianceRatio: number[];
  cumulativeVarianceRatio: number[];
  projected2D: { x: number; y: number; sampleIndex: number }[];
} {
  const n = data.length;
  const d = data[0].length;

  // 1. Column means
  const means = Array(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      means[j] += data[i][j];
    }
  }
  for (let j = 0; j < d; j++) {
    means[j] /= n;
  }

  // 2. Centered data
  const centeredData = data.map(row => row.map((val, j) => val - means[j]));

  // 3. Covariance matrix (d x d)
  const covMatrix = Array.from({ length: d }, () => Array(d).fill(0));
  for (let j1 = 0; j1 < d; j1++) {
    for (let j2 = 0; j2 < d; j2++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += centeredData[i][j1] * centeredData[i][j2];
      }
      covMatrix[j1][j2] = sum / (n - 1);
    }
  }

  // 4. Eigendecomposition
  const { eigenvalues, eigenvectors } = jacobiEigenvalues(covMatrix);

  // 5. Explained variance ratios
  const totalVariance = eigenvalues.reduce((acc, v) => acc + v, 0) || 1e-9;
  const explainedVarianceRatio = eigenvalues.map(v => v / totalVariance);

  let cum = 0;
  const cumulativeVarianceRatio = explainedVarianceRatio.map(v => {
    cum += v;
    return Math.min(1, cum);
  });

  // 6. Project each sample onto top 2 eigenvectors (PC1 & PC2)
  const ev1 = eigenvectors[0];
  const ev2 = eigenvectors[1] || Array(d).fill(0);

  const projected2D = centeredData.map((row, sampleIndex) => {
    let p1 = 0;
    let p2 = 0;
    for (let j = 0; j < d; j++) {
      p1 += row[j] * ev1[j];
      p2 += row[j] * ev2[j];
    }
    return { x: p1, y: p2, sampleIndex };
  });

  return {
    means,
    centeredData,
    covMatrix,
    eigenvalues,
    eigenvectors,
    explainedVarianceRatio,
    cumulativeVarianceRatio,
    projected2D,
  };
}

/**
 * Standard synthetic data generators for 2D.
 */
export function generate2DPreset(
  type: 'strong_corr' | 'moderate_corr' | 'two_clusters' | 'circular' | 'outlier',
  count = 45
): Point2D[] {
  const points: Point2D[] = [];

  if (type === 'strong_corr') {
    // High correlation along slope ~0.65
    for (let i = 0; i < count; i++) {
      const t = (Math.random() - 0.5) * 16;
      const noise = (Math.random() - 0.5) * 2.5;
      points.push({
        id: `pt-${i}`,
        x: Math.round((t + (Math.random() - 0.5) * 1.2) * 10) / 10,
        y: Math.round((0.65 * t + noise) * 10) / 10,
      });
    }
  } else if (type === 'moderate_corr') {
    for (let i = 0; i < count; i++) {
      const t = (Math.random() - 0.5) * 14;
      const noise = (Math.random() - 0.5) * 6;
      points.push({
        id: `pt-${i}`,
        x: Math.round((t + (Math.random() - 0.5) * 3) * 10) / 10,
        y: Math.round((0.45 * t + noise) * 10) / 10,
      });
    }
  } else if (type === 'two_clusters') {
    const half = Math.floor(count / 2);
    // Cluster A
    for (let i = 0; i < half; i++) {
      points.push({
        id: `pt-a-${i}`,
        x: Math.round((-4.5 + (Math.random() - 0.5) * 3.5) * 10) / 10,
        y: Math.round((-3 + (Math.random() - 0.5) * 3) * 10) / 10,
        group: 'Cluster A',
      });
    }
    // Cluster B
    for (let i = half; i < count; i++) {
      points.push({
        id: `pt-b-${i}`,
        x: Math.round((4.5 + (Math.random() - 0.5) * 3.5) * 10) / 10,
        y: Math.round((3 + (Math.random() - 0.5) * 3) * 10) / 10,
        group: 'Cluster B',
      });
    }
  } else if (type === 'circular') {
    // Isotropic spherical noise (equal variance in all directions)
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * 6.5;
      const th = Math.random() * 2 * Math.PI;
      points.push({
        id: `pt-${i}`,
        x: Math.round(r * Math.cos(th) * 10) / 10,
        y: Math.round(r * Math.sin(th) * 10) / 10,
      });
    }
  } else if (type === 'outlier') {
    for (let i = 0; i < count - 2; i++) {
      const t = (Math.random() - 0.5) * 12;
      const noise = (Math.random() - 0.5) * 2;
      points.push({
        id: `pt-${i}`,
        x: Math.round((t) * 10) / 10,
        y: Math.round((0.5 * t + noise) * 10) / 10,
      });
    }
    // Leverage points / outliers
    points.push({ id: `pt-outlier-1`, x: 7.5, y: -6.5, group: 'Outlier' });
    points.push({ id: `pt-outlier-2`, x: -7.5, y: 6.5, group: 'Outlier' });
  }

  return points;
}

/**
 * 3D synthetic datasets
 */
export function generate3DPreset(
  type: 'cigar' | 'disc' | 'three_clusters',
  count = 70
): Point3D[] {
  const points: Point3D[] = [];

  if (type === 'cigar') {
    // 1 dominant axis (high variance in PC1, small in PC2, tiny in PC3)
    for (let i = 0; i < count; i++) {
      const u = (Math.random() - 0.5) * 20;
      const v = (Math.random() - 0.5) * 4;
      const w = (Math.random() - 0.5) * 1.5;

      // Rotate in 3D
      const x = 0.7 * u - 0.4 * v + 0.2 * w;
      const y = 0.5 * u + 0.6 * v - 0.3 * w;
      const z = 0.4 * u - 0.2 * v + 0.8 * w;

      points.push({ id: `3d-${i}`, x, y, z });
    }
  } else if (type === 'disc') {
    // Flat 2D pancake tilted in 3D (high variance in PC1 & PC2, very small in PC3)
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(Math.random()) * 9;
      const th = Math.random() * 2 * Math.PI;
      const u = r * Math.cos(th);
      const v = r * Math.sin(th) * 0.6;
      const w = (Math.random() - 0.5) * 1.2; // noise off-plane

      // Tilt matrix
      const x = 0.8 * u + 0.2 * v + 0.1 * w;
      const y = -0.2 * u + 0.8 * v + 0.2 * w;
      const z = 0.4 * u + 0.5 * v + 0.7 * w;

      points.push({ id: `3d-${i}`, x, y, z });
    }
  } else if (type === 'three_clusters') {
    const perCluster = Math.floor(count / 3);
    const centers = [
      { x: -5, y: -4, z: 4, group: 'Species Alpha' },
      { x: 5, y: 4, z: -3, group: 'Species Beta' },
      { x: 0, y: 0, z: 6, group: 'Species Gamma' },
    ];

    centers.forEach((c, cIdx) => {
      for (let i = 0; i < perCluster; i++) {
        points.push({
          id: `3d-c${cIdx}-${i}`,
          x: c.x + (Math.random() - 0.5) * 3,
          y: c.y + (Math.random() - 0.5) * 3,
          z: c.z + (Math.random() - 0.5) * 3,
          group: c.group,
        });
      }
    });
  }

  return points;
}

/**
 * The celebrated Fisher's Iris Dataset (representative sampling of 60 points: 20 per species)
 * 4 features: Sepal Length, Sepal Width, Petal Length, Petal Width (in cm).
 */
export interface IrisSample {
  sepalLength: number;
  sepalWidth: number;
  petalLength: number;
  petalWidth: number;
  species: 'Setosa' | 'Versicolor' | 'Virginica';
}

export const IRIS_FEATURE_NAMES = [
  'Sepal Length (cm)',
  'Sepal Width (cm)',
  'Petal Length (cm)',
  'Petal Width (cm)',
];

export const IRIS_DATASET: IrisSample[] = [
  // Setosa (short petals, wide sepals)
  { sepalLength: 5.1, sepalWidth: 3.5, petalLength: 1.4, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 4.9, sepalWidth: 3.0, petalLength: 1.4, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 4.7, sepalWidth: 3.2, petalLength: 1.3, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 4.6, sepalWidth: 3.1, petalLength: 1.5, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 5.0, sepalWidth: 3.6, petalLength: 1.4, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 5.4, sepalWidth: 3.9, petalLength: 1.7, petalWidth: 0.4, species: 'Setosa' },
  { sepalLength: 4.6, sepalWidth: 3.4, petalLength: 1.4, petalWidth: 0.3, species: 'Setosa' },
  { sepalLength: 5.0, sepalWidth: 3.4, petalLength: 1.5, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 4.4, sepalWidth: 2.9, petalLength: 1.4, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 4.9, sepalWidth: 3.1, petalLength: 1.5, petalWidth: 0.1, species: 'Setosa' },
  { sepalLength: 5.4, sepalWidth: 3.7, petalLength: 1.5, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 4.8, sepalWidth: 3.4, petalLength: 1.6, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 4.8, sepalWidth: 3.0, petalLength: 1.4, petalWidth: 0.1, species: 'Setosa' },
  { sepalLength: 4.3, sepalWidth: 3.0, petalLength: 1.1, petalWidth: 0.1, species: 'Setosa' },
  { sepalLength: 5.8, sepalWidth: 4.0, petalLength: 1.2, petalWidth: 0.2, species: 'Setosa' },
  { sepalLength: 5.7, sepalWidth: 4.4, petalLength: 1.5, petalWidth: 0.4, species: 'Setosa' },
  { sepalLength: 5.4, sepalWidth: 3.9, petalLength: 1.3, petalWidth: 0.4, species: 'Setosa' },
  { sepalLength: 5.1, sepalWidth: 3.5, petalLength: 1.4, petalWidth: 0.3, species: 'Setosa' },
  { sepalLength: 5.7, sepalWidth: 3.8, petalLength: 1.7, petalWidth: 0.3, species: 'Setosa' },
  { sepalLength: 5.1, sepalWidth: 3.8, petalLength: 1.5, petalWidth: 0.3, species: 'Setosa' },

  // Versicolor (intermediate)
  { sepalLength: 7.0, sepalWidth: 3.2, petalLength: 4.7, petalWidth: 1.4, species: 'Versicolor' },
  { sepalLength: 6.4, sepalWidth: 3.2, petalLength: 4.5, petalWidth: 1.5, species: 'Versicolor' },
  { sepalLength: 6.9, sepalWidth: 3.1, petalLength: 4.9, petalWidth: 1.5, species: 'Versicolor' },
  { sepalLength: 5.5, sepalWidth: 2.3, petalLength: 4.0, petalWidth: 1.3, species: 'Versicolor' },
  { sepalLength: 6.5, sepalWidth: 2.8, petalLength: 4.6, petalWidth: 1.5, species: 'Versicolor' },
  { sepalLength: 5.7, sepalWidth: 2.8, petalLength: 4.5, petalWidth: 1.3, species: 'Versicolor' },
  { sepalLength: 6.3, sepalWidth: 3.3, petalLength: 4.7, petalWidth: 1.6, species: 'Versicolor' },
  { sepalLength: 4.9, sepalWidth: 2.4, petalLength: 3.3, petalWidth: 1.0, species: 'Versicolor' },
  { sepalLength: 6.6, sepalWidth: 2.9, petalLength: 4.6, petalWidth: 1.3, species: 'Versicolor' },
  { sepalLength: 5.2, sepalWidth: 2.7, petalLength: 3.9, petalWidth: 1.4, species: 'Versicolor' },
  { sepalLength: 5.0, sepalWidth: 2.0, petalLength: 3.5, petalWidth: 1.0, species: 'Versicolor' },
  { sepalLength: 5.9, sepalWidth: 3.0, petalLength: 4.2, petalWidth: 1.5, species: 'Versicolor' },
  { sepalLength: 6.0, sepalWidth: 2.2, petalLength: 4.0, petalWidth: 1.0, species: 'Versicolor' },
  { sepalLength: 6.1, sepalWidth: 2.9, petalLength: 4.7, petalWidth: 1.4, species: 'Versicolor' },
  { sepalLength: 5.6, sepalWidth: 2.9, petalLength: 3.6, petalWidth: 1.3, species: 'Versicolor' },
  { sepalLength: 6.7, sepalWidth: 3.1, petalLength: 4.4, petalWidth: 1.4, species: 'Versicolor' },
  { sepalLength: 5.6, sepalWidth: 3.0, petalLength: 4.5, petalWidth: 1.5, species: 'Versicolor' },
  { sepalLength: 5.8, sepalWidth: 2.7, petalLength: 4.1, petalWidth: 1.0, species: 'Versicolor' },
  { sepalLength: 6.2, sepalWidth: 2.2, petalLength: 4.5, petalWidth: 1.5, species: 'Versicolor' },
  { sepalLength: 5.6, sepalWidth: 2.5, petalLength: 3.9, petalWidth: 1.1, species: 'Versicolor' },

  // Virginica (large petals and sepals)
  { sepalLength: 6.3, sepalWidth: 3.3, petalLength: 6.0, petalWidth: 2.5, species: 'Virginica' },
  { sepalLength: 5.8, sepalWidth: 2.7, petalLength: 5.1, petalWidth: 1.9, species: 'Virginica' },
  { sepalLength: 7.1, sepalWidth: 3.0, petalLength: 5.9, petalWidth: 2.1, species: 'Virginica' },
  { sepalLength: 6.3, sepalWidth: 2.9, petalLength: 5.6, petalWidth: 1.8, species: 'Virginica' },
  { sepalLength: 6.5, sepalWidth: 3.0, petalLength: 5.8, petalWidth: 2.2, species: 'Virginica' },
  { sepalLength: 7.6, sepalWidth: 3.0, petalLength: 6.6, petalWidth: 2.1, species: 'Virginica' },
  { sepalLength: 4.9, sepalWidth: 2.5, petalLength: 4.5, petalWidth: 1.7, species: 'Virginica' },
  { sepalLength: 7.3, sepalWidth: 2.9, petalLength: 6.3, petalWidth: 1.8, species: 'Virginica' },
  { sepalLength: 6.7, sepalWidth: 2.5, petalLength: 5.8, petalWidth: 1.8, species: 'Virginica' },
  { sepalLength: 7.2, sepalWidth: 3.6, petalLength: 6.1, petalWidth: 2.5, species: 'Virginica' },
  { sepalLength: 6.5, sepalWidth: 3.2, petalLength: 5.1, petalWidth: 2.0, species: 'Virginica' },
  { sepalLength: 6.4, sepalWidth: 2.7, petalLength: 5.3, petalWidth: 1.9, species: 'Virginica' },
  { sepalLength: 6.8, sepalWidth: 3.0, petalLength: 5.5, petalWidth: 2.1, species: 'Virginica' },
  { sepalLength: 5.7, sepalWidth: 2.5, petalLength: 5.0, petalWidth: 2.0, species: 'Virginica' },
  { sepalLength: 5.8, sepalWidth: 2.8, petalLength: 5.1, petalWidth: 2.4, species: 'Virginica' },
  { sepalLength: 6.4, sepalWidth: 3.2, petalLength: 5.3, petalWidth: 2.3, species: 'Virginica' },
  { sepalLength: 6.5, sepalWidth: 3.0, petalLength: 5.5, petalWidth: 1.8, species: 'Virginica' },
  { sepalLength: 7.7, sepalWidth: 3.8, petalLength: 6.7, petalWidth: 2.2, species: 'Virginica' },
  { sepalLength: 7.7, sepalWidth: 2.6, petalLength: 6.9, petalWidth: 2.3, species: 'Virginica' },
  { sepalLength: 6.0, sepalWidth: 2.2, petalLength: 5.0, petalWidth: 1.5, species: 'Virginica' },
];
