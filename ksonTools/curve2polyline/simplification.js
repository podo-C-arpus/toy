/** Post-processing utilities for generated polyline vertices. */

export function roundValue(value, roundingDigits) {
  if (!Number.isFinite(value)) throw new TypeError('value must be finite.');
  if (!Number.isInteger(roundingDigits) || roundingDigits < 0) return value;

  const factor = 10 ** roundingDigits;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function pointsAreCollinear(previous, current, next, tolerance) {
  const firstProduct = (current.time - previous.time) * (next.value - current.value);
  const secondProduct = (current.value - previous.value) * (next.time - current.time);
  const scale = Math.max(1, Math.abs(firstProduct), Math.abs(secondProduct));
  return Math.abs(firstProduct - secondProduct) <= scale * tolerance;
}

/**
 * Removes redundant collinear vertices while retaining the first and last.
 * The input is not mutated.
 */
export function mergeCollinearVertices(vertices, { tolerance = 1e-12 } = {}) {
  if (!Array.isArray(vertices)) throw new TypeError('vertices must be an array.');
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError('tolerance must be a non-negative finite number.');
  }

  const merged = [];
  vertices.forEach((vertex, index) => {
    if (!vertex || !Number.isFinite(vertex.time) || !Number.isFinite(vertex.value)) {
      throw new TypeError('Every vertex must have finite time and value properties.');
    }

    merged.push({ vertex: { time: vertex.time, value: vertex.value }, index });
    while (merged.length >= 3) {
      const previous = merged.at(-3);
      const current = merged.at(-2);
      const next = merged.at(-1);
      const endpoint = current.index === 0 || current.index === vertices.length - 1;
      if (endpoint || !pointsAreCollinear(
        previous.vertex,
        current.vertex,
        next.vertex,
        tolerance,
      )) break;
      merged.splice(-2, 1);
    }
  });

  return merged.map(({ vertex }) => vertex);
}
