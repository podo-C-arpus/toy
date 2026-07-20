export const PULSES_PER_QUARTER_NOTE = 240;
export const DEFAULT_TIME_SIGNATURE = Object.freeze([4, 4]);

function assertMeasureIndex(measureIndex) {
  if (!Number.isInteger(measureIndex) || measureIndex < 0) {
    throw new RangeError('measureIndex must be a non-negative integer.');
  }
}

function assertMeasureNumber(measureNumber, name) {
  if (!Number.isInteger(measureNumber) || measureNumber < 1) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
}

function readTimeSignatureEvent(event, previousMeasureIndex) {
  if (!Array.isArray(event) || event.length !== 2) {
    throw new TypeError('Each time signature event must be [measureIndex, [numerator, denominator]].');
  }

  const [measureIndex, signature] = event;
  assertMeasureIndex(measureIndex);
  if (measureIndex <= previousMeasureIndex) {
    throw new RangeError('Time signature events must be ordered by a unique measure index.');
  }
  if (!Array.isArray(signature) || signature.length !== 2) {
    throw new TypeError('Each time signature must be [numerator, denominator].');
  }

  const [numerator, denominator] = signature;
  if (!Number.isInteger(numerator) || numerator < 1
      || !Number.isInteger(denominator) || denominator < 1) {
    throw new RangeError('Time signature values must be positive integers.');
  }

  return { measureIndex, numerator, denominator };
}

/** Returns validated time-signature changes, including the implicit 4/4 default. */
export function normalizeTimeSignatures(timeSignatureEvents) {
  if (timeSignatureEvents === undefined) {
    return [{ measureIndex: 0, numerator: 4, denominator: 4 }];
  }
  if (!Array.isArray(timeSignatureEvents)) {
    throw new TypeError('timeSignatureEvents must be an array.');
  }

  const changes = [];
  let previousMeasureIndex = -1;
  for (const event of timeSignatureEvents) {
    const change = readTimeSignatureEvent(event, previousMeasureIndex);
    changes.push(change);
    previousMeasureIndex = change.measureIndex;
  }

  if (changes.length === 0 || changes[0].measureIndex !== 0) {
    changes.unshift({ measureIndex: 0, numerator: 4, denominator: 4 });
  }
  return changes;
}

/** Converts one measure's time signature to its duration in KSON pulses (Y). */
export function timeSignatureLengthInY(numerator, denominator) {
  if (!Number.isInteger(numerator) || numerator < 1
      || !Number.isInteger(denominator) || denominator < 1) {
    throw new RangeError('Time signature values must be positive integers.');
  }
  return PULSES_PER_QUARTER_NOTE * 4 * numerator / denominator;
}

/** Converts a zero-based measure boundary index to its absolute KSON Y. */
export function measureIndexToY(measureIndex, timeSignatureEvents) {
  assertMeasureIndex(measureIndex);
  const changes = normalizeTimeSignatures(timeSignatureEvents);
  let y = 0;
  let currentMeasureIndex = 0;
  let currentSignature = changes[0];

  for (const nextSignature of changes.slice(1)) {
    if (nextSignature.measureIndex > measureIndex) break;
    y += (nextSignature.measureIndex - currentMeasureIndex)
      * timeSignatureLengthInY(currentSignature.numerator, currentSignature.denominator);
    currentMeasureIndex = nextSignature.measureIndex;
    currentSignature = nextSignature;
  }

  return y + (measureIndex - currentMeasureIndex)
    * timeSignatureLengthInY(currentSignature.numerator, currentSignature.denominator);
}

/** Converts a one-based measure number to the Y at the start of that measure. */
export function measureNumberToY(measureNumber, timeSignatureEvents) {
  assertMeasureNumber(measureNumber, 'measureNumber');
  return measureIndexToY(measureNumber - 1, timeSignatureEvents);
}

/** Converts an inclusive, one-based measure range to a half-open Y range. */
export function measureRangeToY(startMeasure, endMeasure, timeSignatureEvents) {
  assertMeasureNumber(startMeasure, 'startMeasure');
  assertMeasureNumber(endMeasure, 'endMeasure');
  if (endMeasure < startMeasure) {
    throw new RangeError('endMeasure must be greater than or equal to startMeasure.');
  }

  return {
    start: measureNumberToY(startMeasure, timeSignatureEvents),
    endExclusive: measureNumberToY(endMeasure + 1, timeSignatureEvents),
  };
}
