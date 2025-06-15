// kshParserModule.js
// kshTextとオブジェクトの相互変換、小節単位での読み出しと書き込み、冗長性削除・挿入ユーティリティ

// ============================
// --- kshTextとオブジェクトの相互変換 ---
// ============================

export function parseKSH(kshText) {
    const allLines = kshText.split(/\r?\n/);
    const barLineIndexes = [];
    for (let i = 0; i < allLines.length; i++) if (allLines[i].trim() === "--") barLineIndexes.push(i);

    const meta = {};
    const metaLines = allLines.slice(0, barLineIndexes[0]);
    for (const line of metaLines) {
        const idx = line.indexOf("=");
        if (idx !== -1) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }

    const userEffect = allLines.slice(barLineIndexes.at(-1) + 1).filter(l => l.trim() !== "");
    const measureLines = allLines.slice(barLineIndexes[0], barLineIndexes.at(-1) + 1);

    const measures = [];
    let currentLines = [], currentBeat = "4/4", currentBPM = "150.000";
    for (const lineText of measureLines) {
        if (lineText.trim() === "--") {
            if (currentLines.length) {
                measures.push(parseMeasure(currentLines, currentBeat, currentBPM));
                const lastBPM = extractLastBPM(measures.at(-1).main);
                if (lastBPM) currentBPM = lastBPM;
            }
            currentLines = [];
        } else {
            currentLines.push(lineText);
        }
    }

    return { meta, measures, userEffect };
}

function parseMeasure(lines, beat, bpm) {
    const main = [], comments = [], commandLines = [];
    let currentBeat = beat;

    for (const lineText of lines) {
        const trimmed = lineText.trim();
        if (trimmed.startsWith("//")) comments.push(trimmed);
        else if (trimmed.startsWith("beat=")) currentBeat = trimmed.slice(5).trim();
        else if (trimmed.length >= 10 && trimmed.includes("|")) {
            const { notes, rotation } = parseNotesLine(trimmed);
            const commandList = commandLines.map(line => {
                const [type, value] = line.split("=");
                return type && value ? { type: type.trim(), value: [value.trim()] } : null;
            }).filter(Boolean);

            const unit = {};
            if (comments.length) unit.comments = [...comments];
            if (commandList.length) unit.command = commandList;
            unit.notes = notes;
            if (rotation) unit.rotation = rotation;

            main.push(unit);
            comments.length = 0;
            commandLines.length = 0;
        } else {
            commandLines.push(trimmed);
        }
    }

    return { beat: currentBeat, currentBPM: bpm, main };
}

function extractLastBPM(units) {
    for (let i = units.length - 1; i >= 0; i--) {
        const commandList = units[i].command || [];
        for (const cmd of commandList) if (cmd.type === "t") return cmd.value[0];
    }
    return null;
}

function parseNotesLine(line) {
    const raw = line.slice(0, 10), rotation = line.length > 10 ? line.slice(10).trim() : "";
    const bt = {}, fx = {}, laser = {};
    ["a","b","c","d"].forEach((k,i)=>{ const v=raw[i]; if(v==="1")bt[k]="chip"; else if(v==="2")bt[k]="long"; });
    ["l","r"].forEach((k,i)=>{ const v=raw[5+i]; if(v==="1")fx[k]="long"; else if(v==="2")fx[k]="chip"; else if(v==="3")fx[k]="se_chip"; });
    ["l","r"].forEach((k,i)=>{ const v=raw[8+i]; if(v&&v!=="-")laser[k]=v; });
    return { notes: { bt, fx, laser }, rotation: rotation || undefined };
}

export function stringifyKSH(kshData) {
    const lines = Object.entries(kshData.meta).map(([k,v])=>`${k}=${v}`);
    lines.push("--");
    let lastBeat = "4/4", lastBPM = "150.000";

    for (const measure of kshData.measures) {
        if (measure.beat !== lastBeat) {
            lines.push(`beat=${measure.beat}`);
            lastBeat = measure.beat;
        }

        for (const unit of measure.main) {
            unit.comments?.forEach(c => lines.push(c));
            unit.command?.forEach(c => c.value.forEach(v => lines.push(`${c.type}=${v}`)));
            lines.push(stringifyNotesLine(unit.notes) + (unit.rotation || ""));
        }

        lines.push("--");
        lastBPM = measure.currentBPM ?? lastBPM;
    }

    return lines.concat(kshData.userEffect).join("\r\n");
}

function stringifyNotesLine(notes) {
    const bt = ["a","b","c","d"].map(k => notes.bt?.[k]==="chip"?"1":notes.bt?.[k]==="long"?"2":"0").join("");
    const fx = ["l","r"].map(k => notes.fx?.[k]==="long"?"1":notes.fx?.[k]==="chip"?"2":notes.fx?.[k]==="se_chip"?"3":"0").join("");
    const laser = ["l","r"].map(k => notes.laser?.[k] ?? "-").join("");
    return `${bt}|${fx}|${laser}`;
}

// ==============================
// --- 小節操作ユーティリティ ---
// ==============================

export function getPeriod(kshData, barNumber) {
    const idx = barNumber - 1;
    if (idx < 0 || idx >= kshData.measures.length) {
        console.error("無効な小節番号（getPeriod）:", barNumber);
        throw new Error("getPeriod: 指定された小節番号が範囲外です。");
    }
    return kshData.measures[idx];
}

export function updatePeriod(kshData, barNumber, newMeasure) {
    const idx = barNumber - 1;
    if (idx < 0 || idx >= kshData.measures.length) {
        console.error("無効な小節番号（updatePeriod）:", barNumber);
        throw new Error("updatePeriod: 指定された小節番号が範囲外です。");
    }
    kshData.measures[idx] = newMeasure;
}

export function insertPeriod(kshData, barNumber, newMeasure) {
    const idx = barNumber - 1;
    if (idx < 0 || idx > kshData.measures.length) {
        console.error("無効な小節番号（insertPeriod）:", barNumber);
        throw new Error("insertPeriod: 小節番号が挿入可能な範囲外です。");
    }
    kshData.measures.splice(idx, 0, newMeasure);
}

export function removePeriod(kshData, barNumber) {
    const idx = barNumber - 1;
    if (idx < 0 || idx >= kshData.measures.length) {
        console.error("無効な小節番号（removePeriod）:", barNumber);
        throw new Error("removePeriod: 指定された小節番号が範囲外です。");
    }
    kshData.measures.splice(idx, 1);
}

// ==============================
// --- 冗長性削除ユーティリティ ---
// ==============================

const laserPointPattern = /^[0-9A-Za-o]$/; // laserノートの定義点に使われる文字

// ✅ ユニットが冗長であるかを判定する関数
function isRedundantUnit(measureObject, unitIndex) {
    if (unitIndex === 0) return false; // 先頭は常に必要

    const unit = measureObject.main[unitIndex];
    const prev = measureObject.main[unitIndex - 1];

    // command, comments, rotation のいずれかが存在する場合は削除不可
    if (
        (unit.command && unit.command.length > 0) ||
        (unit.comments && unit.comments.length > 0) ||
        (unit.rotation && unit.rotation.length > 0)
    ) {
        return false;
    }

    // bt ノーツにchipがある、またはlongの開始/終了である場合
    for (const key of ["a", "b", "c", "d"]) {
        const now = unit.notes.bt?.[key];
        const before = prev.notes.bt?.[key];

        if (now === "chip") return false;
        if (now === "long" && before !== "long") return false;
        if ((now === undefined || now === null) && before === "long") return false;
    }

    // fx ノーツにchipがある、またはlongの開始/終了である場合
    for (const key of ["l", "r"]) {
        const now = unit.notes.fx?.[key];
        const before = prev.notes.fx?.[key];

        if (now === "chip" || now === "se_chip") return false;
        if (now === "long" && before !== "long") return false;
        if ((now === undefined || now === null) && before === "long") return false;
    }

    // laser に定義点がある、または継続終了点がある場合
    for (const key of ["l", "r"]) {
        const now = unit.notes.laser?.[key] ?? "-";
        const before = prev.notes.laser?.[key] ?? "-";

        if (laserPointPattern.test(now)) return false;
        if (before !== "-" && now === "-") return false;
    }

    return true; // すべての条件を満たしていれば冗長
}

// ✅ この周期（redundantSize）で削除しても問題ないかチェック
function isRedundantPatternRemovable(isRedundantArray, redundantSize) {
    if (redundantSize <= 1 || isRedundantArray.length % redundantSize !== 0) return false;

    const groupCount = isRedundantArray.length / redundantSize;

    for (let i = 1; i <= groupCount; i++) {
        const idx = i * redundantSize - 1;
        if (!isRedundantArray[idx]) return false;
    }

    return true;
}

// ✅ 冗長性を1段階だけ削除する
function removeRedundantOnce(measureObject) {
    const unitCount = measureObject.main.length;
    if (unitCount < 2) return false;

    const isRedundant = new Array(unitCount).fill(false);
    for (let i = 0; i < unitCount; i++) {
        isRedundant[i] = isRedundantUnit(measureObject, i);
    }

    for (let size = 2; size <= 192; size++) {
        if (isRedundantPatternRemovable(isRedundant, size)) {
            for (let i = unitCount - 1; i >= 0; i--) {
                if ((i + 1) % size === 0 && isRedundant[i]) {
                    measureObject.main.splice(i, 1);
                }
            }
            return true; // 削除成功
        }
    }

    return false; // 何も削除しなかった
}

// ✅ 全体に適用して最大限冗長性を削除
export function removeRedundant(kshData) {
    for (let barNumber = 1; barNumber <= kshData.measures.length; barNumber++) {
        const measureObject = getPeriod(kshData, barNumber);

        while (removeRedundantOnce(measureObject)) {
            // 削除できる限り繰り返す
        }

        updatePeriod(kshData, barNumber, measureObject);
    }
}

// ==============================
// --- 冗長性挿入ユーティリティ ---
// ==============================

// ✅ 次のレーザーポイントを取得（現在の barNumber は 1始まり）
function getNextLaser(kshData, barNumber, unitIndex) {
    const measureIdx = barNumber - 1;
    const measure = kshData.measures[measureIdx];
    const nextLaser = { l: "-", r: "-" };

    if (unitIndex < measure.main.length - 1) {
        const nextUnit = measure.main[unitIndex + 1];
        nextLaser.l = nextUnit.notes?.laser?.l ?? "-";
        nextLaser.r = nextUnit.notes?.laser?.r ?? "-";
    } else if (barNumber < kshData.measures.length) {
        const nextMeasure = kshData.measures[measureIdx + 1];
        const nextUnit = nextMeasure.main[0];
        nextLaser.l = nextUnit.notes?.laser?.l ?? "-";
        nextLaser.r = nextUnit.notes?.laser?.r ?? "-";
    }

    return nextLaser;
}

// ✅ 元ユニットに基づく冗長ユニットの作成
function makeRedundantUnit(kshData, barNumber, unitIndex) {
    const measure = kshData.measures[barNumber - 1];
    const currentUnit = measure.main[unitIndex];

    const redundantUnit = {
        notes: {
            bt: {},
            fx: {},
            laser: { l: "-", r: "-" }
        }
    };

    // ロングノーツの継続
    for (const key of ["a", "b", "c", "d"]) {
        if (currentUnit.notes.bt?.[key] === "long") {
            redundantUnit.notes.bt[key] = "long";
        }
    }
    for (const key of ["l", "r"]) {
        if (currentUnit.notes.fx?.[key] === "long") {
            redundantUnit.notes.fx[key] = "long";
        }
    }

    // レーザー継続（片方でも "-" なら "-" のまま）
    const nextLaser = getNextLaser(kshData, barNumber, unitIndex);
    for (const key of ["l", "r"]) {
        const curVal = currentUnit.notes.laser?.[key] ?? "-";
        const nextVal = nextLaser[key] ?? "-";
        redundantUnit.notes.laser[key] = (curVal !== "-" && nextVal !== "-") ? ":" : "-";
    }

    return redundantUnit;
}

// ✅ 指定された冗長度でユニット密度を増やす
export function insertRedundancy(kshData, barNumber, redundancy) {
    if (redundancy < 2) return;

    const measure = getPeriod(kshData, barNumber);
    const newMain = [];

    for (let i = 0; i < measure.main.length; i++) {
        const originalUnit = measure.main[i];
        newMain.push({ ...originalUnit }); // 元のユニットを保持

        // 冗長ユニットを redundancy-1 個追加
        const redun = makeRedundantUnit(kshData, barNumber, i);
        for (let j = 1; j < redundancy; j++) {
            newMain.push({ ...redun });
        }
    }

    measure.main = newMain;
    updatePeriod(kshData, barNumber, measure);
}
