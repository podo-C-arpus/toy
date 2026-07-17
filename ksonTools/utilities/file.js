/**
 * Browser-only helpers for local file input and downloads.
 * This module does not validate the KSON format.
 */

/**
 * Reads a local text file as UTF-8 text.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function readTextFile(file) {
  if (!(file instanceof File)) {
    throw new TypeError("読み込むファイルを指定してください。");
  }

  return file.text();
}

/**
 * Reads and parses a local JSON file. KSON-specific validation is left to the
 * calling tool because each tool only needs a subset of the chart data.
 *
 * @param {File} file
 * @returns {Promise<unknown>}
 */
export async function readJsonFile(file) {
  const text = await readTextFile(file);

  try {
    return JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : "";
    throw new SyntaxError(`JSONとして読み込めませんでした${detail}`);
  }
}

/**
 * Creates a click-and-drop file picker.
 *
 * @param {{
 *   input: HTMLInputElement,
 *   dropZone: HTMLElement,
 *   onFile: (file: File) => void | Promise<void>,
 *   onError?: (error: unknown) => void,
 *   extension?: string
 * }} options
 * @returns {() => void} Call to remove the registered event listeners.
 */
export function bindFilePicker({ input, dropZone, onFile, onError, extension = ".kson" }) {
  if (!(input instanceof HTMLInputElement) || input.type !== "file") {
    throw new TypeError("input には type=file の input 要素を指定してください。");
  }
  if (!(dropZone instanceof HTMLElement)) {
    throw new TypeError("dropZone には要素を指定してください。");
  }
  if (typeof onFile !== "function") {
    throw new TypeError("onFile には処理関数を指定してください。");
  }

  const reportError = (error) => {
    if (typeof onError === "function") {
      onError(error);
      return;
    }
    console.error(error);
  };

  const acceptsFile = (file) => {
    return file.name.toLowerCase().endsWith(extension.toLowerCase());
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!acceptsFile(file)) {
      reportError(new TypeError(`${extension} ファイルを選択してください。`));
      return;
    }

    try {
      await onFile(file);
    } catch (error) {
      reportError(error);
    }
  };

  const onInputChange = () => handleFile(input.files?.[0]);
  const onDragOver = (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  };
  const onDragLeave = () => dropZone.classList.remove("is-dragging");
  const onDrop = (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
    void handleFile(event.dataTransfer?.files?.[0]);
  };
  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.click();
    }
  };
  const onClick = () => input.click();

  input.addEventListener("change", onInputChange);
  dropZone.addEventListener("click", onClick);
  dropZone.addEventListener("dragover", onDragOver);
  dropZone.addEventListener("dragleave", onDragLeave);
  dropZone.addEventListener("drop", onDrop);
  dropZone.addEventListener("keydown", onKeyDown);

  return () => {
    input.removeEventListener("change", onInputChange);
    dropZone.removeEventListener("click", onClick);
    dropZone.removeEventListener("dragover", onDragOver);
    dropZone.removeEventListener("dragleave", onDragLeave);
    dropZone.removeEventListener("drop", onDrop);
    dropZone.removeEventListener("keydown", onKeyDown);
  };
}

/**
 * Downloads text generated in the browser.
 *
 * @param {string} filename
 * @param {string} text
 * @param {string} [type="application/json;charset=utf-8"]
 */
export function downloadTextFile(filename, text, type = "application/json;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Builds an output filename while preserving the .kson extension.
 *
 * @param {string} sourceName
 * @param {string} suffix
 * @returns {string}
 */
export function createOutputFilename(sourceName, suffix) {
  const baseName = sourceName.replace(/\.kson$/i, "") || "chart";
  return `${baseName}${suffix}.kson`;
}
