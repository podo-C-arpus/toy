import {
  bindFilePicker,
  createOutputFilename,
  downloadTextFile,
  readJsonFile,
} from '../utilities/file.js';
import { splitKsonCurvesLinearly } from './splitter.js';

const DIFFICULTY_LABELS = ['LT', 'CH', 'EX', 'IN'];

export function parseSplitYs(text) {
  const tokens = text.trim().split(/[\s,、;]+/).filter(Boolean);
  if (tokens.length === 0) return [];

  return tokens.map((token) => {
    if (!/^\d+$/.test(token)) {
      throw new RangeError(`「${token}」は0以上の整数のYではありません。`);
    }
    const value = Number(token);
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`「${token}」は扱えるYの範囲を超えています。`);
    }
    return value;
  });
}

function initializePage() {
  const form = document.querySelector('#tool-form');
  const fileInput = document.querySelector('#file-input');
  const dropZone = document.querySelector('#drop-zone');
  const fileName = document.querySelector('#file-name');
  const metadata = document.querySelector('#file-metadata');
  const splitOptions = document.querySelector('#split-options');
  const splitYValues = document.querySelector('#split-y-values');
  const targetInputs = [...document.querySelectorAll('input[name="target"]')];
  const runButton = document.querySelector('#run-button');
  const status = document.querySelector('#status-message');
  const messageBox = document.querySelector('#execution-messages');
  const messageList = document.querySelector('#message-list');
  const resultContent = document.querySelector('#result-content');
  const splitSegmentCount = document.querySelector('#split-segment-count');
  const addedPointCount = document.querySelector('#added-point-count');

  if (!(form instanceof HTMLFormElement)
      || !(fileInput instanceof HTMLInputElement)
      || !(dropZone instanceof HTMLElement)
      || !(fileName instanceof HTMLElement)
      || !(metadata instanceof HTMLElement)
      || !(splitOptions instanceof HTMLFieldSetElement)
      || !(splitYValues instanceof HTMLInputElement)
      || targetInputs.some((input) => !(input instanceof HTMLInputElement))
      || !(runButton instanceof HTMLButtonElement)
      || !(status instanceof HTMLElement)
      || !(messageBox instanceof HTMLElement)
      || !(messageList instanceof HTMLUListElement)
      || !(resultContent instanceof HTMLElement)
      || !(splitSegmentCount instanceof HTMLElement)
      || !(addedPointCount instanceof HTMLElement)) {
    throw new TypeError('曲線分割ツールのUI要素が見つかりません。');
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

  function selectedTargetIds() {
    return targetInputs.filter((input) => input.checked).map((input) => input.value);
  }

  function inputIsValid() {
    try {
      return parseSplitYs(splitYValues.value).length > 0;
    } catch {
      return false;
    }
  }

  function updateExecutionState() {
    runButton.disabled = selectedChart === null
      || !inputIsValid()
      || selectedTargetIds().length === 0;
  }

  function resetAfterFileError(message) {
    selectedChart = null;
    splitOptions.disabled = true;
    metadata.hidden = true;
    resultContent.hidden = true;
    fileName.textContent = '.ksonファイルをここへドロップ、またはクリックして選択';
    status.textContent = message;
    showMessages([message]);
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
      splitOptions.disabled = false;
      resultContent.hidden = true;
      showMessages([]);
      status.textContent = 'ファイルを読み込みました。分割位置と対象を指定してください。';
      updateExecutionState();
    },
    onError: (error) => {
      const message = error instanceof Error
        ? error.message
        : 'ファイルを読み込めませんでした。';
      resetAfterFileError(message);
    },
  });

  splitYValues.addEventListener('input', updateExecutionState);
  targetInputs.forEach((input) => input.addEventListener('change', updateExecutionState));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const messages = [];
    let splitYs = [];

    if (selectedChart === null) messages.push('.ksonファイルを選択してください。');
    if (selectedTargetIds().length === 0) messages.push('分割対象を1つ以上選択してください。');

    try {
      splitYs = parseSplitYs(splitYValues.value);
      if (splitYs.length === 0) messages.push('分割位置を1つ以上入力してください。');
    } catch (error) {
      messages.push(error instanceof Error ? error.message : '分割位置を確認してください。');
    }

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
      const converted = splitKsonCurvesLinearly(selectedChart, {
        targetIds: selectedTargetIds(),
        splitYs,
      });
      const outputName = createOutputFilename(selectedFileName, '_split');
      const outputText = `${JSON.stringify(converted.kson, null, 2)}\n`;
      downloadTextFile(outputName, outputText);

      splitSegmentCount.textContent = String(converted.report.splitSegments);
      addedPointCount.textContent = String(converted.report.addedPoints);
      resultContent.hidden = false;

      const resultMessages = [];
      if (converted.report.addedPoints === 0) {
        resultMessages.push('指定位置を内側に含む、選択対象の曲線セグメントはありませんでした。');
      }
      showMessages(resultMessages);
      status.textContent = `${outputName}を出力しました。追加した制御点: ${converted.report.addedPoints}個。`;
    } catch (error) {
      const message = error instanceof Error ? error.message : '曲線の分割に失敗しました。';
      showMessages([message]);
      status.textContent = '出力を中止しました。';
    } finally {
      updateExecutionState();
    }
  });

  updateExecutionState();
}

if (typeof document !== 'undefined') {
  initializePage();
}
