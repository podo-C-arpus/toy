import { bindFilePicker, readJsonFile } from "./file.js";

const input = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const fileName = document.querySelector("#file-name");
const runButton = document.querySelector("#run-button");
const statusMessage = document.querySelector("#status-message");
const metadata = document.querySelector("#file-metadata");

const difficultyLabels = ["LT", "CH", "EX", "IN"];

const displayValue = (value) => value === undefined || value === null || value === "" ? "未設定" : String(value);

const displayDifficulty = (difficulty) => {
  if (Number.isInteger(difficulty) && difficultyLabels[difficulty]) {
    return difficultyLabels[difficulty];
  }
  return displayValue(difficulty);
};

const setMetadata = (chart) => {
  const meta = chart && typeof chart === "object" && chart.meta && typeof chart.meta === "object"
    ? chart.meta
    : {};

  document.querySelector("[data-meta-title]").textContent = displayValue(meta.title);
  document.querySelector("[data-meta-difficulty]").textContent = displayDifficulty(meta.difficulty);
  document.querySelector("[data-meta-chart-author]").textContent = displayValue(meta.chart_author);
  document.querySelector("[data-meta-level]").textContent = displayValue(meta.level);
  metadata.hidden = false;
};

if (input && dropZone && fileName && runButton && statusMessage) {
  bindFilePicker({
    input,
    dropZone,
    onFile: async (file) => {
      const chart = await readJsonFile(file);
      fileName.textContent = file.name;
      setMetadata(chart);
      statusMessage.textContent = "ファイルを読み込みました。設定を確認して実行してください。";
      runButton.disabled = false;
      document.dispatchEvent(new CustomEvent("kson-file-selected", {
        detail: { file, chart },
      }));
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "ファイルを読み込めませんでした。";
      fileName.textContent = ".ksonファイルをここへドロップ、またはクリックして選択";
      metadata.hidden = true;
      statusMessage.textContent = message;
      runButton.disabled = true;
    },
  });
}
