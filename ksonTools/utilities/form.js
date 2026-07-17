/**
 * Shared controls for tool-specific input forms.
 */

const RANGE_UNITS = {
  all: {
    startLabel: "開始位置",
    endLabel: "終了位置",
    min: "0",
    placeholder: "指定不要",
  },
  measure: {
    startLabel: "開始小節",
    endLabel: "終了小節",
    min: "1",
    placeholder: "例: 1",
  },
  pulse: {
    startLabel: "開始 Y",
    endLabel: "終了 Y",
    min: "0",
    placeholder: "例: 0",
  },
};

const LENGTH_UNITS = {
  measure: 960,
  beat: 240,
  y: 1,
};

const formatNumber = (value) => Number(value.toFixed(6)).toString();

/**
 * Connects one numeric input to a unit selector. Each unit scale is expressed
 * relative to one shared base unit, so a value keeps its meaning on switching.
 */
export class UnitValueControl {
  /**
   * @param {{
 *   container: HTMLElement,
 *   unitSelector: string,
 *   valueSelector: string,
 *   yValueSelector?: string,
 *   units: Record<string, number>
 * }} options
 */
  constructor({ container, unitSelector, valueSelector, yValueSelector, units }) {
    const unit = container.querySelector(unitSelector);
    const input = container.querySelector(valueSelector);
    const yValue = yValueSelector ? container.querySelector(yValueSelector) : null;

    if (!(unit instanceof HTMLSelectElement) || !(input instanceof HTMLInputElement)) {
      throw new TypeError("単位または数値の入力要素が不足しています。");
    }
    if (yValue !== null && !(yValue instanceof HTMLInputElement)) {
      throw new TypeError("Y値の保持用入力要素が不正です。");
    }

    this.unit = unit;
    this.input = input;
    this.yValue = yValue;
    this.units = units;
    this.previousUnit = unit.value;
    this.onUnitChange = this.onUnitChange.bind(this);
    this.onInput = this.onInput.bind(this);

    if (this.yValue) this.updateYValue();
    unit.addEventListener("change", this.onUnitChange);
    input.addEventListener("input", this.onInput);
  }

  onUnitChange() {
    if (this.yValue) {
      const y = Number(this.yValue.value);
      const scale = this.units[this.unit.value];
      if (Number.isFinite(y) && scale) {
        this.input.value = formatNumber(y / scale);
      }
      this.previousUnit = this.unit.value;
      return;
    }

    const value = Number(this.input.value);
    const previousScale = this.units[this.previousUnit];
    const nextScale = this.units[this.unit.value];
    if (Number.isFinite(value) && previousScale && nextScale) {
      this.input.value = formatNumber((value * previousScale) / nextScale);
    }
    this.previousUnit = this.unit.value;
  }

  onInput() {
    if (this.yValue) this.updateYValue();
  }

  updateYValue() {
    const value = Number(this.input.value);
    const scale = this.units[this.unit.value];
    this.yValue.value = Number.isFinite(value) && scale ? formatNumber(value * scale) : "";
  }

  destroy() {
    this.unit.removeEventListener("change", this.onUnitChange);
    this.input.removeEventListener("input", this.onInput);
  }
}

/**
 * Enables the template's length input. Scales are measured in Y:
 * measure=960, beat=240, Y=1.
 *
 * @param {HTMLElement} container Element with data-length-unit-control.
 * @returns {() => void} Call to remove the change event listener.
 */
export function bindLengthUnitControl(container) {
  const control = new UnitValueControl({
    container,
    unitSelector: "[data-length-unit]",
    valueSelector: "[data-length-value]",
    yValueSelector: "[data-length-y-value]",
    units: LENGTH_UNITS,
  });

  return () => control.destroy();
}

/**
 * Enables one measure-number / Y range switcher.
 *
 * @param {HTMLElement} container Element with data-range-unit-control.
 * @returns {() => void} Call to remove the change event listener.
 */
export function bindRangeUnitControl(container) {
  const unit = container.querySelector("[data-range-unit]");
  const start = container.querySelector("[data-range-start]");
  const end = container.querySelector("[data-range-end]");
  const startLabel = container.querySelector("[data-range-start-label]");
  const endLabel = container.querySelector("[data-range-end-label]");

  if (!(unit instanceof HTMLSelectElement) ||
      !(start instanceof HTMLInputElement) ||
      !(end instanceof HTMLInputElement) ||
      !(startLabel instanceof HTMLElement) ||
      !(endLabel instanceof HTMLElement)) {
    throw new TypeError("適用範囲の入力要素が不足しています。");
  }

  const update = () => {
    const settings = RANGE_UNITS[unit.value] ?? RANGE_UNITS.measure;
    startLabel.textContent = settings.startLabel;
    endLabel.textContent = settings.endLabel;
    start.min = settings.min;
    end.min = settings.min;
    start.placeholder = settings.placeholder;
    end.placeholder = settings.placeholder;
    start.disabled = unit.value === "all";
    end.disabled = unit.value === "all";
  };

  unit.addEventListener("change", update);
  update();

  return () => unit.removeEventListener("change", update);
}

/**
 * Converts a select element into a searchable combobox. The original select
 * remains the form value, so tool scripts can keep reading select.value.
 *
 * @param {HTMLSelectElement} select
 * @returns {() => void} Call to remove the generated combobox.
 */
export function bindSearchableSelect(select) {
  if (!(select instanceof HTMLSelectElement)) {
    throw new TypeError("select 要素を指定してください。");
  }

  const options = [...select.options].filter((option) => !option.disabled);
  const selected = () => options.find((option) => option.selected) ?? options[0];
  const wrapper = document.createElement("div");
  const input = document.createElement("input");
  const list = document.createElement("ul");
  const listId = `${select.id || "searchable-select"}-options`;

  wrapper.className = "searchable-select";
  input.type = "text";
  input.className = "searchable-select-input";
  input.autocomplete = "off";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", listId);
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-label", select.labels?.[0]?.textContent?.trim() || "検索付き選択");
  list.id = listId;
  list.className = "searchable-select-options";
  list.setAttribute("role", "listbox");
  list.hidden = true;

  const choose = (option) => {
    select.value = option.value;
    input.value = option.text;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  };

  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
  };

  const render = () => {
    const query = input.value.trim().toLocaleLowerCase();
    const startsWith = options.filter((option) => option.text.toLocaleLowerCase().startsWith(query));
    const includes = options.filter((option) =>
      !startsWith.includes(option) && option.text.toLocaleLowerCase().includes(query),
    );
    const matches = [...startsWith, ...includes];

    list.replaceChildren(...matches.map((option, index) => {
      const item = document.createElement("li");
      item.textContent = option.text;
      item.dataset.value = option.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(option.selected));
      if (index === 0) item.classList.add("is-suggested");
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        choose(option);
      });
      return item;
    }));

    list.hidden = matches.length === 0;
    input.setAttribute("aria-expanded", String(matches.length > 0));
    return matches;
  };

  const onFocus = () => {
    input.value = "";
    render();
  };
  const onInput = () => render();
  const onKeyDown = (event) => {
    if (event.key !== "Enter") return;
    const first = render()[0];
    if (!first) return;
    event.preventDefault();
    choose(first);
  };
  const onBlur = () => {
    window.setTimeout(() => {
      close();
      input.value = selected()?.text ?? "";
    }, 100);
  };

  input.value = selected()?.text ?? "";
  wrapper.append(input, list);
  select.after(wrapper);
  select.hidden = true;
  input.addEventListener("focus", onFocus);
  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeyDown);
  input.addEventListener("blur", onBlur);

  return () => {
    input.removeEventListener("focus", onFocus);
    input.removeEventListener("input", onInput);
    input.removeEventListener("keydown", onKeyDown);
    input.removeEventListener("blur", onBlur);
    wrapper.remove();
    select.hidden = false;
  };
}

document.querySelectorAll("[data-range-unit-control]").forEach((container) => {
  bindRangeUnitControl(container);
});

document.querySelectorAll("[data-length-unit-control]").forEach((container) => {
  bindLengthUnitControl(container);
});

document.querySelectorAll("select[data-searchable-select]").forEach((select) => {
  bindSearchableSelect(select);
});
