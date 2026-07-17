const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const COUNT_EPSILON = 1e-10;

function suffixFor(parameter) {
  return parameter.unit === "key" ? "" : parameter.unit;
}

/** 数値と、パラメータに定義された接尾辞を厳密に解析します。 */
export function parseParameterValue(text, parameter) {
  const suffix = suffixFor(parameter);
  if (suffix && !text.endsWith(suffix)) return null;

  const numberText = suffix ? text.slice(0, -suffix.length) : text;
  if (!NUMBER_PATTERN.test(numberText)) return null;

  const value = Number(numberText);
  return Number.isFinite(value) ? value : null;
}

export function validateValueRange(value, parameter) {
  const min = parameter.min === null ? null : parseParameterValue(parameter.min, parameter);
  const max = parameter.max === null ? null : parseParameterValue(parameter.max, parameter);
  return {
    valid: (min === null || value >= min) && (max === null || value <= max),
    min,
    max,
  };
}

function roundedValue(value, parameter, precision) {
  if (precision === "approximate" && (parameter.unit === "samples" || parameter.unit === "Hz")) {
    return Math.round(value / 10) * 10;
  }
  if (precision === "approximate" || parameter.valueType === "int") {
    return Math.round(value);
  }
  return Math.round(value * 1000) / 1000;
}

/** 補間値を精度モードに従って丸め、KSONの値文字列へ変換します。 */
export function formatParameterValue(value, parameter, precision) {
  let rounded = roundedValue(value, parameter, precision);
  if (Object.is(rounded, -0)) rounded = 0;

  const numberText = parameter.valueType === "float"
    ? rounded.toFixed(3)
    : String(rounded);
  return `${numberText}${suffixFor(parameter)}`;
}

/** 時刻・補間・丸めを計算し、直前と同値の命令を除去します。 */
export function generateCommands({
  start,
  end,
  lengthY,
  intervalY,
  curveExponent,
  precision,
  parameter,
  useOffValue,
  insertEndCommand = false,
}) {
  const count = Math.max(1, Math.ceil(lengthY / intervalY - COUNT_EPSILON));
  const commands = [];
  let internalTime = 960.0;
  let elapsedY = 0.0;
  let previousValue = null;

  const appendCommand = (pulse, outputValue) => {
    if (commands.at(-1)?.[0] === pulse) {
      commands.pop();
      previousValue = commands.at(-1)?.[1] ?? null;
    }
    if (outputValue !== previousValue) {
      commands.push([pulse, outputValue]);
      previousValue = outputValue;
    }
  };

  const createOutputValue = (value) => {
    const onValue = formatParameterValue(value, parameter, precision);
    return useOffValue && parameter.offValue !== null
      ? `${parameter.offValue}>${onValue}`
      : onValue;
  };

  for (let i = 0; i < count; i += 1) {
    const t = elapsedY / lengthY;
    const curveT = t ** curveExponent;
    const interpolated = start + (end - start) * curveT;
    appendCommand(Math.round(internalTime), createOutputValue(interpolated));
    internalTime += intervalY;
    elapsedY += intervalY;
  }

  if (insertEndCommand) {
    appendCommand(Math.round(960.0 + lengthY), createOutputValue(end));
  }

  return commands;
}

function setOwnDataProperty(object, key, value) {
  Object.defineProperty(object, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

/** blank.ksonへparam_change命令を追加します。 */
export function buildOutputKson(blankKson, { target, effectName, parameterName, commands }) {
  const output = structuredClone(blankKson);
  const audioEffect = output.audio.audio_effect;
  if (!Object.hasOwn(audioEffect, target)) {
    setOwnDataProperty(audioEffect, target, {});
  }

  const targetEffect = audioEffect[target];
  if (!targetEffect.param_change || typeof targetEffect.param_change !== "object") {
    targetEffect.param_change = {};
  }

  const parameterChanges = {};
  setOwnDataProperty(parameterChanges, parameterName, commands);
  setOwnDataProperty(targetEffect.param_change, effectName, parameterChanges);
  return output;
}
