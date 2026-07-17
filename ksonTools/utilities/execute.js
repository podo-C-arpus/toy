import { createOutputFilename, downloadTextFile } from "./file.js";

const OK = { level: "ok", messages: [] };

/**
 * Runs the shared validation, conversion, serialization, and download flow.
 * Tool-specific decisions stay in the callbacks supplied by each tool.
 *
 * @param {{
 *   readSettings?: () => unknown | Promise<unknown>,
 *   validateInput?: (context: object) => ValidationResult | Promise<ValidationResult>,
 *   transform: (context: object) => unknown | Promise<unknown>,
 *   validateOutput?: (output: unknown, context: object) => ValidationResult | Promise<ValidationResult>,
 *   serialize?: (output: unknown, context: object) => string | Promise<string>,
 *   createFilename?: (context: object) => string,
 * }} handlers
 */
export function setupToolExecution(handlers) {
  const form = document.querySelector("#tool-form");
  const runButton = document.querySelector("#run-button");
  const indicator = document.querySelector("#execution-indicator");
  const status = document.querySelector("#status-message");
  const messageBox = document.querySelector("#execution-messages");
  const messageList = document.querySelector("#message-list");
  let source = null;

  if (!(form instanceof HTMLFormElement) || !(runButton instanceof HTMLButtonElement) ||
      !(indicator instanceof HTMLElement) ||
      !(status instanceof HTMLElement) || !(messageBox instanceof HTMLElement) ||
      !(messageList instanceof HTMLUListElement)) {
    throw new TypeError("テンプレートの実行用要素が見つかりません。");
  }
  if (typeof handlers.transform !== "function") {
    throw new TypeError("transform 関数を指定してください。");
  }

  const renderMessages = (results) => {
    const messages = results.flatMap((result) => result.messages ?? []);
    messageList.replaceChildren(...messages.map((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      return item;
    }));
    messageBox.hidden = messages.length === 0;
  };

  const isError = (result) => result.level === "error";
  const check = async (callback, ...args) => callback ? (await callback(...args) ?? OK) : OK;

  document.addEventListener("kson-file-selected", (event) => {
    source = event.detail;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!source) {
      renderMessages([{ level: "error", messages: [".kson ファイルを選択してください。"] }]);
      return;
    }

    runButton.disabled = true;
    indicator.hidden = false;
    status.textContent = "処理しています…";
    try {
      const settings = await handlers.readSettings?.();
      const context = { ...source, settings };
      const inputResult = await check(handlers.validateInput, context);
      renderMessages([inputResult]);
      if (isError(inputResult)) {
        status.textContent = "入力内容を確認してください。";
        return;
      }

      const output = await handlers.transform(context);
      const outputResult = await check(handlers.validateOutput, output, context);
      renderMessages([inputResult, outputResult]);
      if (isError(outputResult)) {
        status.textContent = "出力内容を確認してください。";
        return;
      }

      const text = await (handlers.serialize?.(output, context) ?? JSON.stringify(output, null, 2));
      const filename = handlers.createFilename?.(context) ?? createOutputFilename(source.file.name, "-out");
      downloadTextFile(filename, text);
      status.textContent = `出力しました: ${filename}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "処理中にエラーが発生しました。";
      renderMessages([{ level: "error", messages: [message] }]);
      status.textContent = "出力を中止しました。";
    } finally {
      runButton.disabled = false;
      indicator.hidden = true;
    }
  });
}

/** @typedef {{ level: "ok" | "warning" | "error", messages: string[] }} ValidationResult */
