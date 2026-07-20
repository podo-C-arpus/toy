/**
 * KSON curve creation and scaling utilities.
 *
 * KSM v2 uses a quadratic Bezier curve from (0, 0) through (a, b) to (1, 1).
 * The x component is inverted before evaluating the y component.
 */

const EPSILON = 1e-12;
export const STRAIGHT_CONTROL_TOLERANCE = 0.001;

function assertFinite(name, value) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number.`);
  }
}

function assertUnit(name, value) {
  assertFinite(name, value);
  if (value < 0 || value > 1) {
    throw new RangeError(`${name} must be between 0 and 1.`);
  }
}

function quadraticBezier(parameter, control) {
  const inverse = 1 - parameter;
  return 2 * inverse * parameter * control + parameter * parameter;
}

/**
 * Inverts the x component of a quadratic Bezier curve whose points are
 * (0, 0), (controlX, controlY), (1, 1).
 */
function parameterAtX(x, controlX) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const quadratic = 1 - 2 * controlX;
  const linear = 2 * controlX;

  if (Math.abs(quadratic) < EPSILON) {
    return x / linear;
  }

  const discriminant = linear * linear + 4 * quadratic * x;
  const denominator = linear + Math.sqrt(Math.max(0, discriminant));

  if (Math.abs(denominator) < EPSILON) {
    return Math.sqrt(x);
  }

  return (2 * x) / denominator;
}

/**
 * Creates a normalized curve from (0, 0) to (1, 1).
 */
export function createNormalizedCurve(a, b) {
  assertUnit('a', a);
  assertUnit('b', b);

  return Object.freeze({
    a,
    b,
    // Very small differences are intentionally treated as straight. Chart
    // authors use these values to retain KSM's curve-mode drawing behavior.
    isLinear: Math.abs(a - b) <= STRAIGHT_CONTROL_TOLERANCE + EPSILON,

    /** Returns the parametric point on the provisional Bezier curve. */
    pointAt(parameter) {
      assertUnit('parameter', parameter);
      return Object.freeze({
        time: quadraticBezier(parameter, a),
        value: quadraticBezier(parameter, b),
        parameter,
      });
    },

    /** Returns the normalized value at a normalized time coordinate. */
    valueAt(normalizedTime) {
      assertUnit('normalizedTime', normalizedTime);
      // A control point on the diagonal describes the exact line y = x.
      if (Math.abs(a - b) < EPSILON) return normalizedTime;
      const parameter = parameterAtX(normalizedTime, a);
      return quadraticBezier(parameter, b);
    },
  });
}

/**
 * Maps a normalized curve into a segment's time and value ranges.
 */
export function scaleCurve(
  normalizedCurve,
  { startTime, endTime, startValue, endValue },
) {
  if (!normalizedCurve || typeof normalizedCurve.valueAt !== 'function') {
    throw new TypeError('normalizedCurve must be created by createNormalizedCurve().');
  }

  assertFinite('startTime', startTime);
  assertFinite('endTime', endTime);
  assertFinite('startValue', startValue);
  assertFinite('endValue', endValue);

  if (endTime <= startTime) {
    throw new RangeError('endTime must be greater than startTime.');
  }

  const duration = endTime - startTime;
  const valueRange = endValue - startValue;

  return Object.freeze({
    startTime,
    endTime,
    startValue,
    endValue,
    normalizedCurve,
    isStraight: normalizedCurve.isLinear || startValue === endValue,

    pointAt(parameter) {
      const point = normalizedCurve.pointAt(parameter);
      return Object.freeze({
        time: startTime + point.time * duration,
        value: startValue + point.value * valueRange,
        parameter,
      });
    },

    valueAt(time) {
      assertFinite('time', time);
      if (time < startTime - EPSILON || time > endTime + EPSILON) {
        throw new RangeError('time must be inside the scaled segment.');
      }

      const normalizedTime = Math.min(1, Math.max(0, (time - startTime) / duration));
      return startValue + normalizedCurve.valueAt(normalizedTime) * valueRange;
    },
  });
}

export function createScaledCurve(a, b, segment) {
  return scaleCurve(createNormalizedCurve(a, b), segment);
}
