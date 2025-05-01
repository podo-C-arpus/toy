const fxLine = /^fx-[lr]=[\s\S]*$/;
const notesLine = /^[0-2]{4}\|[0-2]{2}\|[\s\S]*$/;
const bom = '\uFEFF';
const defaultDefinition = { // 参照することがあるデフォルトのパラメータを用意しておく
	"def": [
		[
			"Retrigger",
			{
				"type": "Retrigger",
				"v": {
					"updatePeriod": "1/2",
					"waveLength": "1/4",
					"rate": "70%",
					"mix": "0%>100%"
				}
			}
		],
		[
			"Gate",
			{
				"type": "Gate",
				"v": {
					"waveLength": "1/4",
					"rate": "60%",
					"mix": "0%>90%"
				}
			}
		],
		[
			"Flanger",
			{
				"type": "Flanger",
				"v": {
					"period": "2.0",
					"delay": "30samples",
					"depth": "45samples",
					"feedback": "60%",
					"stereoWidth": "0%",
					"volume": "75%",
					"mix": "0%>80%"
				}
			}
		],
		[
			"PitchShift",
			{
				"type": "PitchShift",
				"v": {
					"pitch": "0.0",
					"chunkSize": "700samples",
					"overWrap": "40%",
					"mix": "0%>100%"
				}
			}
		],
		[
			"BitCrusher",
			{
				"type": "BitCrusher",
				"v": {
					"reduction": "0samples",
					"mix": "0%>100%"
				}
			}
		],
		[
			"Phaser",
			{
				"type": "Phaser",
				"v": {
					"period": "1/2",
					"stage": "6",
					"loFreq": "1500Hz",
					"hiFreq": "20000Hz",
					"Q": "0.707",
					"feedback": "35%",
					"stereoWidth": "75%",
					"hiCutGain": "-8.9dB",
					"mix": "0%>50%"
				}
			}
		],
		[
			"Wobble",
			{
				"type": "Wobble",
				"v": {
					"waveLength": "1/12",
					"loFreq": "500Hz",
					"hiFreq": "20000Hz",
					"Q": "1.414",
					"mix": "0%>50%"
				}
			}
		],
		[
			"TapeStop",
			{
				"type": "TapeStop",
				"v": {
					"speed": "50%",
					"mix": "0%>100%"
				}
			}
		],
		[
			"Echo",
			{
				"type": "Echo",
				"v": {
					"updatePeriod": "0",
					"waveLength": "1/4",
					"updateTrigger": "off>on",
					"feedbackLevel": "100%",
					"mix": "0%>100%"
				}
			}
		],
		[
			"SideChain",
			{
				"type": "SideChain",
				"v": {
					"period": "1/4",
					"holdTime": "50ms",
					"attackTime": "10ms",
					"releaseTime": "1/16",
					"ratio": "1>5"
				}
			}
		]
	]
}

let msLength = 0;
let editorValue = 4;
let editorValueFeedback = 60;

let currentEffectList = [];
let laserEffectList = [];
let headTrigger = "always"; // Retrigger等の先頭にupdateTriggerを記載するか否か
	// "always": 必ず記載する, "left": fx_lの場合のみ記載する, "never": 記載しない
let valuePriority = "editor"; //fxロングのeditorから指定可能なパラメータをどう扱うのか
	// "editor":editor指定値を優先, "uneditable":editor指定値を参照するがms指定や範囲指定等editor定義不可な値は上書きしない, "userDefinition":ユーザー定義値をそのまま使う
let mixScale = "userDefinition"; //mixの定義値をどうするか(元から変化する設定は上書きしない)
	//"userDefinition": ユーザー定義値をそのまま使う, "weaken": mixは定義値の66.7%程度に弱める, "slightly":mixは定義値の33.3%程度に弱める, "hundred":100%
let linerValue = "userDefinition"; //0<100を0<0-100にするみたいな加工を勝手にやる機能
	//"userDefinition": ユーザー定義値をそのまま使う, "proposal": おすすめ定義1, "dynamic": おすすめ定義2 

let audio_effect = { // これはksonでエフェクトが格納される実例
	"fx": {
		"def": [
			[
				"Dlayms",
				{
					"type": "flanger",
					"v": {
						"delay": "3000samples",
						"depth": "0samples",
						"feedback": "80%",
						"mix": "0%>100%",
						"period": "2400ms"
					}
				}
			],
			[
				"Chorms",
				{
					"type": "flanger",
					"v": {
						"delay": "30samples",
						"depth": "200samples",
						"feedback": "90%",
						"mix": "0%>80%",
						"period": "450ms",
						"stereo_width": "80%"
					}
				}
			]
		]
	},
	"laser": {
		"def": [
			[
				"WO12ms",
				{
					"type": "wobble",
					"v": {
						"freq_1": "500Hz",
						"freq_2": "20000Hz",
						"mix": "0%-100%",
						"q": "1.414",
						"wave_length": "100ms"
					}
				}
			]
		]
	}
}

function getUserFxEffects(lines) { // テキストからユーザー定義エフェクトを取り出す
	// まず、初期エフェクト定義を用意しておく
	const audio_effect = {
		"fx": {
			"def": [
				["Retrigger", { "type": "Retrigger", "v": {} }],
				["Gate",	  { "type": "Gate",	  "v": {} }],
				["Flanger",   { "type": "Flanger",   "v": {} }],
				["PitchShift",{ "type": "PitchShift","v": {} }],
				["BitCrusher",{ "type": "BitCrusher","v": {} }],
				["Phaser",	{ "type": "Phaser",	"v": {} }],
				["Wobble",	{ "type": "Wobble",	"v": {} }],
				["TapeStop",  { "type": "TapeStop",  "v": {} }],
				["Echo",	  { "type": "Echo",	  "v": {} }],
				["SideChain", { "type": "SideChain", "v": {} }]
			]
		}
	};

	// テキストからユーザー定義を読み込んで追加
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith("#define_fx")) {
			let line = lines[i].replace(/\s{2,}/g, " ").trim(); // 2個以上の空白を1個に
			const parts = line.split(" ");
			const name = parts[1];

			const paramText = line.substring(line.indexOf(name) + name.length).replace(/\s+/g, ""); // name以降
			const definitions = paramText.split(";");

			let type = "";
			let v = {};

			for (let j = 0; j < definitions.length; j++) {
				if (definitions[j].trim() === "") continue; // 空なら無視
				const [key, value] = definitions[j].split("=");
				if (key === "type") {
					type = value;
				} else if (key && value !== undefined) {
					v[key] = value;
				}
			}

			const newEffect = [
				name,
				{
					"type": type,
					"v": v
				}
			];

			audio_effect.fx.def.push(newEffect);
		}
	}

	console.log(audio_effect);
	return audio_effect;
}


function getProcessingText(meta, effect, mix0, notes) { // 入力を組み合わせる
	let processingText = "";
	if (meta !== "") {
		processingText += meta + "\r\n";
	}
	if (effect !== "") {
		processingText += effect + "\r\n";
	}
	if (mix0 !== "") {
		processingText += mix0 + "\r\n";
	}
	processingText += notes + "\r\n";
	return processingText;
}

function getFxOrder(fx_text) { // エディターの指示を取得する
	const fx_side = fx_text.charAt(3);
	const splitText = fx_text.slice(5).split(";");
	const fx_name = splitText[0] ?? "";
	const editorValue = [splitText[1] ?? undefined, splitText[2] ?? undefined];
	return [fx_side, fx_name, editorValue];
}

function getTypeValue(currentDef) { // typeを取得する
	if (currentDef[1].type !== undefined) {
		return currentDef[1].type;
	} else {
		throw new Error("エフェクト定義にtypeが存在しません");
	}
}

function getDefValue(key, currentDef) {
    const fxType = currentDef[1].type; // ② typeを取得
    const fxName = currentDef[0];

    // currentDef.v から取得を試みる
    let defValue = currentDef[1].v[key];
    if (defValue !== undefined) return defValue;

    // type（= fxType）を名前とみなして defaultDefinition を探す
    const defaultEntry = defaultDefinition.def.find(entry => entry[0] === fxType);
    if (!defaultEntry) {
        throw new Error(`defaultDefinitionにtype '${fxType}' (エフェクト名 '${fxName}') が見つかりません`);
    }

    // defaultEntry[1].v からkeyを取得
    defValue = defaultEntry[1].v[key];
    if (defValue === undefined) {
        throw new Error(`defaultDefinitionのtype '${fxType}' (エフェクト名 '${fxName}') にkey '${key}' が存在しません`);
    }

    return defValue;
}





function makeMix(fx_name, currentDef, mixScale) { // mixパラメータを整形する
	let mix = getDefValue("mix", currentDef);
	let order = `filter:AtLsr_${fx_name}:mix=`;
	mix = mix.slice(mix.indexOf(">") + 1); // >があればそれ以降を使用
	mix = mix.slice(mix.indexOf("-") + 1); // -があればそれ以降を使用

	let mixValue = parseInt(mix);
	switch (mixScale) {
		case "userDefinition":
			order += mix;
			break;
		case "weaken":
			if (isNaN(mixValue)) {
				console.warn("mixが数値ではありません");
				return order;
			}
			mixValue = Math.round(mixValue * 2 / 3);
			order += `${mixValue}%`;
			break;
		case "slightly":
			mixValue = Math.round(mixValue * 1 / 3);
			order += `${mixValue}%`;
			break;
		case "hundred":
			mixValue = 100;
			order += `${mixValue}%`;
			break;
		default:
			console.log("不明なmixScale");
			break;
	}
	
	return order;
}

function makeRatio(fx_name, currentDef, mixScale) { // ratioパラメータを整形する
	let ratio = getDefValue("ratio", currentDef);
	let order = `filter:AtLsr_${fx_name}:ratio=1>`;
	ratio = ratio.slice(ratio.indexOf(">") + 1); // >があればそれ以降を使用
	ratio = ratio.slice(ratio.indexOf("-") + 1); // -があればそれ以降を使用


	let ratioValue = parseInt(ratio);
	switch (mixScale) {
		case "userDefinition":
			order += ratio;
			break;
		case "weaken":
			if (isNaN(ratioValue)) {
				console.warn("ratioが数値ではありません");
				return order;
			}
			ratioValue = Math.round(ratioValue * 2 / 3);
			order += `${ratioValue}`;
			break;
		case "slightly":
			if (isNaN(ratioValue)) {
				console.warn("ratioが数値ではありません");
				return order;
			}
			ratioValue = Math.round(ratioValue * 1 / 3);
			order += `${ratioValue}`;
			break;
		case "hundred":
			ratioValue = Math.min(50, Math.round(ratioValue * 3.33)); // 100%の代わりに3.33倍強い圧縮
			order += `${ratioValue}`;
			break;
		default:
			console.log("不明なmixScale (ratio用)");
			break;
	}
	return order;
}

function makeUpdateTrigger(fx_name, fx_side, headTrigger) { // updateTriggerの設定
	switch (headTrigger) {
		case "always":
			return `filter:AtLsr_${fx_name}:updateTrigger=on\r\n`;
		case "left":
			if (fx_side === "l") {
				return `filter:AtLsr_${fx_name}:updateTrigger=on\r\n`;
			} else {
				return "";
			}
		case "never":
			return "";
		default:
			console.log("不明なheadTrigger");
			return "";
	}
}

function makeWaveLength(fx_name, currentDef, editorValue, valuePriority) { // waveLengthパラメータを生成する
	let lengthDef = getDefValue("waveLength", currentDef);
	lengthDef = lengthDef.slice(lengthDef.indexOf(">") + 1); // >以降を使用
	if (lengthDef.includes("-")) {
		// 範囲指定は上書きしない
		return "";
	}
	switch (valuePriority) {
		case "editor":
			lengthDef = `1/${editorValue[0]}`;
			return `filter:AtLsr_${fx_name}:waveLength=${lengthDef}\r\n`;
		case "uneditable":
			if (lengthDef.includes("s")) {
				// s,msは上書きしない
				return "";
			} else if (lengthDef.includes("/")) {
				// 分数表記ならeditor準拠で上書き
				lengthDef = `1/${editorValue[0]}`;
				return `filter:AtLsr_${fx_name}:waveLength=${Math.round(length_ms)}ms\r\n`;
			} else {
				// 整数、小数は上書きしない
				return "";
			}
			break;
		case "userDefinition":
			// 上書きしない
			return "";
			break;
		default:
			console.log("不明なvaluePriority");
			break;
	}
}

function makeRate(fx_name, key, currentDef) {
	let rateDef = getDefValue(key, currentDef);
	rateDef = rateDef.slice(rateDef.indexOf(">") + 1); // > があればそれ以降を使用

	if (rateDef.includes("-")) {
		return "";
	}

	let rate = parseInt(rateDef);
	if (isNaN(rate) || rate < 0 || rate > 100) {
		console.warn("rateDefは0〜100%の範囲である必要があります");
		return null;  // 無効な値は処理を終了
	}

	// rateを0~1のスケールに変換
	let rateNormalized = rate / 100;

	// multiplierが0の場合の特別処理
	if (multiplier === 0) {
		return `filter:AtLsr_${fx_name}:${key}=${rate}%\r\n`;
	}

	// multiplierが有効な値であることを確認
	if (isNaN(multiplier) || multiplier === Infinity || multiplier === -Infinity) {
		console.warn("無効なmultiplierが渡されました");
		return null;
	}

	// rate_homeとrate_farの計算（0〜1スケールで計算後、結果を100倍して戻す）
	let rate_home = Math.round(100 * (1 - (1 - (rateNormalized ** multiplier)) ** (1 / multiplier)));
	let rate_far = Math.round(100 * (1 - ((1 - rateNormalized) ** multiplier)) ** (1 / multiplier));

	// NaNになっていないか確認
	if (isNaN(rate_home) || isNaN(rate_far)) {
		console.warn("rate_home または rate_far がNaNになりました", rate, multiplier);
		return null; // 計算結果が無効なら処理を終了
	}

	return `filter:AtLsr_${fx_name}:${key}=${rate_home}%-${rate_far}%\r\n`;
}

function makeSamples(fx_name, key, currentDef, multiplier) { // samplesパラメータを生成する
	let samplesDef = getDefValue(key, currentDef);
	samplesDef = samplesDef.slice(samplesDef.indexOf(">") + 1); // >があればそれ以降を使用

	if (samplesDef.includes("-")) {
		return `filter:AtLsr_${fx_name}:${key}=${samplesDef}\r\n`;
	}

	let samples = parseInt(samplesDef);
	if (isNaN(samples) || samples < 0) {
		console.warn("samplesDefは正の整数である必要があります");
		return null;
	}

	if (multiplier < 0) {
		console.warn("multiplierはゼロ以上の数である必要があります");
		return null;
	}

	if (multiplier === 0) {
		return `filter:AtLsr_${fx_name}:${key}=${samples}samples\r\n`;
	} else {
		const samples_home = Math.round(samples / multiplier);
		const samples_far = Math.round(samples * multiplier);
		return `filter:AtLsr_${fx_name}:${key}=${samples_home}samples-${samples_far}samples\r\n`;
	}
}

function makeFreq(fx_name, key, currentDef, multiplier) { // frequency(Hz)パラメータを生成する
	let freqDef = getDefValue(key, currentDef);
	freqDef = freqDef.slice(freqDef.indexOf(">") + 1); // >があればそれ以降を使用

	if (freqDef.includes("-")) {
		return `filter:AtLsr_${fx_name}:${key}=${freqDef}\r\n`;
	}

	let freq = parseFloat(freqDef);
	if (isNaN(freq) || freq < 0) {
		console.warn("freqDefは正の数である必要があります");
		return null;
	}

	if (multiplier < 0) {
		console.warn("multiplierはゼロ以上の数である必要があります");
		return null;
	}

	if (multiplier === 0) {
		return `filter:AtLsr_${fx_name}:${key}=${freq}Hz\r\n`;
	} else {
		const freq_home = Math.round(freq / multiplier);
		const freq_far = Math.round(freq * multiplier);
		return `filter:AtLsr_${fx_name}:${key}=${freq_home}Hz-${freq_far}Hz\r\n`;
	}
}

function makeLength(fx_name, key, currentDef, multiplier) {
	let lengthDef = getDefValue(key, currentDef);
	lengthDef = lengthDef.slice(lengthDef.indexOf(">") + 1); // >以降を使用

	// すでに範囲指定がされている場合は、そのまま返す
	if (lengthDef.includes("-")) {
		return `filter:AtLsr_${fx_name}:${key}=${lengthDef}\r\n`;
	}

	// ここから単一値処理
	if (lengthDef.includes("/")) {
		if (multiplier === 0) {
			return `filter:AtLsr_${fx_name}:${key}=${lengthDef}\r\n`;
		} else {
			const denom = parseInt(lengthDef.split("/")[1]);
	
			const denom_home = Math.round(denom * (multiplier ** 0.5));
			const denom_far = Math.round(denom / multiplier);
	
			return `filter:AtLsr_${fx_name}:${key}=1/${denom_home}-1/${denom_far}\r\n`;
		}
	} else if (lengthDef.includes("s")) {
		let length_ms;
	
		if (lengthDef.includes("ms")) {
			length_ms = parseFloat(lengthDef);
		} else {
			length_ms = parseFloat(lengthDef) * 1000;
		}
		
		if (isNaN(length_ms)) {
			console.warn("length_msが数値として解釈できません:", lengthDef);
			return null;
		}
	
		if (multiplier === 0) {
			return `filter:AtLsr_${fx_name}:${key}=${Math.round(length_ms)}ms\r\n`;
		} else {
			const length_home = Math.round(length_ms / multiplier);
			const length_far = Math.round(length_ms * multiplier);
			return `filter:AtLsr_${fx_name}:${key}=${length_home}ms-${length_far}ms\r\n`;
		}
	} else {
		// 整数・小数の場合
		const value = parseFloat(lengthDef);
		if (isNaN(value)) {
			console.warn("数値形式が正しくありません:", lengthDef);
			return null;
		}
		if (multiplier === 0) {
			return `filter:AtLsr_${fx_name}:${key}=${value}\r\n`;
		}
		const value_home = (value / multiplier).toFixed(3).replace(/\.?0+$/, "");
		const value_far = (value * multiplier).toFixed(3).replace(/\.?0+$/, "");
		return `filter:AtLsr_${fx_name}:${key}=${value_home}-${value_far}\r\n`;
	}
}

function makeFloat(fx_name, key, currentDef, multiplier, range) {
	let floatDef = getDefValue(key, currentDef);
	floatDef = floatDef.slice(floatDef.indexOf(">") + 1); // >があればその後ろを使用

	if (floatDef.includes("-")) {
		return `filter:AtLsr_${fx_name}:${key}=${floatDef}\r\n`; // 既に範囲指定ならそのまま
	}

	let value = parseFloat(floatDef);

	if (multiplier === 0) {
		return `filter:AtLsr_${fx_name}:${key}=${Math.max(value, 0.001).toFixed(3)}\r\n`;
	}

	const min = range[0];
	const max = range[1];
	const rangeWidth = max - min;

	// 正規化して0～1にする
	let normalized = (value - min) / rangeWidth;

	multiplier = 0 - multiplier;

	// rangeを考慮して再計算
	let value_home = min + (1 - ((1 - normalized) ** multiplier)) * rangeWidth;
	let value_far  = min + ((normalized ** multiplier)) * rangeWidth;

	value_home = Math.max(value_home, 0.001).toFixed(3);
	value_far  = Math.max(value_far, 0.001).toFixed(3);

	return `filter:AtLsr_${fx_name}:${key}=${value_home}-${value_far}\r\n`;
}

function makeFeedbackLevel(fx_name, currentDef, editorValue, valuePriority, multiplier) {
	let feedbackDef = getDefValue("feedbackLevel", currentDef);
	feedbackDef = feedbackDef.slice(feedbackDef.indexOf(">") + 1);
	if (feedbackDef.includes("-")) {
		// 範囲指定はそのまま
		return "";
	}

	let feedbackValue;
	switch (valuePriority) {
		case "editor":
			feedbackValue = parseFloat(editorValue[1]);
			break;

		case "uneditable":
			if (feedbackDef.includes("-")) {
				// 範囲指定はそのまま
				return "";
			} else {
				// editor定義値を記入
				return `filter:AtLsr_${fx_name}:feedbackLevel=${feedbackDef}\r\n`;
			}
			break;

		case "userDefinition":
				// 範囲指定はそのまま
				return "";
			break;

		default:
			console.warn("不明なvaluePriority (makeFeedbackLevel)");
			return "";
	}
}

function makePitch(fx_name, currentDef, editorValue, valuePriority, multiplier) {
	let pitchDef = getDefValue("pitch", currentDef);
	pitchDef = pitchDef.slice(pitchDef.indexOf(">") + 1);
	if (pitchDef.includes("-")) {
		// 範囲指定はそのまま
		return "";
	}

	let pitchValue;
	switch (valuePriority) {
		case "editor":
			pitchValue = parseFloat(editorValue[1]);
			break;

		case "uneditable":
			if (pitchDef.includes("-")) {
				// 範囲指定はそのまま
				return "";
			} else {
				// editor定義値を記入
				return `filter:AtLsr_${fx_name}:pitch=${pitchDef}\r\n`;
			}
			break;

		case "userDefinition":
				// 範囲指定はそのまま
				return "";
			break;

		default:
			console.warn("不明なvaluePriority (makeFeedbackLevel)");
			return "";
	}
}

function makeReduction(fx_name, currentDef, editorValue, valuePriority, multiplier) {
	let reductionDef = getDefValue("reduction", currentDef);
	reductionDef = reductionDef.slice(reductionDef.indexOf(">") + 1);
	if (reductionDef.includes("-")) {
		// 範囲指定はそのまま
		return "";
	}
	
	let reductionValue = 0;
	switch (valuePriority) {
		case "editor":
			reductionValue = parseFloat(editorValue[1]);
			return `filter:AtLsr_${fx_name}:reduction=${reductionValue}samples\r\n`;
			break;

		case "uneditable":
			if (reductionDef.includes("-")) {
				// 範囲指定はそのまま
				return "";
			} else {
				// editor定義値を記入
				reductionValue = parseFloat(editorValue[1]);
				return `filter:AtLsr_${fx_name}:reduction=${reductionValue}samples\r\n`;
			}
			break;

		case "userDefinition":
				// 範囲指定はそのまま
				return "";
			break;

		default:
			console.warn("不明なvaluePriority (makeFeedbackLevel)");
			return "";
	}
}

function makeSpeed(fx_name, currentDef, editorValue, valuePriority, multiplier) {
	let speedDef = getDefValue("speed", currentDef);
	speedDef = speedDef.slice(speedDef.indexOf(">") + 1);
	if (speedDef.includes("-")) {
		// 範囲指定はそのまま
		return "";
	}
	
	let speedValue = 0;
	switch (valuePriority) {
		case "editor":
			speedValue = parseFloat(editorValue[1]);
			return `filter:AtLsr_${fx_name}:speed=${speedValue}%\r\n`;
			break;

		case "uneditable":
			if (speedDef.includes("-")) {
				// 範囲指定はそのまま
				return "";
			} else {
				// editor定義値を記入
				speedValue = parseFloat(editorValue[1]);
				return `filter:AtLsr_${fx_name}:speed=${speedValue}%\r\n`;
			}
			break;

		case "userDefinition":
				// 範囲指定はそのまま
				return "";
			break;

		default:
			console.warn("不明なvaluePriority (makeSpeed)");
			return "";
	}
}








function buildRetrigger(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) { // Retrigger系エフェクトの組み立て
	let tempOrder = "";
	tempOrder += makeWaveLength(fx_name, currentDef, editorValue, valuePriority);
	tempOrder += makeUpdateTrigger(fx_name, fx_side, headTrigger);
	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildGate(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) { // Gate系エフェクトの組み立て
	let tempOrder = "";
	tempOrder += makeWaveLength(fx_name, currentDef, editorValue, valuePriority);
	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildFlanger(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) { // Flanger系エフェクトの組み立て
	let tempOrder = "";
	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildPitchShift(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";
	tempOrder += makePitch(fx_name, currentDef, editorValue, valuePriority, 0);
	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildBitCrusher(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";
	tempOrder += makeReduction(fx_name, currentDef, editorValue, valuePriority, 0);
	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildPhaser(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";
	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildWobble(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";
	tempOrder += makeWaveLength(fx_name, currentDef, editorValue, valuePriority);
	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildTapeStop(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";
	// trigger固定
	tempOrder += `filter:AtLsr_${fx_name}:trigger=on\r\n`;
	tempOrder += makeSpeed(fx_name, currentDef, editorValue, valuePriority, 0);
	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildEcho(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";
	// まず updateTrigger
	tempOrder += makeUpdateTrigger(fx_name, fx_side, headTrigger);
	// waveLength
	tempOrder += makeWaveLength(fx_name, currentDef, editorValue, valuePriority);
	// feedbackLevel（linerValueを反映して取得）
	tempOrder += makeFeedbackLevel(fx_name, currentDef, editorValue, valuePriority, linerValue);
	// mix
	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildSideChain(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";
	// ratio
	tempOrder += makeRatio(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}




function getTempOrder(fx_side, fx_name, editorValue, audio_effect, headTrigger, valuePriority, mixScaleMap, linerValueMap) {
    let currentDef = audio_effect.fx.def.find(entry => entry[0] === fx_name);
    if (!currentDef) {
        console.log(`${fx_name} は定義されていません`);
        return "";
    }

    const fxType = getTypeValue(currentDef);
	const linerValue = linerValueMap[fxType] || "userDefinition";
	const mixScale = mixScaleMap[fxType] || "userDefinition";
    let tempOrder = "";

    switch (fxType) {
        case "Retrigger":
            tempOrder = buildRetrigger(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "Gate":
            tempOrder = buildGate(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "Flanger":
            tempOrder = buildFlanger(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "PitchShift":
            tempOrder = buildPitchShift(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "BitCrusher":
            tempOrder = buildBitCrusher(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "Phaser":
            tempOrder = buildPhaser(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "Wobble":
            tempOrder = buildWobble(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "TapeStop":
            tempOrder = buildTapeStop(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "Echo":
            tempOrder = buildEcho(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "SideChain":
            tempOrder = buildSideChain(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
            break;
        case "SwitchAudio":
            console.log("SwitchAudioは非対応です");
            tempOrder = "";
            break;
        default:
            console.log(`不明なエフェクトtype: ${fxType}`);
            tempOrder = "";
            break;
    }

    return tempOrder;
}

function getMix0(fx_name, audio_effect) {
    let currentDef = audio_effect.fx.def.find(entry => entry[0] === fx_name);
    if (!currentDef) {
        console.log(`${fx_name} は定義されていません`);
        return "";
    }
    const fxType = getTypeValue(currentDef);
    let mix0 = "";
	if (fxType === "SideChain") {
		// SideChainはmixではなくratioで指定する
		return `filter:AtLsr_${fx_name}:ratio=1\r\n`
	} else {
		// mix=0%
		return `filter:AtLsr_${fx_name}:mix=0%\r\n`
	}
}

function removeElement(array, name) {
	let newArray = [];
	array.forEach(a => {
		if (a !== name) {
			newArray.push(a);
		}
	});
	return newArray;
}

function getMissingDefinitions(defineLines, currentEffectList) {
    let processingText_laser = "";

    currentEffectList.forEach(a => {
        switch (a) {
            case "Retrigger":
            case "Gate":
            case "Flanger":
            case "PitchShift":
            case "BitCrusher":
            case "Phaser":
            case "Wobble":
            case "TapeStop":
            case "Echo":
            case "SideChain":
            case "SwitchAudio":
                processingText_laser += `#define_filter AtLsr_${a} type=${a}\r\n`;
                break;

            default:
                let paramText = "";
                defineLines.forEach(b => {
                    b = b.replace(/\s{2,}/g, " ").trim();
                    const parts = b.split(" ");
					if (parts[0] === "#define_fx") {
						const name = parts[1];
						if (name === a) {
							paramText = b.substring(b.indexOf(name) + name.length).replace(/\s+/g, "");
						}
					}
                });
                processingText_laser += `#define_filter AtLsr_${a} ${paramText}\r\n`;
                break;
        }
    });

    return processingText_laser;
}





function collectLinerValues() {
  const values = {};
  document.querySelectorAll(".linerValueDropdown").forEach(select => {
    const type = select.closest(".liner-selector").dataset.type;
    values[type] = select.value;
  });
  return values;
}

function collectMixScales() {
  const mixScales = {};
  document.querySelectorAll(".mixScaleDropdown").forEach(select => {
    const type = select.closest(".mixscale-selector").dataset.type;
    mixScales[type] = select.value;
  });
  return mixScales;
}



document.getElementById('run-button').addEventListener('click', () => {
	// 入力値を取得
	const startLine = parseInt(document.getElementById('startLine').value, 10);
	const endLine = parseInt(document.getElementById('endLine').value, 10);

	const headTrigger = document.getElementById('headTrigger').value;
	const valuePriority = document.getElementById('valuePriority').value;
	const mixScaleMap = collectMixScales();
	const linerValueMap = collectLinerValues();

	// 初期値を設定
	let measureCount = 0;
	let originalBPM = 200;
	let currentEffectList = [];
	let laserEffectList = [];

	// ファイル名とテキストエリアの内容を取得
	const fileName = document.querySelector('#fileName').textContent;
	if (!fileName) {
		alert('ファイルが選択されていません');
		return;
	}

	// ファイル拡張子を確認
	if (!fileName.endsWith('.ksh')) {
		alert('対応していないファイル形式です。拡張子は .ksh である必要があります。');
		return;
	}

	const kshText = document.getElementById("textArea").value;
	const lines = kshText.split(/\r?\n/);
	const audio_effect = getUserFxEffects(lines);

	let newText = "";
	let processingText_meta = "";   // beat=などの重要な情報を格納
	let processingText_effect = ""; // Laserエフェクトの開始命令を格納
	let processingText_mix0 = "";   // mix=0でエフェクトを切る命令を格納
	let processingText = "";        // 書き込むテキストを格納。通常はノーツを書くことになってから作る
	let fxL = "";                   // fxLの現在のエフェクトを格納
	let fxR = "";                   // fxRの現在のエフェクトを格納

	// ファイルを1行ずつ編集する
	for (let i = 0; i < lines.length; i++) {
		if (lines[i] === "--") {
			measureCount = measureCount + 1;
		} else {
			// 小節数を数えるだけなのでelseでやることはない
		}

		if (lines[i].startsWith("t=")) {
			originalBPM = parseFloat(lines[i].split("=")[1]);
		} else {
			// BPMを取得するだけなのでelseでやることはない
		}

		if (measureCount === 0) { // ファイル先頭のメタ情報をそのまま転記する
			processingText_meta += lines[i] + "\r\n";
		} 
		else if (startLine <= measureCount && measureCount <= endLine) { // 実行区間内
			if (fxLine.test(lines[i])) { // FxエフェクトをLaser臨時命令に変換する
				// まず、既存のエフェクトを切る必要性を考える
				const [fx_side, fx_name, editorValue] = getFxOrder(lines[i]);
				switch (fx_side) { // 左右のエフェクトの種類を把握し、エフェクトを切る必要性を確認する
					case "l":
						if (fxL === fx_name || fxL === "") {
							// 同じ名前のエフェクトなのでわざわざmix0を書かなくてよい
						} else {
							processingText_mix0 += getMix0(fx_name, audio_effect);
						}
						fxL = fx_name;
						break;
					case "r":
						if (fxR === fx_name || fxR === "") {
							// 同じ名前のエフェクトなのでわざわざmix0を書かなくてよい
							// or そもそもエフェクトが今までなかったので当然mix0は不要
						} else {
							// 臨時命令の終点を作成
							processingText_mix0 += getMix0(fx_name, audio_effect);
						}
						fxR = fx_name;
						break;
					default:
						console.log("不明なfx_side");
						break;
				}
				
				// エフェクトの定義を参照して臨時命令を書く
				if (fx_name === "") {
					// 未定義なら当然何もしない
					processingText_effect += `fx_${fx_side}=\r\n`; //空のFxエフェクトであることを記載
				} else {
					// 変換したエフェクトを覚えておく
					!currentEffectList.includes(fx_name) ? currentEffectList.push(fx_name) : null;
					// 臨時命令の始点を作成
					processingText_effect = getTempOrder(fx_side, fx_name, editorValue, audio_effect, headTrigger, valuePriority, mixScaleMap, linerValueMap);
					processingText_effect += `fx_${fx_side}=\r\n`; //空のFxエフェクトに変更する
				}
			} else if (notesLine.test(lines[i])) { 
				// ノーツが来たので必要に応じてmix0を生成
				if (lines[i].charAt(5) !== "1" && fxL !== "") {
					processingText_mix0 += getMix0(fxL, audio_effect);
					fxL = "";
				}
				if (lines[i].charAt(6) !== "1" && fxR !== "") {
					processingText_mix0 += getMix0(fxR, audio_effect);
					fxR = "";
				}
				
				// ノーツ情報と直前の挿入物をまとめて加筆する
				processingText = getProcessingText(processingText_meta, processingText_effect, processingText_mix0, lines[i]);
				newText += processingText;

				// 書き終わったら変数をリセット
				processingText_meta = "";
				processingText_effect = "";
				processingText_mix0 = "";
				processingText = "";
			} else { // その他の内容は初めにメタ情報類として記載
				processingText_meta += lines[i] + "\r\n";
			}
		} 
		else {
			// 実行範囲外でも小節は数えるし、bpmは取得する
			if (lines[i] === "--") {
				measureCount = measureCount + 1;
			} else {
				// 小節数を数えるだけなのでelseでやることはない
			}
	
			if (lines[i].startsWith("t=")) {
				originalBPM = parseFloat(lines[i].split("=")[1]);
			} else {
				// BPMを取得するだけなのでelseでやることはない
			}
			
			if (notesLine.test(lines[i])) { // ノーツが来たので必要に応じてmix0を生成
				// ノーツが来たので必要に応じてmix0を生成
				if (lines[i].charAt[5] !== "1" && fxL !== "") {
					processingText_mix0 += getMix0(fxL, audio_effect);
					fxL = "";
				}
				if (lines[i].charAt[6] !== "1" && fxR !== "") {
					processingText_mix0 += getMix0(fxR, audio_effect);
					fxR = "";
				}
				
				// ノーツ情報と直前の挿入物をまとめて加筆する
				processingText = getProcessingText(processingText_meta, processingText_effect, processingText_mix0, lines[i]);
				newText += processingText;

				// 書き終わったら変数をリセット
				processingText_meta = "";
				processingText_effect = "";
				processingText_mix0 = "";
				processingText = "";
			} else { // その他の内容は、fxエフェクトの命令を含めて初めにメタ情報類として記載
				processingText_meta += lines[i] + "\r\n";
			}
		}
	}
	
	// 最後の行まで終わったなら、processingText_metaに末尾のユーザー定義エフェクト類が残ってるはず
	newText += processingText_meta;
	// 追加する必要があるレーザーエフェクトを確認し、定義を加筆する
	
	let defineLines = processingText_meta.split("\r\n");
	
	//processingText_metaから定義済みlaserエフェクトを取得し、currentEffectListから削除する
	defineLines.forEach(a => {
		defineLine = a.replace(/\s{2,}/g, " ").trim(); // 2個以上の空白を1個に
			const parts = defineLine.split(" ");
			if (parts[0] === "#define_filter") {
				const name = parts[1];
				if (name.startsWith("AtLsr_")) { //1312行目はここ
					const originalName = name.substring(6);
					currentEffectList = removeElement(currentEffectList, originalName);
				}
			}
	})
	newText += getMissingDefinitions(defineLines, currentEffectList);
	
	// 空白の行を削除
	newText = newText.split(/\r?\n/).filter(line => line.trim() !== "").join("\r\n");

	// ダウンロード用のファイル作成
	const blob = new Blob([bom + newText], { type: 'text/plain; charset=utf-8' }); // UTF-8を指定
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName.replace('.ksh', '-AtLsr.ksh'); // ファイル名を変更
	a.click();
	URL.revokeObjectURL(url);
});
