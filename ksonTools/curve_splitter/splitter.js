import { CURVE_TARGETS } from '../utilities/curve-targets.js';

function isCurve(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every((item) => Number.isFinite(item) && item >= 0 && item <= 1);
}

function outgoingValue(value) {
  return Array.isArray(value) ? value[1] : value;
}

function incomingValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSplitYs(splitYs) {
  if (!Array.isArray(splitYs)) {
    throw new TypeError('splitYs must be an array.');
  }

  for (const y of splitYs) {
    if (!Number.isInteger(y) || y < 0) {
      throw new RangeError('Split positions must be non-negative integer Y values.');
    }
  }

  return [...new Set(splitYs)].sort((left, right) => left - right);
}

function positionsInside(splitYs, startY, endY) {
  return splitYs.filter((y) => y > startY && y < endY);
}

function interpolate(startValue, endValue, ratio) {
  return startValue + (endValue - startValue) * ratio;
}

/**
 * Splits curved GraphPoint segments using straight interpolation.
 * `timeOffset` maps relative graph-section Y values to absolute chart Y.
 */
export function splitGraphLinearly(points, splitYs, { timeOffset = 0 } = {}) {
  if (!Array.isArray(points)) {
    return { points, splitSegments: 0, addedPoints: 0 };
  }

  const positions = normalizeSplitYs(splitYs);
  const result = [];
  let splitSegments = 0;
  let addedPoints = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[index + 1];

    if (!Array.isArray(current) || !Array.isArray(next) || !isCurve(current[2])) {
      result.push(structuredClone(current));
      continue;
    }

    const startY = current[0] + timeOffset;
    const endY = next[0] + timeOffset;
    const startValue = outgoingValue(current[1]);
    const endValue = incomingValue(next[1]);
    const segmentPositions = positionsInside(positions, startY, endY);

    if (!Number.isFinite(startY)
      || !Number.isFinite(endY)
      || endY <= startY
      || !Number.isFinite(startValue)
      || !Number.isFinite(endValue)
      || segmentPositions.length === 0) {
      result.push(structuredClone(current));
      continue;
    }

    // Removing the third element makes the first piece use KSON's default
    // straight interpolation. Every inserted point also starts a straight piece.
    result.push(structuredClone(current.slice(0, 2)));
    for (const absoluteY of segmentPositions) {
      const ratio = (absoluteY - startY) / (endY - startY);
      result.push([
        absoluteY - timeOffset,
        interpolate(startValue, endValue, ratio),
      ]);
      addedPoints += 1;
    }
    splitSegments += 1;
  }

  return { points: result, splitSegments, addedPoints };
}

function readTiltCurve(value) {
  if (!Array.isArray(value) || !isCurve(value[1])) return null;
  const baseValue = value[0];
  const outgoing = outgoingValue(baseValue);
  return Number.isFinite(outgoing) ? { baseValue, outgoing } : null;
}

function readTiltIncoming(value) {
  if (Array.isArray(value) && isCurve(value[1])) return incomingValue(value[0]);
  return incomingValue(value);
}

/** Splits the special curve representation used by camera.tilt. */
export function splitTiltLinearly(points, splitYs) {
  if (!Array.isArray(points)) {
    return { points, splitSegments: 0, addedPoints: 0 };
  }

  const positions = normalizeSplitYs(splitYs);
  const result = [];
  let splitSegments = 0;
  let addedPoints = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const curved = Array.isArray(current) ? readTiltCurve(current[1]) : null;

    if (!curved || !Array.isArray(next)) {
      result.push(structuredClone(current));
      continue;
    }

    const startY = current[0];
    const endY = next[0];
    const endValue = readTiltIncoming(next[1]);
    const segmentPositions = positionsInside(positions, startY, endY);

    if (!Number.isFinite(startY)
      || !Number.isFinite(endY)
      || endY <= startY
      || !Number.isFinite(endValue)
      || segmentPositions.length === 0) {
      result.push(structuredClone(current));
      continue;
    }

    result.push([startY, structuredClone(curved.baseValue)]);
    for (const y of segmentPositions) {
      const ratio = (y - startY) / (endY - startY);
      result.push([y, interpolate(curved.outgoing, endValue, ratio)]);
      addedPoints += 1;
    }
    splitSegments += 1;
  }

  return { points: result, splitSegments, addedPoints };
}

function getAtPath(root, path) {
  return path.reduce((value, key) => value?.[key], root);
}

function setAtPath(root, path, value) {
  let parent = root;
  for (const key of path.slice(0, -1)) parent = parent?.[key];
  if (parent) parent[path.at(-1)] = value;
}

/**
 * Returns an edited clone by default. Selected curve segments are replaced by
 * straight pieces at every requested Y position.
 */
export function splitKsonCurvesLinearly(kson, options = {}) {
  if (!kson || typeof kson !== 'object' || Array.isArray(kson)) {
    throw new TypeError('kson must be an object.');
  }

  const splitYs = normalizeSplitYs(options.splitYs ?? []);
  const output = options.mutate ? kson : structuredClone(kson);
  const selectedIds = options.targetIds ? new Set(options.targetIds) : null;
  const report = { splitSegments: 0, addedPoints: 0, targets: {} };

  const record = (id, result) => {
    report.splitSegments += result.splitSegments;
    report.addedPoints += result.addedPoints;
    report.targets[id] = {
      splitSegments: result.splitSegments,
      addedPoints: result.addedPoints,
    };
  };

  for (const target of CURVE_TARGETS) {
    if (selectedIds && !selectedIds.has(target.id)) continue;

    if (target.shape === 'graph') {
      const points = getAtPath(output, target.path);
      if (!Array.isArray(points)) continue;
      const result = splitGraphLinearly(points, splitYs);
      setAtPath(output, target.path, result.points);
      record(target.id, result);
    } else if (target.shape === 'tilt') {
      const points = getAtPath(output, target.path);
      if (!Array.isArray(points)) continue;
      const result = splitTiltLinearly(points, splitYs);
      setAtPath(output, target.path, result.points);
      record(target.id, result);
    } else if (target.shape === 'graph-section') {
      const lane = output.note?.laser?.[target.lane];
      if (!Array.isArray(lane)) continue;
      const aggregate = { splitSegments: 0, addedPoints: 0 };

      for (const section of lane) {
        if (!Array.isArray(section) || !Array.isArray(section[1])) continue;
        const timeOffset = Number.isFinite(section[0]) ? section[0] : 0;
        const result = splitGraphLinearly(section[1], splitYs, { timeOffset });
        section[1] = result.points;
        aggregate.splitSegments += result.splitSegments;
        aggregate.addedPoints += result.addedPoints;
      }
      record(target.id, aggregate);
    }
  }

  return { kson: output, report };
}
