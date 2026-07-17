import { downloadTextFile } from "../utilities/file.js";
import { parameters } from "./parameters.js";
import {
  buildOutputKson,
  generateCommands,
  parseParameterValue,
  validateValueRange,
} from "./logic.js";

const form = document.querySelector("#tool-form");
const status = document.querySelector("#status-message");
const messageBox = document.querySelector("#execution-messages");
const messageList = document.querySelector("#message-list");
const parameterCandidates = document.querySelector("#parameter-candidates");
const parameterInput = document.querySelector("#parameter-name");
const effectNameInput = document.querySelector("#effect-name");
const startValueInput = document.querySelector("#start-value");
const endValueInput = document.querySelector("#end-value");
const lengthValueInput = document.querySelector("#length-value");
const intervalValueInput = document.querySelector("#interval-value");
const lengthYInput = document.querySelector("#length-y-value");
const intervalYInput = document.querySelector("#interval-y-value");
const lengthUnitInput = document.querySelector("#length-unit");
const intervalUnitInput = document.querySelector("#interval-unit");
const insertEndCommandControl = document.querySelector("#insert-end-command-control");
const insertEndCommandInput = document.querySelector("#insert-end-command");
const parameterSupportMessage = document.querySelector("#parameter-support-message");
const changeOptions = document.querySelector("#change-options");
const offValueControl = document.querySelector("#off-value-control");
const useOffValueInput = document.querySelector("#use-off-value");
const precisionControl = document.querySelector("#precision-control");
const precisionInputs = [...document.querySelectorAll('input[name="precision"]')];
const runButton = document.querySelector("#run-button");

if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement) ||
    !(messageBox instanceof HTMLElement) ||
    !(messageList instanceof HTMLUListElement) || !(parameterCandidates instanceof HTMLDataListElement) ||
    !(parameterInput instanceof HTMLInputElement) || !(effectNameInput instanceof HTMLInputElement) ||
    !(startValueInput instanceof HTMLInputElement) || !(endValueInput instanceof HTMLInputElement) ||
    !(lengthValueInput instanceof HTMLInputElement) || !(intervalValueInput instanceof HTMLInputElement) ||
    !(lengthYInput instanceof HTMLInputElement) || !(intervalYInput instanceof HTMLInputElement) ||
    !(lengthUnitInput instanceof HTMLSelectElement) || !(intervalUnitInput instanceof HTMLSelectElement) ||
    !(insertEndCommandControl instanceof HTMLElement) || !(insertEndCommandInput instanceof HTMLInputElement) ||
    !(parameterSupportMessage instanceof HTMLElement) || !(changeOptions instanceof HTMLFieldSetElement) ||
    !(offValueControl instanceof HTMLElement) || !(useOffValueInput instanceof HTMLInputElement) ||
    !(precisionControl instanceof HTMLElement) ||
    precisionInputs.some((input) => !(input instanceof HTMLInputElement)) ||
    !(runButton instanceof HTMLButtonElement)) {
  throw new TypeError("実行用の要素が見つかりません。");
}

parameterCandidates.replaceChildren(...parameters.map((parameter) => {
  const option = document.createElement("option");
  option.value = parameter.displayName;
  option.label = `${parameter.effectTypesDisplay} / ${parameter.support}`;
  return option;
}));

function selectedParameter() {
  return parameters.find(({ displayName }) => parameterInput.value === displayName) ?? null;
}

function updateParameterState() {
  const parameter = selectedParameter();
  const supported = parameter?.support === "supported";
  const unsupported = parameter?.support === "unsupported";
  const unavailable = !supported;
  const supportsOffValue = supported && parameter.offValue !== null;
  const precisionHasEffect = supported &&
    (parameter.valueType === "float" || parameter.unit === "samples" || parameter.unit === "Hz");

  changeOptions.disabled = unavailable;
  changeOptions.classList.toggle("is-disabled", unavailable);
  changeOptions.setAttribute("aria-disabled", String(unavailable));
  runButton.disabled = unavailable;

  offValueControl.classList.toggle("is-disabled", !supportsOffValue);
  offValueControl.setAttribute("aria-disabled", String(!supportsOffValue));
  useOffValueInput.disabled = !supportsOffValue;
  if (!supportsOffValue) useOffValueInput.checked = false;

  const disablePrecision = supported && !precisionHasEffect;
  precisionControl.classList.toggle("is-disabled", disablePrecision);
  precisionControl.setAttribute("aria-disabled", String(disablePrecision));
  precisionInputs.forEach((input) => {
    input.disabled = disablePrecision;
    if (disablePrecision) input.checked = input.value === "standard";
  });

  parameterSupportMessage.hidden = parameterInput.value === "" || supported;
  startValueInput.placeholder = parameter?.start_placeholder ? `例: ${parameter.start_placeholder}` : "";
  endValueInput.placeholder = parameter?.end_placeholder ? `例: ${parameter.end_placeholder}` : "";
  if (unsupported) {
    parameterSupportMessage.textContent = `${parameter.displayName} は時間変化生成の対象外です。このツールでは出力できません。`;
  } else if (!parameter && parameterInput.value !== "") {
    parameterSupportMessage.textContent = "パラメータ名を候補から選択してください。";
  }
}

parameterInput.addEventListener("input", updateParameterState);
updateParameterState();

let insertEndCommandPreference = insertEndCommandInput.checked;

function updateEndCommandState() {
  const lengthY = Number(lengthYInput.value);
  const intervalY = Number(intervalYInput.value);
  const ratio = lengthY / intervalY;
  const tolerance = 1e-9 * Math.max(1, Math.abs(ratio));
  const isMultiple = Number.isFinite(ratio) && lengthY > 0 && intervalY > 0 &&
    Math.abs(ratio - Math.round(ratio)) <= tolerance;

  insertEndCommandInput.disabled = !isMultiple;
  insertEndCommandInput.checked = isMultiple && insertEndCommandPreference;
  insertEndCommandControl.classList.toggle("is-disabled", !isMultiple);
  insertEndCommandControl.setAttribute("aria-disabled", String(!isMultiple));
}

insertEndCommandInput.addEventListener("change", () => {
  insertEndCommandPreference = insertEndCommandInput.checked;
});
lengthValueInput.addEventListener("input", updateEndCommandState);
intervalValueInput.addEventListener("input", updateEndCommandState);
lengthUnitInput.addEventListener("change", updateEndCommandState);
intervalUnitInput.addEventListener("change", updateEndCommandState);
updateEndCommandState();

function showMessages(messages) {
  messageList.replaceChildren(...messages.map((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    return item;
  }));
  messageBox.hidden = messages.length === 0;
}

function validateAndReadSettings() {
  const required = [
    [effectNameInput, "エフェクト名"],
    [parameterInput, "パラメータ名"],
    [startValueInput, "始点値"],
    [endValueInput, "終点値"],
    [lengthValueInput, "長さ"],
    [intervalValueInput, "更新間隔"],
  ];
  const emptyMessages = required.flatMap(([input, label]) =>
    input.value.trim() === "" ? [`${label}を入力してください。`] : [],
  );
  if (emptyMessages.length > 0) return { messages: emptyMessages };

  const parameter = selectedParameter();
  if (!parameter) return { messages: ["パラメータ名を候補から選択してください。"] };
  if (parameter.support !== "supported") {
    return { messages: [`${parameter.displayName} は時間変化生成の対象外です。`] };
  }

  const start = parseParameterValue(startValueInput.value, parameter);
  const end = parseParameterValue(endValueInput.value, parameter);
  const formatMessages = [];
  const unitDescription = parameter.unit && parameter.unit !== "key"
    ? `数値に単位「${parameter.unit}」を付けて`
    : "数値で";
  if (start === null) formatMessages.push(`始点値は${unitDescription}入力してください。`);
  if (end === null) formatMessages.push(`終点値は${unitDescription}入力してください。`);
  if (formatMessages.length > 0) return { messages: formatMessages };

  const lengthY = Number(lengthYInput.value);
  const intervalY = Number(intervalYInput.value);
  const rangeMessages = [];
  for (const [value, label] of [[start, "始点値"], [end, "終点値"]]) {
    const range = validateValueRange(value, parameter);
    if (!range.valid) {
      rangeMessages.push(`${label}は${parameter.min}以上、${parameter.max}以下で入力してください。`);
    }
  }
  if (!Number.isFinite(lengthY) || lengthY <= 0) {
    rangeMessages.push("長さは0より大きい値で入力してください。");
  }
  if (!Number.isFinite(intervalY) || intervalY < 1) {
    rangeMessages.push("更新間隔は1Y以上で入力してください。");
  }
  if (rangeMessages.length > 0) return { messages: rangeMessages };

  const target = form.querySelector('input[name="target"]:checked');
  const curve = form.querySelector('input[name="curve"]:checked');
  const precision = form.querySelector('input[name="precision"]:checked');
  if (!(target instanceof HTMLInputElement) || !(curve instanceof HTMLInputElement) ||
      !(precision instanceof HTMLInputElement)) {
    return { messages: ["選択項目を確認してください。"] };
  }

  return {
    messages: [],
    settings: {
      target: target.value,
      effectName: effectNameInput.value,
      parameter,
      start,
      end,
      lengthY,
      intervalY,
      curveExponent: Number(curve.value),
      precision: precision.value,
      useOffValue: useOffValueInput.checked && !useOffValueInput.disabled,
      insertEndCommand: insertEndCommandInput.checked && !insertEndCommandInput.disabled,
    },
  };
}

function confirmLargeOutput(commandCount) {
  if (commandCount <= 100) return true;
  if (commandCount <= 1000) {
    return window.confirm(`命令数は${commandCount}件です。ファイルサイズが大きくなる可能性があります。続行しますか？`);
  }
  return window.confirm(`警告: 命令数は${commandCount}件です。処理負荷やファイルサイズが大きくなる可能性があります。本当に続行しますか？`);
}

async function loadBlankKson() {
  const response = await fetch("../utilities/blank.kson");
  if (!response.ok) throw new Error("blank.ksonを読み込めませんでした。");
  return response.json();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const validation = validateAndReadSettings();
  if (!validation.settings) {
    showMessages(validation.messages);
    status.textContent = "入力内容を確認してください。";
    return;
  }

  const settings = validation.settings;
  const commands = generateCommands(settings);
  if (!confirmLargeOutput(commands.length)) {
    showMessages([`命令数は${commands.length}件です。出力をキャンセルしました。`]);
    status.textContent = "出力をキャンセルしました。";
    return;
  }

  runButton.disabled = true;
  status.textContent = "処理しています…";
  try {
    const blankKson = await loadBlankKson();
    const output = buildOutputKson(blankKson, {
      target: settings.target,
      effectName: settings.effectName,
      parameterName: settings.parameter.parameterName,
      commands,
    });
    const text = JSON.stringify(output);
    downloadTextFile("dynamic_effect.kson", text);
    showMessages([]);
    status.textContent = `dynamic_effect.ksonを出力しました。書き込み件数: ${commands.length}件。`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "処理中にエラーが発生しました。";
    showMessages([message]);
    status.textContent = "出力を中止しました。";
  } finally {
    runButton.disabled = false;
    updateParameterState();
  }
});
