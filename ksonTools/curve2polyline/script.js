import { createScaledCurve } from '../utilities/kson-curve.js';
import { sampleCurve, STANDARD_INTERVAL_PULSES } from './sampling.js';
import { sampleHierarchically } from './refinement.js';
import { mergeCollinearVertices, roundValue } from './simplification.js';
import { CURVE_TARGETS } from './dictionary.js';
import {
  bindFilePicker,
  createOutputFilename,
  downloadTextFile,
  readJsonFile,
} from '../utilities/file.js';
import { measureRangeToY } from '../utilities/measure.js';

export const SUPPRESSION_THRESHOLDS_DEGREES = Object.freeze({
  simple: 12.5,
  standard: 10,
  detailed: 7.5,
});

function isCurve(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every((item) => Number.isFinite(item) && item >= 0 && item <= 1);
}

function incomingValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function outgoingValue(value) {
  return Array.isArray(value) ? value[1] : value;
}

function samplingOptions(options) {
  return {
    interval: options.intervalPulses ?? STANDARD_INTERVAL_PULSES,
    alignment: options.alignment ?? 'segment',
    origin: options.origin ?? 0,
  };
}

function segmentStartIsSelected(startTime, options) {
  const range = options.range;
  if (!range) return true;

  const absoluteStartTime = startTime + (options.timeOffset ?? 0);
  if (absoluteStartTime < range.start) return false;
  return range.endExclusive === undefined
    ? absoluteStartTime <= range.endInclusive
    : absoluteStartTime < range.endExclusive;
}

function sampleForConversion(curve, options) {
  if (curve.isStraight) {
    return [
      { time: curve.startTime, value: curve.startValue },
      { time: curve.endTime, value: curve.endValue },
    ];
  }

  // Calls without a precision retain the fixed-grid API used by existing code.
  if (!options.precision) return sampleCurve(curve, samplingOptions(options));

  const thresholdDegrees = SUPPRESSION_THRESHOLDS_DEGREES[options.precision];
  if (thresholdDegrees === undefined) {
    throw new RangeError(`Unknown precision: ${options.precision}`);
  }
  const threshold = options.suppressionThresholdRadians
    ?? thresholdDegrees * Math.PI / 180;
  return sampleHierarchically(curve, {
    precision: options.precision,
    splitMode: options.splitMode ?? 'suppress',
    angleScale: options.angleScale,
    suppressionThreshold: threshold,
  });
}

function mergeStraightInteriorVertices(curve, interiorVertices, roundingDigits) {
  if (!Number.isInteger(roundingDigits) || roundingDigits < 0) return interiorVertices;
  const vertices = mergeCollinearVertices([
    { time: curve.startTime, value: curve.startValue },
    ...interiorVertices,
    { time: curve.endTime, value: curve.endValue },
  ]);
  return vertices.slice(1, -1);
}

/**
 * KSON pulse positions are uint. A fractional sampling grid is therefore
 * rounded at the file-editing boundary, then evaluated again at that pulse.
 */
function interiorKsonVertices(curve, vertices, options) {
  const quantize = options.quantizePulses !== false;
  const result = [];
  let previousTime = curve.startTime;

  for (const vertex of vertices.slice(1, -1)) {
    const time = quantize ? Math.round(vertex.time) : vertex.time;
    if (time <= curve.startTime || time >= curve.endTime || time === previousTime) {
      continue;
    }
    const value = time === vertex.time ? vertex.value : curve.valueAt(time);
    result.push({
      time,
      value: roundValue(value, options.roundingDigits),
    });
    previousTime = time;
  }

  return mergeStraightInteriorVertices(curve, result, options.roundingDigits);
}

/** Bakes curves stored as GraphPoint[] or GraphSectionPoint[]. */
export function bakeGraph(points, options = {}) {
  if (!Array.isArray(points)) return { points, convertedSegments: 0, addedPoints: 0 };

  const result = [];
  let convertedSegments = 0;
  let addedPoints = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[index + 1];

    if (!Array.isArray(current)) {
      result.push(current);
      continue;
    }

    if (!next || !isCurve(current[2])) {
      result.push(structuredClone(current));
      continue;
    }

    const startTime = current[0];
    const endTime = next[0];
    const startValue = outgoingValue(current[1]);
    const endValue = incomingValue(next[1]);

    if (![startTime, endTime, startValue, endValue].every(Number.isFinite)
      || endTime <= startTime) {
      result.push(structuredClone(current));
      continue;
    }

    if (!segmentStartIsSelected(startTime, options)) {
      result.push(structuredClone(current));
      continue;
    }

    const [a, b] = current[2];
    const curve = createScaledCurve(a, b, {
      startTime,
      endTime,
      startValue,
      endValue,
    });
    const vertices = sampleForConversion(curve, options);

    // Preserve an immediate change on the starting point, but remove its curve.
    result.push(structuredClone(current.slice(0, 2)));
    for (const vertex of interiorKsonVertices(curve, vertices, options)) {
      result.push([vertex.time, vertex.value]);
      addedPoints += 1;
    }
    convertedSegments += 1;
  }

  return { points: result, convertedSegments, addedPoints };
}

function readTiltValue(value) {
  if (!Array.isArray(value) || !isCurve(value[1])) return null;
  const baseValue = value[0];
  const incoming = Array.isArray(baseValue) ? baseValue[0] : baseValue;
  const outgoing = Array.isArray(baseValue) ? baseValue[1] : baseValue;
  if (!Number.isFinite(incoming) || !Number.isFinite(outgoing)) return null;
  return { baseValue, incoming, outgoing, curve: value[1] };
}

function readTiltIncoming(value) {
  const curved = readTiltValue(value);
  if (curved) return curved.incoming;
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Bakes the special curve representation used by camera.tilt. */
export function bakeTilt(points, options = {}) {
  if (!Array.isArray(points)) return { points, convertedSegments: 0, addedPoints: 0 };

  const result = [];
  let convertedSegments = 0;
  let addedPoints = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const tilt = Array.isArray(current) ? readTiltValue(current[1]) : null;

    if (!next || !tilt) {
      result.push(structuredClone(current));
      continue;
    }

    const startTime = current[0];
    const endTime = next[0];
    const endValue = readTiltIncoming(next[1]);
    if (![startTime, endTime, endValue].every(Number.isFinite) || endTime <= startTime) {
      result.push(structuredClone(current));
      continue;
    }

    if (!segmentStartIsSelected(startTime, options)) {
      result.push(structuredClone(current));
      continue;
    }

    const curve = createScaledCurve(tilt.curve[0], tilt.curve[1], {
      startTime,
      endTime,
      startValue: tilt.outgoing,
      endValue,
    });
    const vertices = sampleForConversion(curve, options);

    result.push([startTime, structuredClone(tilt.baseValue)]);
    for (const vertex of interiorKsonVertices(curve, vertices, options)) {
      result.push([vertex.time, vertex.value]);
      addedPoints += 1;
    }
    convertedSegments += 1;
  }

  return { points: result, convertedSegments, addedPoints };
}

function getAtPath(root, path) {
  return path.reduce((value, key) => value?.[key], root);
}

function setAtPath(root, path, value) {
  let parent = root;
  for (const key of path.slice(0, -1)) parent = parent?.[key];
  if (parent) parent[path.at(-1)] = value;
}

function conversionOptionsForTarget(options, target) {
  let angleScale = target.angleScale;
  if (angleScale && options.angleScaleMultiplier !== undefined) {
    const multiplier = options.angleScaleMultiplier;
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      throw new RangeError('angleScaleMultiplier must be greater than zero.');
    }
    angleScale = {
      ...angleScale,
      yPerValueUnit: angleScale.yPerValueUnit * multiplier,
    };
  }

  return {
    ...options,
    angleScale,
    roundingDigits: target.roundingDigits,
  };
}

/**
 * Returns an edited clone by default. Pass mutate: true to edit the supplied
 * object. Targets can be selected using IDs from dictionary.js.
 */
export function convertKsonCurves(kson, options = {}) {
  if (!kson || typeof kson !== 'object' || Array.isArray(kson)) {
    throw new TypeError('kson must be an object.');
  }

  const output = options.mutate ? kson : structuredClone(kson);
  const selectedIds = options.targetIds ? new Set(options.targetIds) : null;
  const report = { convertedSegments: 0, addedPoints: 0, targets: {} };

  const record = (id, baked) => {
    report.convertedSegments += baked.convertedSegments;
    report.addedPoints += baked.addedPoints;
    report.targets[id] = {
      convertedSegments: baked.convertedSegments,
      addedPoints: baked.addedPoints,
    };
  };

  for (const target of CURVE_TARGETS) {
    if (selectedIds && !selectedIds.has(target.id)) continue;
    const targetOptions = conversionOptionsForTarget(options, target);

    if (target.shape === 'graph') {
      const points = getAtPath(output, target.path);
      if (!Array.isArray(points)) continue;
      const baked = bakeGraph(points, targetOptions);
      setAtPath(output, target.path, baked.points);
      record(target.id, baked);
    } else if (target.shape === 'tilt') {
      const points = getAtPath(output, target.path);
      if (!Array.isArray(points)) continue;
      const baked = bakeTilt(points, targetOptions);
      setAtPath(output, target.path, baked.points);
      record(target.id, baked);
    } else if (target.shape === 'graph-section') {
      const lane = output.note?.laser?.[target.lane];
      if (!Array.isArray(lane)) continue;
      let convertedSegments = 0;
      let addedPoints = 0;
      for (const section of lane) {
        if (!Array.isArray(section) || !Array.isArray(section[1])) continue;
        const baked = bakeGraph(section[1], {
          ...targetOptions,
          timeOffset: Number.isFinite(section[0]) ? section[0] : 0,
        });
        section[1] = baked.points;
        convertedSegments += baked.convertedSegments;
        addedPoints += baked.addedPoints;
      }
      record(target.id, { convertedSegments, addedPoints });
    }
  }

  return { kson: output, report };
}

const DIFFICULTY_LABELS = ['LT', 'CH', 'EX', 'IN'];

function initializePage() {
  const form = document.querySelector('#tool-form');
  const fileInput = document.querySelector('#file-input');
  const dropZone = document.querySelector('#drop-zone');
  const fileName = document.querySelector('#file-name');
  const metadata = document.querySelector('#file-metadata');
  const scopeOptions = document.querySelector('#scope-options');
  const modeOptions = document.querySelector('#mode-options');
  const splitControl = document.querySelector('#split-mode-control');
  const balanceControl = document.querySelector('#balance-control');
  const rangeUnit = document.querySelector('#range-unit');
  const rangeStart = document.querySelector('#range-start');
  const rangeEnd = document.querySelector('#range-end');
  const targetInputs = [...document.querySelectorAll('input[name="target"]')];
  const precisionInputs = [...document.querySelectorAll('input[name="precision"]')];
  const splitInputs = [...document.querySelectorAll('input[name="split-mode"]')];
  const balanceInputs = [...document.querySelectorAll('input[name="angle-scale-multiplier"]')];
  const runButton = document.querySelector('#run-button');
  const status = document.querySelector('#status-message');
  const messageBox = document.querySelector('#execution-messages');
  const messageList = document.querySelector('#message-list');
  const resultContent = document.querySelector('#result-content');
  const convertedSegmentCount = document.querySelector('#converted-segment-count');
  const addedPointCount = document.querySelector('#added-point-count');

  if (!(form instanceof HTMLFormElement)
      || !(fileInput instanceof HTMLInputElement)
      || !(dropZone instanceof HTMLElement)
      || !(fileName instanceof HTMLElement)
      || !(metadata instanceof HTMLElement)
      || !(scopeOptions instanceof HTMLFieldSetElement)
      || !(modeOptions instanceof HTMLFieldSetElement)
      || !(splitControl instanceof HTMLElement)
      || !(balanceControl instanceof HTMLElement)
      || !(rangeUnit instanceof HTMLSelectElement)
      || !(rangeStart instanceof HTMLInputElement)
      || !(rangeEnd instanceof HTMLInputElement)
      || targetInputs.some((input) => !(input instanceof HTMLInputElement))
      || precisionInputs.some((input) => !(input instanceof HTMLInputElement))
      || splitInputs.some((input) => !(input instanceof HTMLInputElement))
      || balanceInputs.some((input) => !(input instanceof HTMLInputElement))
      || !(runButton instanceof HTMLButtonElement)
      || !(status instanceof HTMLElement)
      || !(messageBox instanceof HTMLElement)
      || !(messageList instanceof HTMLUListElement)
      || !(resultContent instanceof HTMLElement)
      || !(convertedSegmentCount instanceof HTMLElement)
      || !(addedPointCount instanceof HTMLElement)) {
    throw new TypeError('折れ線化ツールのUI要素が見つかりません。');
  }

  let selectedChart = null;
  let selectedFileName = 'chart.kson';

  const displayValue = (value) => (
    value === undefined || value === null || value === '' ? '未設定' : String(value)
  );

  const displayDifficulty = (value) => (
    Number.isInteger(value) && DIFFICULTY_LABELS[value]
      ? DIFFICULTY_LABELS[value]
      : displayValue(value)
  );

  function setMetadata(chart) {
    const meta = chart?.meta && typeof chart.meta === 'object' && !Array.isArray(chart.meta)
      ? chart.meta
      : {};

    metadata.querySelector('[data-meta-title]').textContent = displayValue(meta.title);
    metadata.querySelector('[data-meta-difficulty]').textContent = displayDifficulty(meta.difficulty);
    metadata.querySelector('[data-meta-chart-author]').textContent = displayValue(meta.chart_author);
    metadata.querySelector('[data-meta-level]').textContent = displayValue(meta.level);
    metadata.hidden = false;
  }

  function showMessages(messages) {
    messageList.replaceChildren(...messages.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }));
    messageBox.hidden = messages.length === 0;
  }

  function selectedPrecision() {
    return precisionInputs.find((input) => input.checked)?.value ?? 'standard';
  }

  function updateSplitModeState() {
    const enabled = !modeOptions.disabled;
    splitControl.classList.toggle('is-disabled', !enabled);
    splitControl.setAttribute('aria-disabled', String(!enabled));
    splitInputs.forEach((input) => {
      input.disabled = !enabled;
    });

    const balanceEnabled = enabled && selectedSplitMode() === 'suppress';
    balanceControl.classList.toggle('is-disabled', !balanceEnabled);
    balanceControl.setAttribute('aria-disabled', String(!balanceEnabled));
    balanceInputs.forEach((input) => {
      input.disabled = !balanceEnabled;
    });
  }

  function rangeIsValid() {
    if (rangeUnit.value === 'all') return true;

    const start = Number(rangeStart.value);
    const end = Number(rangeEnd.value);
    const minimum = rangeUnit.value === 'measure' ? 1 : 0;
    return Number.isInteger(start)
      && Number.isInteger(end)
      && start >= minimum
      && end >= start;
  }

  function hasSelectedTarget() {
    return targetInputs.some((input) => input.checked && !input.disabled);
  }

  function selectedTargetIds() {
    return targetInputs
      .filter((input) => input.checked && !input.disabled)
      .map((input) => input.value);
  }

  function selectedSplitMode() {
    return splitInputs.find((input) => input.checked)?.value ?? 'suppress';
  }

  function selectedAngleScaleMultiplier() {
    return Number(balanceInputs.find((input) => input.checked)?.value ?? 1);
  }

  function selectedAngleScaleLabel() {
    const input = balanceInputs.find((item) => item.checked);
    return input?.labels?.[0]?.textContent?.trim() || '標準';
  }

  function selectedRange() {
    if (rangeUnit.value === 'all') return null;
    const start = Number(rangeStart.value);
    const end = Number(rangeEnd.value);

    if (rangeUnit.value === 'measure') {
      return measureRangeToY(start, end, selectedChart?.beat?.time_sig);
    }
    return { start, endInclusive: end };
  }

  function updateExecutionState() {
    runButton.disabled = selectedChart === null || !rangeIsValid() || !hasSelectedTarget();
  }

  function resetAfterFileError(message) {
    selectedChart = null;
    scopeOptions.disabled = true;
    modeOptions.disabled = true;
    metadata.hidden = true;
    resultContent.hidden = true;
    fileName.textContent = '.ksonファイルをここへドロップ、またはクリックして選択';
    status.textContent = message;
    showMessages([message]);
    updateSplitModeState();
    updateExecutionState();
  }

  bindFilePicker({
    input: fileInput,
    dropZone,
    onFile: async (file) => {
      const chart = await readJsonFile(file);
      if (!chart || typeof chart !== 'object' || Array.isArray(chart)) {
        throw new TypeError('KSONのルートはオブジェクトである必要があります。');
      }

      selectedChart = chart;
      selectedFileName = file.name;
      fileName.textContent = file.name;
      setMetadata(chart);
      scopeOptions.disabled = false;
      modeOptions.disabled = false;
      resultContent.hidden = true;
      showMessages([]);
      status.textContent = 'ファイルを読み込みました。範囲・対象と動作モードを設定してください。';
      updateSplitModeState();
      updateExecutionState();
    },
    onError: (error) => {
      const message = error instanceof Error
        ? error.message
        : 'ファイルを読み込めませんでした。';
      resetAfterFileError(message);
    },
  });

  precisionInputs.forEach((input) => {
    input.addEventListener('change', () => {
      updateSplitModeState();
      updateExecutionState();
    });
  });

  splitInputs.forEach((input) => {
    input.addEventListener('change', () => {
      updateSplitModeState();
      updateExecutionState();
    });
  });

  targetInputs.forEach((input) => input.addEventListener('change', updateExecutionState));
  rangeUnit.addEventListener('change', updateExecutionState);
  rangeStart.addEventListener('input', updateExecutionState);
  rangeEnd.addEventListener('input', updateExecutionState);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const messages = [];

    if (selectedChart === null) messages.push('.ksonファイルを選択してください。');
    if (!hasSelectedTarget()) messages.push('適用対象を1つ以上選択してください。');
    if (!rangeIsValid()) messages.push('適用範囲の開始と終了を確認してください。');

    if (messages.length > 0) {
      showMessages(messages);
      status.textContent = '入力内容を確認してください。';
      updateExecutionState();
      return;
    }

    resultContent.hidden = true;
    runButton.disabled = true;
    showMessages([]);
    status.textContent = '処理しています…';

    try {
      const converted = convertKsonCurves(selectedChart, {
        targetIds: selectedTargetIds(),
        range: selectedRange(),
        precision: selectedPrecision(),
        splitMode: selectedSplitMode(),
        angleScaleMultiplier: selectedAngleScaleMultiplier(),
      });
      const outputName = createOutputFilename(selectedFileName, '_polyline');
      const outputText = `${JSON.stringify(converted.kson, null, 2)}\n`;
      downloadTextFile(outputName, outputText);
      convertedSegmentCount.textContent = String(converted.report.convertedSegments);
      addedPointCount.textContent = String(converted.report.addedPoints);
      resultContent.hidden = false;

      const resultMessages = [];
      if (selectedSplitMode() === 'suppress') {
        resultMessages.push(`判定バランスは「${selectedAngleScaleLabel()}」です。`);
      }
      if (converted.report.convertedSegments === 0) {
        resultMessages.push('選択した範囲に変換対象の曲線はありませんでした。');
      }
      showMessages(resultMessages);
      status.textContent = `${outputName}を出力しました。変換した曲線セグメント: ${converted.report.convertedSegments}個。`;
    } catch (error) {
      const message = error instanceof Error ? error.message : '折れ線化に失敗しました。';
      showMessages([message]);
      status.textContent = '出力を中止しました。';
    } finally {
      updateExecutionState();
    }
  });

  updateSplitModeState();
  updateExecutionState();
}

if (typeof document !== 'undefined') {
  initializePage();
}
