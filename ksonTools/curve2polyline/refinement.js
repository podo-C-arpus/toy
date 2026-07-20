import {
  REFINEMENT_INTERVALS,
  createSamplingTimes,
  intervalForPrecision,
  mergeVertices,
  sampleCurveAtTimes,
  sampleUniform,
} from './sampling.js';

const EPSILON = 1e-9;

function assertNonNegative(name, value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number.`);
  }
}

function scaleTangent(tangent, angleScale) {
  const yPerValueUnit = angleScale?.yPerValueUnit;
  if (!Number.isFinite(yPerValueUnit) || yPerValueUnit <= 0) {
    throw new RangeError('angleScale.yPerValueUnit must be greater than zero.');
  }
  return { x: tangent.time, y: tangent.value * yPerValueUnit };
}

/** Returns the angle between a curve's endpoint tangents in radians. */
export function tangentAngleDifference(curve, startTime, endTime, angleScale) {
  if (!curve || typeof curve.tangentAt !== 'function') {
    throw new TypeError('curve must provide tangentAt(time).');
  }
  const start = scaleTangent(curve.tangentAt(startTime), angleScale);
  const end = scaleTangent(curve.tangentAt(endTime), angleScale);
  const startLength = Math.hypot(start.x, start.y);
  const endLength = Math.hypot(end.x, end.y);

  if (startLength <= EPSILON || endLength <= EPSILON) return 0;
  return Math.atan2(
    Math.abs(start.x * end.y - start.y * end.x),
    start.x * end.x + start.y * end.y,
  );
}

/**
 * Returns every eligible interval exactly once, alternating from both ends.
 * `side` records the traversal origin; each angle decision is interval-local.
 */
export function createOutsideInIntervalOrder(vertices, currentInterval) {
  assertNonNegative('currentInterval', currentInterval);
  const eligible = [];
  for (let index = 0; index < vertices.length - 1; index += 1) {
    const length = vertices[index + 1].time - vertices[index].time;
    if (length > EPSILON && length <= currentInterval + EPSILON) eligible.push(index);
  }

  const result = [];
  let left = 0;
  let right = eligible.length - 1;
  while (left <= right) {
    if (left === right) {
      result.push({ index: eligible[left], side: 'center' });
      break;
    }
    result.push({ index: eligible[left], side: 'start' });
    result.push({ index: eligible[right], side: 'end' });
    left += 1;
    right -= 1;
  }
  return result;
}

/** Refines marked intervals only after every decision has been made. */
export function refineOnce(
  curve,
  vertices,
  {
    currentInterval,
    nextInterval,
    angleScale,
    threshold,
  },
) {
  assertNonNegative('currentInterval', currentInterval);
  assertNonNegative('nextInterval', nextInterval);
  assertNonNegative('threshold', threshold);
  if (nextInterval <= 0 || nextInterval >= currentInterval) {
    throw new RangeError('nextInterval must be greater than zero and smaller than currentInterval.');
  }
  if (curve.isStraight) return mergeVertices(vertices);

  const snapshot = mergeVertices(vertices);
  const nextTimes = createSamplingTimes(curve.startTime, curve.endTime, {
    interval: nextInterval,
  });
  const marked = [];

  for (const entry of createOutsideInIntervalOrder(snapshot, currentInterval)) {
    const interval = {
      start: snapshot[entry.index].time,
      end: snapshot[entry.index + 1].time,
    };
    const shouldRefine = threshold <= 0 || tangentAngleDifference(
      curve,
      interval.start,
      interval.end,
      angleScale,
    ) >= threshold;
    if (shouldRefine) marked.push(interval);
  }

  const insertionTimes = nextTimes.filter((time) => marked.some(
    (interval) => time > interval.start && time < interval.end,
  ));
  return mergeVertices(snapshot, sampleCurveAtTimes(curve, insertionTimes));
}

function transitionThreshold(splitMode, suppressionThreshold) {
  if (splitMode === 'force') return 0;
  if (splitMode !== 'suppress') {
    throw new RangeError('splitMode must be either "suppress" or "force".');
  }
  assertNonNegative('suppressionThreshold', suppressionThreshold);
  return suppressionThreshold;
}

/**
 * Samples through 1/4 -> 1/8 -> 1/16 -> 1/32 -> 1/64 -> 1/192.
 * The selected precision is the smallest interval the process may reach.
 * Straight segments always return endpoints only.
 */
export function sampleHierarchically(
  curve,
  {
    precision = 'standard',
    splitMode = 'suppress',
    angleScale,
    suppressionThreshold,
  } = {},
) {
  const targetInterval = intervalForPrecision(precision);

  if (curve.isStraight) {
    return sampleCurveAtTimes(curve, [curve.startTime, curve.endTime]);
  }

  let vertices = sampleUniform(curve, REFINEMENT_INTERVALS[0]);
  const threshold = transitionThreshold(splitMode, suppressionThreshold);

  for (let index = 0; index < REFINEMENT_INTERVALS.length - 1; index += 1) {
    const currentInterval = REFINEMENT_INTERVALS[index];
    const nextInterval = REFINEMENT_INTERVALS[index + 1];
    if (nextInterval < targetInterval - EPSILON) break;

    vertices = refineOnce(curve, vertices, {
      currentInterval,
      nextInterval,
      angleScale,
      threshold,
    });
  }
  return vertices;
}
