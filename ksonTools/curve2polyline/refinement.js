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

function scaleValue(vertex, angleScale) {
  const yPerValueUnit = angleScale?.yPerValueUnit;
  if (!Number.isFinite(yPerValueUnit) || yPerValueUnit <= 0) {
    throw new RangeError('angleScale.yPerValueUnit must be greater than zero.');
  }
  return { x: vertex.time, y: vertex.value * yPerValueUnit };
}

/** Returns the deviation from a straight line in radians (0 to PI). */
export function turningAngle(previous, current, next, angleScale) {
  const p0 = scaleValue(previous, angleScale);
  const p1 = scaleValue(current, angleScale);
  const p2 = scaleValue(next, angleScale);
  const ax = p1.x - p0.x;
  const ay = p1.y - p0.y;
  const bx = p2.x - p1.x;
  const by = p2.y - p1.y;
  const aLength = Math.hypot(ax, ay);
  const bLength = Math.hypot(bx, by);

  if (aLength <= EPSILON || bLength <= EPSILON) return null;
  return Math.atan2(Math.abs(ax * by - ay * bx), ax * bx + ay * by);
}

/**
 * Returns every eligible interval exactly once, alternating from both ends.
 * `side` identifies which inner vertex supplies the primary angle.
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

function angleAt(vertices, index, angleScale) {
  if (index <= 0 || index >= vertices.length - 1) return null;
  return turningAngle(
    vertices[index - 1],
    vertices[index],
    vertices[index + 1],
    angleScale,
  );
}

function candidateAngle(curve, interval, nextTimes, angleScale) {
  const times = [
    interval.start,
    ...nextTimes.filter((time) => time > interval.start && time < interval.end),
    interval.end,
  ];
  if (times.length < 3) return 0;

  const candidates = sampleCurveAtTimes(curve, times);
  let maximum = 0;
  for (let index = 1; index < candidates.length - 1; index += 1) {
    const angle = turningAngle(
      candidates[index - 1],
      candidates[index],
      candidates[index + 1],
      angleScale,
    );
    if (angle !== null) maximum = Math.max(maximum, angle);
  }
  return maximum;
}

function measureIntervalAngle(
  curve,
  vertices,
  entry,
  nextTimes,
  angleScale,
) {
  const interval = {
    start: vertices[entry.index].time,
    end: vertices[entry.index + 1].time,
  };

  if (entry.side === 'start') {
    const angle = angleAt(vertices, entry.index + 1, angleScale);
    return angle ?? candidateAngle(curve, interval, nextTimes, angleScale);
  }
  if (entry.side === 'end') {
    const angle = angleAt(vertices, entry.index, angleScale);
    return angle ?? candidateAngle(curve, interval, nextTimes, angleScale);
  }

  const leftAngle = angleAt(vertices, entry.index, angleScale);
  const rightAngle = angleAt(vertices, entry.index + 1, angleScale);
  const localAngle = candidateAngle(curve, interval, nextTimes, angleScale);
  return Math.max(leftAngle ?? 0, rightAngle ?? 0, localAngle);
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
    const shouldRefine = threshold <= 0 || measureIntervalAngle(
      curve,
      snapshot,
      entry,
      nextTimes,
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
