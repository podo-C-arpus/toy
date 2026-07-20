/**
 * Locations that can contain KSON graph curves (format_version: 1).
 *
 * This module intentionally describes only the KSON structure. Tool-specific
 * rendering scales, precision settings, and rounding rules belong to each
 * tool that consumes this dictionary.
 */

function target(definition) {
  return Object.freeze({
    ...definition,
    path: Object.freeze(definition.path),
  });
}

export const CURVE_TARGETS = Object.freeze([
  target({
    id: 'laser-left',
    label: 'Laser left',
    path: ['note', 'laser', 0, '*section', 1],
    shape: 'graph-section',
    lane: 0,
  }),
  target({
    id: 'laser-right',
    label: 'Laser right',
    path: ['note', 'laser', 1, '*section', 1],
    shape: 'graph-section',
    lane: 1,
  }),
  target({
    id: 'camera-tilt',
    label: 'Camera tilt',
    path: ['camera', 'tilt'],
    shape: 'tilt',
  }),
  ...[
    ['camera-top', 'zoom_top'],
    ['camera-bottom', 'zoom_bottom'],
    ['camera-side', 'zoom_side'],
    ['camera-rotation', 'rotation_deg'],
    ['camera-split', 'center_split'],
  ].map(([id, name]) => target({
    id,
    label: `Camera ${name}`,
    path: ['camera', 'cam', 'body', name],
    shape: 'graph',
  })),
  target({
    id: 'scroll-speed',
    label: 'Scroll speed',
    path: ['beat', 'scroll_speed'],
    shape: 'graph',
  }),
]);

export const CURVE_TARGET_BY_ID = Object.freeze(
  Object.fromEntries(CURVE_TARGETS.map((item) => [item.id, item])),
);
