import { CURVE_TARGETS as BASE_CURVE_TARGETS } from '../utilities/curve-targets.js';

/**
 * Settings used only by curve2polyline.
 * `angleScale` converts one value unit into a pulse-equivalent visual length.
 * `roundingDigits` applies only to newly inserted polyline vertices.
 */

const TARGET_SETTINGS = Object.freeze({
  'laser-left': { yPerValueUnit: 800, roundingDigits: 3 },
  'laser-right': { yPerValueUnit: 800, roundingDigits: 3 },
  'camera-tilt': { yPerValueUnit: 200, roundingDigits: 4 },
  'camera-top': { yPerValueUnit: 2, roundingDigits: 2 },
  'camera-bottom': { yPerValueUnit: 2, roundingDigits: 2 },
  'camera-side': { yPerValueUnit: 2, roundingDigits: 2 },
  'camera-rotation': { yPerValueUnit: 8, roundingDigits: 2 },
  'camera-split': { yPerValueUnit: 2, roundingDigits: 2 },
  'scroll-speed': { yPerValueUnit: 800, roundingDigits: 4 },
});

function target(definition, settings) {
  return Object.freeze({
    ...definition,
    angleScale: settings
      ? Object.freeze({ yPerValueUnit: settings.yPerValueUnit })
      : null,
    roundingDigits: settings?.roundingDigits,
  });
}

export const CURVE_TARGETS = Object.freeze(
  BASE_CURVE_TARGETS.map((definition) => target(definition, TARGET_SETTINGS[definition.id])),
);

export const CURVE_TARGET_BY_ID = Object.freeze(
  Object.fromEntries(CURVE_TARGETS.map((item) => [item.id, item])),
);
