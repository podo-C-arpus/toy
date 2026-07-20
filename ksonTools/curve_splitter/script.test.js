import test from 'node:test';
import assert from 'node:assert/strict';

import { parseSplitYs } from './script.js';

test('Y input accepts comma, Japanese comma, semicolon, and whitespace separators', () => {
  assert.deepEqual(parseSplitYs('960, 1200、1440; 1680\n1920'), [
    960,
    1200,
    1440,
    1680,
    1920,
  ]);
});

test('Y input rejects fractions and negative values', () => {
  assert.throws(() => parseSplitYs('10.5'), /0以上の整数/);
  assert.throws(() => parseSplitYs('-1'), /0以上の整数/);
});
