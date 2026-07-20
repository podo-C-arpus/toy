/**
 * KSON curve-bearing locations (format_version: 1).
 * `angleScale` converts one value unit into a pulse-equivalent visual length.
 * `roundingDigits` applies only to newly inserted polyline vertices.
 * A null scale means that suppression is not enabled until calibration.
 */

function target(definition) {
  return Object.freeze({
    ...definition,
    path: Object.freeze(definition.path),
    angleScale: definition.angleScale
      ? Object.freeze(definition.angleScale)
      : null,
  });
}

export const CURVE_TARGETS = Object.freeze([
  target({
    id: 'laser-left',
    label: 'Laser left',
    path: ['note', 'laser', 0, '*section', 1],
    shape: 'graph-section',
    lane: 0,
    angleScale: { yPerValueUnit: 800 },
    roundingDigits: 3,
  }),
  target({
    id: 'laser-right',
    label: 'Laser right',
    path: ['note', 'laser', 1, '*section', 1],
    shape: 'graph-section',
    lane: 1,
    angleScale: { yPerValueUnit: 800 },
    roundingDigits: 3,
  }),
  target({
    id: 'camera-tilt',
    label: 'Camera tilt',
    path: ['camera', 'tilt'],
    shape: 'tilt',
    angleScale: { yPerValueUnit: 200 },
    roundingDigits: 4,
  }),
  ...[
    ['camera-top', 'zoom_top', 2, 2],
    ['camera-bottom', 'zoom_bottom', 2, 2],
    ['camera-side', 'zoom_side', 2, 2],
    ['camera-rotation', 'rotation_deg', 8, 2],
    ['camera-split', 'center_split', 2, 2],
  ].map(([id, name, yPerValueUnit, roundingDigits]) => target({
    id,
    label: `Camera ${name}`,
    path: ['camera', 'cam', 'body', name],
    shape: 'graph',
    angleScale: { yPerValueUnit },
    roundingDigits,
  })),
  target({
    id: 'scroll-speed',
    label: 'Scroll speed',
    path: ['beat', 'scroll_speed'],
    shape: 'graph',
    angleScale: { yPerValueUnit: 800 },
    roundingDigits: 4,
  }),
]);

export const CURVE_TARGET_BY_ID = Object.freeze(
  Object.fromEntries(CURVE_TARGETS.map((item) => [item.id, item])),
);
