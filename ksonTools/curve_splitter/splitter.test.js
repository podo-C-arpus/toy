import test from 'node:test';
import assert from 'node:assert/strict';

import {
  splitGraphLinearly,
  splitKsonCurvesLinearly,
  splitTiltLinearly,
} from './splitter.js';

test('one graph curve accepts three split positions', () => {
  const source = [[0, 0, [0.2, 0.8]], [100, 1]];
  const result = splitGraphLinearly(source, [75, 25, 50, 50]);

  assert.deepEqual(result.points, [
    [0, 0],
    [25, 0.25],
    [50, 0.5],
    [75, 0.75],
    [100, 1],
  ]);
  assert.equal(result.splitSegments, 1);
  assert.equal(result.addedPoints, 3);
  assert.deepEqual(source, [[0, 0, [0.2, 0.8]], [100, 1]]);
});

test('only curved segments containing a split position are changed', () => {
  const source = [
    [0, 0, [0.5, 1]],
    [100, 1],
    [200, 2, [1, 0]],
    [300, 3],
  ];
  const result = splitGraphLinearly(source, [0, 100, 150, 400]);

  assert.deepEqual(result.points, source);
  assert.equal(result.splitSegments, 0);
  assert.equal(result.addedPoints, 0);
});

test('graph interpolation uses outgoing and incoming immediate values', () => {
  const result = splitGraphLinearly(
    [[0, [10, 20], [0.5, 1]], [100, [40, 50]]],
    [25, 50, 75],
  );

  assert.deepEqual(result.points, [
    [0, [10, 20]],
    [25, 25],
    [50, 30],
    [75, 35],
    [100, [40, 50]],
  ]);
});

test('laser graph sections convert absolute Y to relative Y', () => {
  const source = {
    note: {
      laser: [
        [[1000, [[0, 0, [0.5, 1]], [400, 1]], 2]],
        [],
      ],
    },
  };
  const result = splitKsonCurvesLinearly(source, {
    targetIds: ['laser-left'],
    splitYs: [1100, 1200, 1300],
  });

  assert.deepEqual(result.kson.note.laser[0], [
    [1000, [
      [0, 0],
      [100, 0.25],
      [200, 0.5],
      [300, 0.75],
      [400, 1],
    ], 2],
  ]);
  assert.equal(result.report.splitSegments, 1);
  assert.equal(result.report.addedPoints, 3);
  assert.deepEqual(source.note.laser[0][0][1], [[0, 0, [0.5, 1]], [400, 1]]);
});

test('camera tilt curves preserve an immediate start value', () => {
  const result = splitTiltLinearly(
    [[0, [[1, 3], [0.5, 1]]], [100, 7]],
    [25, 50, 75],
  );

  assert.deepEqual(result.points, [
    [0, [1, 3]],
    [25, 4],
    [50, 5],
    [75, 6],
    [100, 7],
  ]);
  assert.equal(result.splitSegments, 1);
  assert.equal(result.addedPoints, 3);
});

test('target selection limits edits and reports each selected existing target', () => {
  const source = {
    beat: { scroll_speed: [[0, 1, [0, 1]], [100, 2]] },
    camera: {
      cam: { body: { zoom_top: [[0, 10, [1, 0]], [100, 20]] } },
    },
  };
  const result = splitKsonCurvesLinearly(source, {
    targetIds: ['scroll-speed'],
    splitYs: [50],
  });

  assert.deepEqual(result.kson.beat.scroll_speed, [[0, 1], [50, 1.5], [100, 2]]);
  assert.deepEqual(result.kson.camera.cam.body.zoom_top, source.camera.cam.body.zoom_top);
  assert.deepEqual(result.report.targets, {
    'scroll-speed': { splitSegments: 1, addedPoints: 1 },
  });
});

test('split positions must be non-negative integers', () => {
  assert.throws(
    () => splitGraphLinearly([[0, 0], [100, 1]], [10.5]),
    /non-negative integer/,
  );
  assert.throws(
    () => splitGraphLinearly([[0, 0], [100, 1]], [-1]),
    /non-negative integer/,
  );
});
