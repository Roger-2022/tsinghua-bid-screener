
import { QuestionTemplate, ObjectiveResponse, DimensionConfidence, AdaptiveQuestionStateSerialized, QuestionCountConfig, DEFAULT_QUESTION_COUNT_CONFIG } from '../types';

// ========== Constants (non-configurable) ==========
const INITIAL_PER_DIM = 2;
const CONFIDENCE_HIGH = 0.75;
const CONFIDENCE_LOW = 0.45;

// ========== Confidence Calculation ==========
const calculateConfidence = (scores: number[], answeredCount: number): number => {
  if (answeredCount === 0) return 0;
  const countFactor = Math.min(answeredCount / 4, 1);
  const variance = scores.length >= 2
    ? scores.reduce((sum, s) => sum + Math.pow(s - (scores.reduce((a, b) => a + b, 0) / scores.length), 2), 0) / scores.length
    : 0;
  const varianceFactor = 1 - Math.min(variance / 10, 1);
  const baselineFactor = answeredCount >= 2 ? 1 : 0;
  return countFactor * 0.5 + varianceFactor * 0.3 + baselineFactor * 0.2;
};

const calculateTrend = (scores: number[]): 'stable' | 'rising' | 'falling' => {
  if (scores.length < 2) return 'stable';
  const recent = scores.slice(-2);
  const diff = recent[1] - recent[0];
  if (Math.abs(diff) <= 1) return 'stable';
  return diff > 0 ? 'rising' : 'falling';
};

// ========== Initialization ==========
export const initAdaptiveState = (
  allQuestions: QuestionTemplate[],
  dimensions: string[],
  config: QuestionCountConfig = DEFAULT_QUESTION_COUNT_CONFIG
): AdaptiveQuestionStateSerialized => {
  const questionPool: Record<string, QuestionTemplate[]> = {};
  const dimensionConfidences: DimensionConfidence[] = [];

  dimensions.forEach(dim => {
    const dimQuestions = allQuestions
      .filter(q => q.dimension === dim && q.type === 'objective')
      .sort(() => 0.5 - Math.random()); // Shuffle
    questionPool[dim] = dimQuestions;
    dimensionConfidences.push({
      dimension: dim,
      answeredCount: 0,
      scores: [],
      mean: 0,
      variance: 0,
      confidence: 0,
      trend: 'stable',
    });
  });

  return {
    dimensionConfidences,
    questionPool,
    answeredQuestionIds: [],
    totalAsked: 0,
    totalTarget: dimensions.length * INITIAL_PER_DIM, // Start with 10 (5 dims * 2)
    skippedDimensions: [],
  };
};

// ========== Get Next Question ==========
export const getNextQuestion = (
  state: AdaptiveQuestionStateSerialized,
  config: QuestionCountConfig = DEFAULT_QUESTION_COUNT_CONFIG
): QuestionTemplate | null => {
  // Priority: dimensions with lowest confidence and available questions
  const candidates = state.dimensionConfidences
    .filter(dc => {
      // Skip if dimension is done
      if (state.skippedDimensions.includes(dc.dimension)) return false;
      // Skip if no remaining questions
      const pool = state.questionPool[dc.dimension] || [];
      const remaining = pool.filter(q => !state.answeredQuestionIds.includes(q.id));
      if (remaining.length === 0) return false;
      // Skip if already reached max
      if (dc.answeredCount >= config.maxPerDim) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by: 1) below minimum first, 2) lowest confidence
      const aMinMet = a.answeredCount >= config.minPerDim;
      const bMinMet = b.answeredCount >= config.minPerDim;
      if (!aMinMet && bMinMet) return -1;
      if (aMinMet && !bMinMet) return 1;
      return a.confidence - b.confidence;
    });

  if (candidates.length === 0) return null;

  const targetDim = candidates[0].dimension;
  const pool = state.questionPool[targetDim] || [];
  const remaining = pool.filter(q => !state.answeredQuestionIds.includes(q.id));

  return remaining.length > 0 ? remaining[0] : null;
};

// ========== Update After Answer ==========
export const updateConfidence = (
  state: AdaptiveQuestionStateSerialized,
  response: ObjectiveResponse,
  config: QuestionCountConfig = DEFAULT_QUESTION_COUNT_CONFIG
): AdaptiveQuestionStateSerialized => {
  const newState = { ...state };
  // Defensive: prevent duplicate question IDs
  newState.answeredQuestionIds = state.answeredQuestionIds.includes(response.q_id)
    ? [...state.answeredQuestionIds]
    : [...state.answeredQuestionIds, response.q_id];
  newState.totalAsked = state.totalAsked + 1;

  // Update dimension confidence
  newState.dimensionConfidences = state.dimensionConfidences.map(dc => {
    if (dc.dimension !== response.dimension) return dc;
    const newScores = [...dc.scores, response.score];
    const newCount = dc.answeredCount + 1;
    const mean = newScores.reduce((a, b) => a + b, 0) / newScores.length;
    const variance = newScores.length >= 2
      ? newScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / newScores.length
      : 0;
    const confidence = calculateConfidence(newScores, newCount);
    const trend = calculateTrend(newScores);
    return { ...dc, answeredCount: newCount, scores: newScores, mean, variance, confidence, trend };
  });

  // Auto-skip high-confidence dimensions
  newState.skippedDimensions = [...state.skippedDimensions];
  newState.dimensionConfidences.forEach(dc => {
    if (
      dc.confidence >= CONFIDENCE_HIGH &&
      dc.answeredCount >= INITIAL_PER_DIM &&
      !newState.skippedDimensions.includes(dc.dimension)
    ) {
      newState.skippedDimensions.push(dc.dimension);
    }
  });

  // Recalculate target total
  let target = 0;
  newState.dimensionConfidences.forEach(dc => {
    if (newState.skippedDimensions.includes(dc.dimension)) {
      target += dc.answeredCount; // Already done
    } else if (dc.confidence < CONFIDENCE_LOW && dc.answeredCount < config.maxPerDim) {
      target += Math.min(dc.answeredCount + 2, config.maxPerDim); // Need more
    } else {
      target += Math.max(dc.answeredCount + 1, INITIAL_PER_DIM); // At least initial
    }
  });
  newState.totalTarget = Math.max(config.totalMin, Math.min(config.totalMax, target));

  return newState;
};

// ========== Should Continue ==========
export const shouldContinue = (
  state: AdaptiveQuestionStateSerialized,
  config: QuestionCountConfig = DEFAULT_QUESTION_COUNT_CONFIG
): boolean => {
  // Must meet minimum per dimension
  const allMinMet = state.dimensionConfidences.every(dc => dc.answeredCount >= config.minPerDim);
  if (!allMinMet) return true;

  // Stop if reached max
  if (state.totalAsked >= config.totalMax) return false;

  // Stop if all dimensions high-confidence or skipped or no questions left
  const allDone = state.dimensionConfidences.every(dc => {
    if (state.skippedDimensions.includes(dc.dimension)) return true;
    if (dc.confidence >= CONFIDENCE_HIGH) return true;
    if (dc.answeredCount >= config.maxPerDim) return true;
    const pool = state.questionPool[dc.dimension] || [];
    const remaining = pool.filter(q => !state.answeredQuestionIds.includes(q.id));
    return remaining.length === 0;
  });
  if (allDone) return false;

  // Check if next question exists
  return getNextQuestion(state, config) !== null;
};

// ========== Summary for final record ==========
export const getDimensionSummary = (state: AdaptiveQuestionStateSerialized) => ({
  totalQuestionsAsked: state.totalAsked,
  confidenceAtCompletion: state.dimensionConfidences,
  skippedDimensions: state.skippedDimensions,
});
