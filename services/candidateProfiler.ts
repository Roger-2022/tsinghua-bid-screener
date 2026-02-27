
import { ObjectiveResponse, LiveCandidateProfile, DimensionConfidence } from '../types';

// ========== Create Initial Profile ==========
export const createInitialProfile = (): LiveCandidateProfile => ({
  responsePatterns: {
    avgResponseScore: 0,
    dimensionMeans: {},
    consistencyScore: 1,
    engagementLevel: 'medium',
  },
  probingBias: {
    shouldProbeMore: [],
    canSkipProbing: [],
  },
});

// ========== Update Profile After Each Answer ==========
export const updateLiveProfile = (
  profile: LiveCandidateProfile,
  allResponses: ObjectiveResponse[]
): LiveCandidateProfile => {
  if (allResponses.length === 0) return profile;

  // Compute dimension means
  const dimScores: Record<string, number[]> = {};
  allResponses.forEach(r => {
    if (!dimScores[r.dimension]) dimScores[r.dimension] = [];
    dimScores[r.dimension].push(r.score);
  });

  const dimensionMeans: Record<string, number> = {};
  Object.entries(dimScores).forEach(([dim, scores]) => {
    dimensionMeans[dim] = scores.reduce((a, b) => a + b, 0) / scores.length;
  });

  // Overall average
  const allScores = allResponses.map(r => r.score);
  const avgResponseScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  // Consistency: inverse of average within-dimension variance, normalized to 0-1
  const variances: number[] = [];
  Object.values(dimScores).forEach(scores => {
    if (scores.length >= 2) {
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
      variances.push(variance);
    }
  });
  const avgVariance = variances.length > 0 ? variances.reduce((a, b) => a + b, 0) / variances.length : 0;
  const consistencyScore = Math.max(0, Math.min(1, 1 - avgVariance / 15));

  // Engagement: based on probing answer length + option diversity
  const probingResponses = allResponses.filter(r => r.probingAnswers);
  const avgProbingLength = probingResponses.length > 0
    ? probingResponses.reduce((sum, r) => {
        const pa = r.probingAnswers!;
        return sum + pa.cost.length + pa.assumption.length + pa.evidence.length;
      }, 0) / probingResponses.length
    : 0;
  const uniqueLabels = new Set(allResponses.map(r => r.label));
  const diversityRatio = uniqueLabels.size / Math.min(allResponses.length, 5);
  const engagementLevel: 'high' | 'medium' | 'low' =
    avgProbingLength > 100 && diversityRatio > 0.5 ? 'high'
    : avgProbingLength < 30 && diversityRatio < 0.3 ? 'low'
    : 'medium';

  return {
    responsePatterns: {
      avgResponseScore,
      dimensionMeans,
      consistencyScore,
      engagementLevel,
    },
    probingBias: profile.probingBias, // Will be updated by calculateProbingBias
  };
};

// ========== Calculate Probing Bias ==========
export const calculateProbingBias = (
  profile: LiveCandidateProfile,
  dimensionConfidences: DimensionConfidence[]
): LiveCandidateProfile => {
  const shouldProbeMore: string[] = [];
  const canSkipProbing: string[] = [];

  dimensionConfidences.forEach(dc => {
    const dimMean = profile.responsePatterns.dimensionMeans[dc.dimension];
    if (dimMean === undefined) return;

    // High variance + low confidence → need more probing
    if (dc.variance > 4 && dc.confidence < 0.6) {
      shouldProbeMore.push(dc.dimension);
    }
    // Low variance + high confidence → can skip probing
    else if (dc.variance < 2 && dc.confidence > 0.65) {
      canSkipProbing.push(dc.dimension);
    }
  });

  return {
    ...profile,
    probingBias: { shouldProbeMore, canSkipProbing },
  };
};
