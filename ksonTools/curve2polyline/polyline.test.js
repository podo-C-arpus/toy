import test from 'node:test';
import assert from 'node:assert/strict';
import { createNormalizedCurve, createScaledCurve } from '../utilities/kson-curve.js';
import {
  PRECISION_INTERVALS,
  REFINEMENT_INTERVALS,
  createSamplingTimes,
  sampleCurve,
  sampleUniform,
} from './sampling.js';
import {
  createOutsideInIntervalOrder,
  sampleHierarchically,
  turningAngle,
} from './refinement.js';
import { CURVE_TARGET_BY_ID } from './dictionary.js';
import { mergeCollinearVertices, roundValue } from './simplification.js';
import {
  measureIndexToY,
  measureNumberToY,
  measureRangeToY,
  timeSignatureLengthInY,
} from '../utilities/measure.js';
import {
  SUPPRESSION_THRESHOLDS_DEGREES,
  bakeGraph,
  convertKsonCurves,
} from './script.js';

test('KSM default curve is linear', () => {
  const curve = createNormalizedCurve(0, 0);
  assert.equal(curve.valueAt(0.25), 0.25);
  assert.equal(curve.valueAt(0.75), 0.75);
});

test('time signatures convert measure boundaries to absolute KSON Y', () => {
  const timeSignatures = [
    [0, [4, 4]],
    [1, [1, 4]],
    [3, [33, 192]],
    [4, [4, 4]],
  ];

  assert.equal(timeSignatureLengthInY(33, 192), 165);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((index) => measureIndexToY(index, timeSignatures)),
    [0, 960, 1200, 1440, 1605, 2565],
  );
  assert.equal(measureNumberToY(4, timeSignatures), 1440);
  assert.deepEqual(measureRangeToY(2, 4, timeSignatures), {
    start: 960,
    endExclusive: 1605,
  });
});

test('missing time signatures use the KSON 4/4 default', () => {
  assert.equal(measureIndexToY(3), 2880);
  assert.deepEqual(measureRangeToY(2, 3), {
    start: 960,
    endExclusive: 2880,
  });
});

test('near-diagonal controls and equal endpoint values are straight', () => {
  const nearDiagonal = createScaledCurve(0.4, 0.401, {
    startTime: 0,
    endTime: 120,
    startValue: 0,
    endValue: 1,
  });
  const outsideTolerance = createScaledCurve(0.4, 0.4011, {
    startTime: 0,
    endTime: 120,
    startValue: 0,
    endValue: 1,
  });
  const constant = createScaledCurve(0, 1, {
    startTime: 0,
    endTime: 120,
    startValue: 2,
    endValue: 2,
  });

  assert.equal(nearDiagonal.isStraight, true);
  assert.equal(outsideTolerance.isStraight, false);
  assert.equal(constant.isStraight, true);
});

test('precision caps and refinement hierarchy use the agreed pulse intervals', () => {
  assert.deepEqual(PRECISION_INTERVALS, {
    simple: 60,
    standard: 15,
    detailed: 5,
  });
  assert.deepEqual(REFINEMENT_INTERVALS, [240, 120, 60, 30, 15, 5]);
});

test('curve scales in time and descending value', () => {
  const curve = createScaledCurve(0, 0, {
    startTime: 10,
    endTime: 30,
    startValue: 4,
    endValue: -2,
  });
  assert.equal(curve.valueAt(20), 1);
});

test('sampling always includes both endpoints', () => {
  assert.deepEqual(createSamplingTimes(0, 40, { interval: 15 }), [0, 15, 30, 40]);
  assert.deepEqual(createSamplingTimes(0, 5, { interval: 15 }), [0, 5]);
});

test('chart-aligned sampling uses the absolute grid', () => {
  assert.deepEqual(
    createSamplingTimes(7, 40, { interval: 15, alignment: 'chart' }),
    [7, 15, 30, 40],
  );
});

test('sampling returns two-dimensional vertices', () => {
  const curve = createScaledCurve(0, 0, {
    startTime: 0,
    endTime: 30,
    startValue: 0,
    endValue: 1,
  });
  assert.deepEqual(sampleCurve(curve, { interval: 15 }), [
    { time: 0, value: 0 },
    { time: 15, value: 0.5 },
    { time: 30, value: 1 },
  ]);
});

test('graph curves are replaced by ordinary graph points', () => {
  const baked = bakeGraph([[0, 0, [0.5, 1]], [30, 1]], { intervalPulses: 15 });
  assert.deepEqual(baked.points, [[0, 0], [15, 0.75], [30, 1]]);
  assert.equal(baked.convertedSegments, 1);
});

test('straight curve attributes are removed without inserting vertices', () => {
  const nearDiagonal = bakeGraph([[0, 0, [0.4, 0.401]], [120, 1]], {
    intervalPulses: 15,
  });
  const constant = bakeGraph([[0, 2, [0, 1]], [120, 2]], { intervalPulses: 15 });
  assert.deepEqual(nearDiagonal.points, [[0, 0], [120, 1]]);
  assert.deepEqual(constant.points, [[0, 2], [120, 2]]);
});

test('fractional pulse grids are quantized and de-duplicated for KSON', () => {
  const baked = bakeGraph([[0, 0, [0.5, 1]], [10, 1]], { intervalPulses: 2.5 });
  assert.deepEqual(baked.points.map(([time]) => time), [0, 3, 5, 8, 10]);
  [0, 0.51, 0.75, 0.96, 1].forEach((expected, index) => {
    assert.ok(Math.abs(baked.points[index][1] - expected) < 1e-12);
  });
});

test('KSON conversion edits a clone and reports results', () => {
  const source = {
    beat: { scroll_speed: [[0, 1, [0.5, 1]], [30, 2]] },
  };
  const converted = convertKsonCurves(source, { intervalPulses: 15 });
  assert.equal(source.beat.scroll_speed[0].length, 3);
  assert.deepEqual(converted.kson.beat.scroll_speed, [[0, 1], [15, 1.75], [30, 2]]);
  assert.equal(converted.report.convertedSegments, 1);
});

test('dictionary targets connect laser and camera curve representations', () => {
  const source = {
    note: {
      laser: [
        [[0, [[0, 0, [0.5, 1]], [30, 1]]]],
        [],
      ],
    },
    camera: {
      tilt: [[0, [0, [0.5, 1]]], [30, 1]],
      cam: {
        body: {
          zoom_top: [[0, 0, [0.5, 1]], [30, 2]],
        },
      },
    },
  };

  const converted = convertKsonCurves(source, { intervalPulses: 15 });
  assert.deepEqual(converted.kson.note.laser[0][0][1], [[0, 0], [15, 0.75], [30, 1]]);
  assert.deepEqual(converted.kson.camera.tilt, [[0, 0], [15, 0.75], [30, 1]]);
  assert.deepEqual(converted.kson.camera.cam.body.zoom_top, [[0, 0], [15, 1.5], [30, 2]]);
  assert.equal(converted.report.convertedSegments, 3);
});

test('camera and scroll-speed conversion preserves KSON immediate changes', () => {
  const immediateGraph = () => [[0, [1, 2], [0.5, 1]], [30, [3, 4]]];
  const source = {
    beat: { scroll_speed: immediateGraph() },
    camera: {
      tilt: [[0, [[1, 2], [0.5, 1]]], [30, [3, 4]]],
      cam: {
        body: {
          zoom_top: immediateGraph(),
          zoom_bottom: immediateGraph(),
          zoom_side: immediateGraph(),
          rotation_deg: immediateGraph(),
          center_split: immediateGraph(),
        },
      },
    },
  };
  const targetIds = [
    'camera-top',
    'camera-bottom',
    'camera-side',
    'camera-tilt',
    'camera-rotation',
    'camera-split',
    'scroll-speed',
  ];
  const converted = convertKsonCurves(source, {
    targetIds,
    precision: 'standard',
    splitMode: 'force',
  });
  const expectedGraph = [[0, [1, 2]], [15, 2.75], [30, [3, 4]]];

  assert.deepEqual(converted.kson.beat.scroll_speed, expectedGraph);
  assert.deepEqual(converted.kson.camera.tilt, expectedGraph);
  for (const name of [
    'zoom_top',
    'zoom_bottom',
    'zoom_side',
    'rotation_deg',
    'center_split',
  ]) {
    assert.deepEqual(converted.kson.camera.cam.body[name], expectedGraph);
  }
  assert.equal(converted.report.convertedSegments, 7);
});

test('outside-in order covers every interval including the center', () => {
  const vertices = [0, 60, 120, 180, 240, 300].map((time) => ({ time, value: 0 }));
  assert.deepEqual(createOutsideInIntervalOrder(vertices, 60), [
    { index: 0, side: 'start' },
    { index: 4, side: 'end' },
    { index: 1, side: 'start' },
    { index: 3, side: 'end' },
    { index: 2, side: 'center' },
  ]);
});

test('turning angles use the target value-to-pulse scale', () => {
  const angle = turningAngle(
    { time: 0, value: 0 },
    { time: 100, value: 1 },
    { time: 200, value: 1 },
    { yPerValueUnit: 100 },
  );
  assert.ok(Math.abs(angle - Math.PI / 4) < 1e-12);
});

test('threshold zero matches direct sampling at every precision cap', () => {
  const curve = createScaledCurve(0, 1, {
    startTime: 7,
    endTime: 207,
    startValue: 0,
    endValue: 1,
  });
  for (const [precision, interval] of Object.entries(PRECISION_INTERVALS)) {
    const hierarchical = sampleHierarchically(curve, {
      precision,
      splitMode: 'force',
    });
    assert.deepEqual(hierarchical, sampleUniform(curve, interval));
  }
});

test('suppressed refinement begins at the 1/4 grid', () => {
  const curve = createScaledCurve(0, 1, {
    startTime: 0,
    endTime: 960,
    startValue: 0,
    endValue: 1,
  });
  const hierarchical = sampleHierarchically(curve, {
    precision: 'detailed',
    splitMode: 'suppress',
    angleScale: { yPerValueUnit: 200 },
    suppressionThreshold: Math.PI,
  });
  assert.deepEqual(hierarchical, sampleUniform(curve, 240));
});

test('straight curves always return endpoints under forced detailed sampling', () => {
  const curve = createScaledCurve(0.4, 0.401, {
    startTime: 7,
    endTime: 207,
    startValue: 0,
    endValue: 1,
  });
  assert.deepEqual(sampleHierarchically(curve, {
    precision: 'detailed',
    splitMode: 'force',
  }), [
    { time: 7, value: 0 },
    { time: 207, value: 1 },
  ]);
});

test('short segments refine through the same forced hierarchy', () => {
  const curve = createScaledCurve(0, 1, {
    startTime: 0,
    endTime: 40,
    startValue: 0,
    endValue: 1,
  });
  assert.deepEqual(sampleHierarchically(curve, {
    precision: 'standard',
    splitMode: 'force',
  }), sampleUniform(curve, 15));
});

test('dictionary entries provide every conversion scale measured in scale.kson', () => {
  const expectedScales = {
    'laser-left': 400,
    'laser-right': 400,
    'camera-tilt': 100,
    'camera-top': 1,
    'camera-bottom': 1,
    'camera-side': 1,
    'camera-rotation': 4,
    'camera-split': 1,
    'scroll-speed': 400,
  };

  for (const [id, yPerValueUnit] of Object.entries(expectedScales)) {
    assert.equal(CURVE_TARGET_BY_ID[id].angleScale.yPerValueUnit, yPerValueUnit);
  }
  const expectedRoundingDigits = {
    'laser-left': 3,
    'laser-right': 3,
    'camera-tilt': 4,
    'camera-top': 2,
    'camera-bottom': 2,
    'camera-side': 2,
    'camera-rotation': 2,
    'camera-split': 2,
    'scroll-speed': 4,
  };
  for (const [id, roundingDigits] of Object.entries(expectedRoundingDigits)) {
    assert.equal(CURVE_TARGET_BY_ID[id].roundingDigits, roundingDigits);
  }
});

test('camera and scroll-speed rounding follows scale.kson', () => {
  const source = {
    beat: {
      scroll_speed: [[0, 1, [0, 1]], [30, 2]],
    },
    camera: {
      tilt: [[0, [0, [0, 1]]], [30, 1]],
      cam: {
        body: {
          zoom_top: [[0, 0, [0, 1]], [30, 1]],
        },
      },
    },
  };
  const converted = convertKsonCurves(source, {
    targetIds: ['camera-tilt', 'camera-top', 'scroll-speed'],
    precision: 'standard',
    splitMode: 'force',
  });

  assert.equal(converted.kson.camera.tilt[1][1], 0.9142);
  assert.equal(converted.kson.camera.cam.body.zoom_top[1][1], 0.91);
  assert.equal(converted.kson.beat.scroll_speed[1][1], 1.9142);
});

test('LASER conversion uses section offset when applying the selected range', () => {
  const source = {
    note: {
      laser: [
        [[1000, [[0, 0, [0.5, 1]], [120, 1]]]],
        [],
      ],
    },
  };

  const outside = convertKsonCurves(source, {
    targetIds: ['laser-left'],
    precision: 'standard',
    splitMode: 'force',
    range: { start: 0, endInclusive: 999 },
  });
  const inside = convertKsonCurves(source, {
    targetIds: ['laser-left'],
    precision: 'standard',
    splitMode: 'force',
    range: { start: 1000, endInclusive: 1000 },
  });

  assert.equal(outside.report.convertedSegments, 0);
  assert.equal(outside.kson.note.laser[0][0][1][0].length, 3);
  assert.equal(inside.report.convertedSegments, 1);
  assert.deepEqual(
    inside.kson.note.laser[0][0][1].map(([time]) => time),
    [0, 15, 30, 45, 60, 75, 90, 105, 120],
  );
});

test('LASER suppression thresholds depend on the selected precision', () => {
  assert.deepEqual(SUPPRESSION_THRESHOLDS_DEGREES, {
    simple: 12.5,
    standard: 10,
    detailed: 7.5,
  });
  const source = {
    note: {
      laser: [
        [[0, [[0, 0, [0, 1]], [120, 1]]]],
        [],
      ],
    },
  };
  const converted = convertKsonCurves(source, {
    targetIds: ['laser-left'],
    precision: 'detailed',
    splitMode: 'suppress',
  });
  assert.equal(converted.report.convertedSegments, 1);
  assert.ok(converted.report.addedPoints > 0);
});

test('only inserted LASER vertices use the dictionary rounding digits', () => {
  const startValue = 0.1234567;
  const endValue = 0.9876543;
  const source = {
    note: {
      laser: [
        [[0, [[0, startValue, [0.5, 1]], [120, endValue]]]],
        [],
      ],
    },
  };
  const converted = convertKsonCurves(source, {
    targetIds: ['laser-left'],
    precision: 'simple',
    splitMode: 'force',
  });
  const points = converted.kson.note.laser[0][0][1];

  assert.equal(points[0][1], startValue);
  assert.equal(points.at(-1)[1], endValue);
  assert.equal(Number.isInteger(points[1][1] * 1000), true);
});

test('rounded collinear vertices are merged while endpoints remain', () => {
  assert.equal(roundValue(0.12356, 3), 0.124);
  assert.deepEqual(mergeCollinearVertices([
    { time: 0, value: 0.1234567 },
    { time: 10, value: 0.2 },
    { time: 20, value: 0.4 },
    { time: 30, value: 0.6 },
    { time: 40, value: 0.9876543 },
  ]), [
    { time: 0, value: 0.1234567 },
    { time: 10, value: 0.2 },
    { time: 30, value: 0.6 },
    { time: 40, value: 0.9876543 },
  ]);
});

test('forced LASER conversion also merges straight consecutive segments', () => {
  const source = {
    note: {
      laser: [
        [[0, [[0, 0, [0, 0.1]], [120, 1]]]],
        [],
      ],
    },
  };
  const converted = convertKsonCurves(source, {
    targetIds: ['laser-left'],
    precision: 'detailed',
    splitMode: 'force',
  });
  const points = converted.kson.note.laser[0][0][1];

  assert.equal(points.length, 16);
  assert.deepEqual(points[0], [0, 0]);
  assert.deepEqual(points.at(-1), [120, 1]);
  assert.equal(converted.report.addedPoints, 14);
});

test('LASER angle-scale balance changes the suppressed subdivision result', () => {
  const source = {
    note: {
      laser: [
        [[0, [[0, 0, [0, 1]], [60, 0.02]]]],
        [],
      ],
    },
  };
  const convertWith = (angleScaleMultiplier) => convertKsonCurves(source, {
    targetIds: ['laser-left'],
    precision: 'detailed',
    splitMode: 'suppress',
    angleScaleMultiplier,
  }).report.addedPoints;

  assert.deepEqual(
    [0.5, 0.707107, 1, 1.414214, 2].map(convertWith),
    [0, 5, 5, 5, 5],
  );
});
