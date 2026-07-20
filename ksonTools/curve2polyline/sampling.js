/** Fixed-grid sampling primitives. Adaptive refinement lives in refinement.js. */

export const PULSES_PER_BEAT = 240;
export const PULSES_PER_WHOLE_NOTE = PULSES_PER_BEAT * 4;

export const PRECISION_INTERVALS = Object.freeze({
  simple: PULSES_PER_WHOLE_NOTE / 16,
  standard: PULSES_PER_WHOLE_NOTE / 64,
  detailed: PULSES_PER_WHOLE_NOTE / 192,
});

/** Coarse-to-fine intervals used by suppressed and forced refinement. */
export const REFINEMENT_INTERVALS = Object.freeze([
  PULSES_PER_WHOLE_NOTE / 4,
  PULSES_PER_WHOLE_NOTE / 8,
  PULSES_PER_WHOLE_NOTE / 16,
  PULSES_PER_WHOLE_NOTE / 32,
  PULSES_PER_WHOLE_NOTE / 64,
  PULSES_PER_WHOLE_NOTE / 192,
]);

export const STANDARD_INTERVAL_PULSES = PRECISION_INTERVALS.standard;

const EPSILON = 1e-9;

function assertFinite(name, value) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
}

export function intervalForPrecision(precision) {
  const interval = PRECISION_INTERVALS[precision];
  if (interval === undefined) {
    throw new RangeError(`Unknown precision: ${precision}`);
  }
  return interval;
}

/** Converts a note denominator such as 64 into a pulse interval. */
export function noteDenominatorToPulses(
  denominator,
  pulsesPerBeat = PULSES_PER_BEAT,
) {
  assertFinite('denominator', denominator);
  assertFinite('pulsesPerBeat', pulsesPerBeat);
  if (denominator <= 0 || pulsesPerBeat <= 0) {
    throw new RangeError('denominator and pulsesPerBeat must be greater than zero.');
  }
  return (pulsesPerBeat * 4) / denominator;
}

/**
 * Builds sampling times. KSM-compatible sampling uses segment alignment.
 * Chart alignment remains available as an explicit non-KSM extension.
 */
export function createSamplingTimes(
  startTime,
  endTime,
  {
    interval = STANDARD_INTERVAL_PULSES,
    alignment = 'segment',
    origin = 0,
  } = {},
) {
  assertFinite('startTime', startTime);
  assertFinite('endTime', endTime);
  assertFinite('interval', interval);
  assertFinite('origin', origin);

  if (endTime <= startTime) {
    throw new RangeError('endTime must be greater than startTime.');
  }
  if (interval <= 0) {
    throw new RangeError('interval must be greater than zero.');
  }
  if (alignment !== 'segment' && alignment !== 'chart') {
    throw new RangeError('alignment must be either "segment" or "chart".');
  }

  const times = [startTime];
  let nextTime;

  if (alignment === 'segment') {
    nextTime = startTime + interval;
  } else {
    const gridIndex = Math.floor((startTime - origin) / interval) + 1;
    nextTime = origin + gridIndex * interval;
  }

  while (nextTime < endTime - EPSILON) {
    times.push(nextTime);
    nextTime += interval;
  }

  times.push(endTime);
  return times;
}

export function sampleCurveAtTimes(scaledCurve, times) {
  if (!scaledCurve || typeof scaledCurve.valueAt !== 'function') {
    throw new TypeError('scaledCurve must provide valueAt(time).');
  }
  if (!Array.isArray(times)) {
    throw new TypeError('times must be an array.');
  }

  return times.map((time) => Object.freeze({
    time,
    value: scaledCurve.valueAt(time),
  }));
}

export function sampleUniform(scaledCurve, interval) {
  return sampleCurveAtTimes(
    scaledCurve,
    createSamplingTimes(scaledCurve.startTime, scaledCurve.endTime, { interval }),
  );
}

/** Backward-compatible fixed sampler. */
export function sampleCurve(scaledCurve, options = {}) {
  return sampleCurveAtTimes(
    scaledCurve,
    createSamplingTimes(scaledCurve.startTime, scaledCurve.endTime, options),
  );
}

export function mergeVertices(...groups) {
  const byTime = new Map();
  for (const vertex of groups.flat()) {
    if (!vertex || !Number.isFinite(vertex.time) || !Number.isFinite(vertex.value)) {
      throw new TypeError('Every vertex must have finite time and value properties.');
    }
    byTime.set(vertex.time, Object.freeze({ time: vertex.time, value: vertex.value }));
  }
  return [...byTime.values()].sort((left, right) => left.time - right.time);
}
