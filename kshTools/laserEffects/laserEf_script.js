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
	//"userDefinition": ユーザー定義値をそのまま使う, "weaken": mixはユーザー定義値の60%に弱める, "liner": mixを「0<0-定義値」にする,
let linerValue = "userDefinition"; //0<100を0<0-100にするみたいな加工を勝手にやる機能
	//"userDefinition": ユーザー定義値をそのまま使う, "arpus1": おすすめ定義1, "arpus2": おすすめ定義2 

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
	let order = `filter:AtLsr_${fx_name}:mix=0%>`;
	mix = mix.slice(mix.indexOf(">") + 1); // >があればそれ以降を使用

	if (mix.includes("-")) {
		order += mix;
	} else {
		switch (mixScale) {
			case "userDefinition":
				order += mix;
				break;
			case "weaken":
				let mixValue = parseInt(mix);
				if (isNaN(mixValue)) {
					console.warn("mixが数値ではありません");
					return order;
				}
				mixValue = Math.round(mixValue * 0.6);
				order += `${mixValue}%`;
				break;
			case "liner":
				order += `0%-${mix}`;
				break;
			default:
				console.log("不明なmixScale");
				break;
		}
	}
	return order;
}

function makeRatio(fx_name, currentDef, mixScale) { // ratioパラメータを整形する
	let ratio = getDefValue("ratio", currentDef);
	let order = `filter:AtLsr_${fx_name}:ratio=1>`;
	ratio = ratio.slice(ratio.indexOf(">") + 1); // >があればそれ以降を使用

	if (ratio.includes("-")) {
		order += ratio;
	} else {
		switch (mixScale) {
			case "userDefinition":
				order += ratio;
				break;
			case "weaken":
				let ratioValue = parseInt(ratio);
				if (isNaN(ratioValue)) {
					console.warn("ratioが数値ではありません");
					return order;
				}
				ratioValue = Math.round(ratioValue * 0.6);
				order += `${ratioValue}`;
				break;
			case "liner":
				order += `1-${ratio}`;
				break;
			default:
				console.log("不明なmixScale (ratio用)");
				break;
		}
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
	switch (valuePriority) {
		case "editor":
			return `filter:AtLsr_${fx_name}:waveLength=1/${editorValue[0]}\r\n`;
		case "uneditable":
			let waveLength = getDefValue("waveLength", currentDef);
			if (waveLength.includes("s")) {
				return `filter:AtLsr_${fx_name}:waveLength=${waveLength}\r\n`;
			} else {
				return `filter:AtLsr_${fx_name}:waveLength=1/${editorValue[0]}\r\n`;
			}
		case "userDefinition":
			let waveLengthDef = getDefValue("waveLength", currentDef);
			return `filter:AtLsr_${fx_name}:waveLength=${waveLengthDef}\r\n`;
		default:
			console.log("不明なvaluePriority");
			return "";
	}
}

function makeRate(fx_name, key, currentDef, multiplier) {
	let rateDef = getDefValue(key, currentDef);
	rateDef = rateDef.slice(rateDef.indexOf(">") + 1); // > があればそれ以降を使用

	if (rateDef.includes("-")) {
		return `filter:AtLsr_${fx_name}:${key}=${rateDef}\r\n`;
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
	
			const denom_home = Math.round(denominator * multiplier);
			const denom_far = Math.round(denominator / multiplier);
	
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

function makeFeedbackLevel(fx_name, currentDef, editorValue, valuePriority, linerValue) {
	let feedbackDef = getDefValue("feedbackLevel", currentDef);
	feedbackDef = feedbackDef.slice(feedbackDef.indexOf(">") + 1); // ←ここ修正！

	let feedbackValue;
	switch (valuePriority) {
		case "editor":
			feedbackValue = parseFloat(editorValue[1]);
			break;

		case "uneditable":
			if (feedbackDef.includes("-")) {
				// 範囲指定はそのまま
			} else {
				feedbackValue = parseFloat(editorValue[1]);
			}
			break;

		case "userDefinition":
			feedbackValue = parseFloat(feedbackDef);
			break;

		default:
			console.warn("不明なvaluePriority (makeFeedbackLevel)");
			return "";
	}

	if (feedbackDef.includes("-")) {
		// 範囲指定はそのまま
		return `filter:AtLsr_${fx_name}:feedbackLevel=${feedbackDef}\r\n`;
	}

	let multiplier = 1;
	let feedbackNormalized = feedbackValue / 100;

	switch (linerValue) {
		case "userDefinition":
			return `filter:AtLsr_${fx_name}:feedbackLevel=${feedbackValue}%\r\n`;
		case "arpus1":
			multiplier = 0.8;
			break;
		case "arpus2":
			multiplier = 1.125;
			break;
		default:
			console.warn("不明なlinerValue (makeFeedbackLevel)");
			return "";
	}

	let feedback_home = Math.round(100 * (1 - (1 - (feedbackNormalized ** multiplier)) ** (1 / multiplier)));
	let feedback_far = Math.round(100 * (1 - ((1 - feedbackNormalized) ** multiplier)) ** (1 / multiplier));
	return `filter:AtLsr_${fx_name}:feedbackLevel=${feedback_home}%-${feedback_far}%\r\n`;
}



function buildRetrigger(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) { // Retrigger系エフェクトの組み立て
	let tempOrder = "";
	tempOrder += makeUpdateTrigger(fx_name, fx_side, headTrigger);
	tempOrder += makeWaveLength(fx_name, currentDef, editorValue, valuePriority);

	switch (linerValue) {
		case "userDefinition":
			tempOrder += makeRate(fx_name, "rate", currentDef, 0);
			break;
		case "arpus1":
			tempOrder += makeRate(fx_name, "rate", currentDef, 0.8);
			break;
		case "arpus2":
			tempOrder += makeRate(fx_name, "rate", currentDef, 1.25);
			break;
		default:
			console.log("不明なlinerValue");
			break;
	}

	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildGate(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) { // Gate系エフェクトの組み立て
	let tempOrder = "";
	tempOrder += makeWaveLength(fx_name, currentDef, editorValue, valuePriority);

	switch (linerValue) {
		case "userDefinition":
			tempOrder += makeRate(fx_name, "rate", currentDef, 0);
			break;
		case "arpus1":
			tempOrder += makeRate(fx_name, "rate", currentDef, 0.8);
			break;
		case "arpus2":
			tempOrder += makeRate(fx_name, "rate", currentDef, 1.25);
			break;
		default:
			console.log("不明なlinerValue");
			break;
	}

	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildFlanger(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) { // Flanger系エフェクトの組み立て
	let tempOrder = "";

	switch (linerValue) {
		case "userDefinition":
			tempOrder += makeSamples(fx_name, "delay", currentDef, 0);
			tempOrder += makeSamples(fx_name, "depth", currentDef, 0);
			break;
		case "arpus1":
			tempOrder += makeSamples(fx_name, "delay", currentDef, 3.1628);
			tempOrder += makeSamples(fx_name, "depth", currentDef, 0);
			break;
		case "arpus2":
			tempOrder += makeSamples(fx_name, "delay", currentDef, 0);
			tempOrder += makeSamples(fx_name, "depth", currentDef, 3.1628);
			break;
		default:
			console.log("不明なlinerValue");
			break;
	}

	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildPitchShift(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";

	let pitchDef = getDefValue("pitch", currentDef);
	pitchDef = pitchDef.slice(pitchDef.indexOf(">") + 1); // >があればそれ以降を使用

	// まず使うべき値を決める
	switch (valuePriority) {
		case "editor":
			pitchDef = editorValue[0]; // samples単位ではないのでそのまま
			break;
		case "uneditable": {
			const matches = pitchDef.match(/-?\d+(\.\d+)?/g);
			if (matches && matches.length === 2) {
				// 範囲指定があるならそのままreturn
				return `filter:AtLsr_${fx_name}:pitch=${pitchDef}\r\n` + makeMix(fx_name, currentDef, mixScale) + "\r\n";
			} else if (pitchDef.includes(".")) {
				// 小数点がある場合はcurrentDef優先なのでpitchDef変更なし
			} else {
				// それ以外ならeditorValueを使用
				pitchDef = editorValue[0];
			}
			break;
		}
		case "userDefinition":
			// 何も変更しない
			break;
		default:
			console.log("不明なvaluePriority");
			return "";
	}

	let pitchValue = parseFloat(pitchDef);
	if (isNaN(pitchValue)) {
		console.warn("pitchDefが数値として解釈できません:", pitchDef);
		return "";
	}

	// 次に linerValue に応じた加工
	switch (linerValue) {
		case "userDefinition":
			tempOrder += `filter:AtLsr_${fx_name}:pitch=${pitchValue}\r\n`;
			break;
		case "arpus1":
			tempOrder += `filter:AtLsr_${fx_name}:pitch=0-${Math.round(pitchValue)}\r\n`;
			break;
		case "arpus2":
			tempOrder += `filter:AtLsr_${fx_name}:pitch=0.000-${pitchValue.toFixed(3)}\r\n`;
			break;
		default:
			console.log("不明なlinerValue");
			break;
	}

	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";
	return tempOrder;
}

function buildBitCrusher(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let reductionDef = getDefValue("reduction", currentDef);
	reductionDef = reductionDef.slice(reductionDef.indexOf(">") + 1); // >があればそれ以降を使用

	// valuePriorityによるreductionDefの決定
	switch (valuePriority) {
		case "editor":
			reductionDef = `${editorValue[0]}samples`;
			break;
		case "uneditable":
			if (!reductionDef.includes("-")) {
				reductionDef = `${editorValue[0]}samples`;
			} else {
				// currentDefに範囲指定があったならすぐその場でreturn
				return `filter:AtLsr_${fx_name}:reduction=${reductionDef}\r\n` + makeMix(fx_name, currentDef, mixScale) + "\r\n";
			}
			break;
		case "userDefinition":
			// 何もせずcurrentDefそのまま使用
			break;
		default:
			console.log("不明なvaluePriority");
			return "";
	}

	// linerValueによる範囲加工
	switch (linerValue) {
		case "userDefinition":
			// そのまま
			break;
		case "arpus1":
			reductionDef = `0samples-${reductionDef}`;
			break;
		case "arpus2":
			reductionDef = `${reductionDef}-0samples`;
			break;
		default:
			console.log("不明なlinerValue");
			return "";
	}

	// 最後にまとめて返す
	return `filter:AtLsr_${fx_name}:reduction=${reductionDef}\r\n` + makeMix(fx_name, currentDef, mixScale) + "\r\n";
}

function buildPhaser(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";

	switch (linerValue) {
		case "userDefinition":
			tempOrder += makeLength(fx_name, "period", currentDef, 0);
			tempOrder += makeFreq(fx_name, "loFreq", currentDef, 0);
			tempOrder += makeFreq(fx_name, "hiFreq", currentDef, 0);
			tempOrder += makeFloat(fx_name, "Q", currentDef, 0, [0.1, 50]);
			break;
		case "arpus1":
			tempOrder += makeLength(fx_name, "period", currentDef, 0); // 後で倍率を設定
			tempOrder += makeFreq(fx_name, "loFreq", currentDef, 0);
			tempOrder += makeFreq(fx_name, "hiFreq", currentDef, 0);
			tempOrder += makeFloat(fx_name, "Q", currentDef, 1.2, [0.1, 50]);
			break;
		case "arpus2":
			tempOrder += makeLength(fx_name, "period", currentDef, 0); // 後で倍率を設定
			tempOrder += makeFreq(fx_name, "loFreq", currentDef, 5);
			tempOrder += makeFreq(fx_name, "hiFreq", currentDef, 5);
			tempOrder += makeFloat(fx_name, "Q", currentDef, 0, [0.1, 50]);
			break;
		default:
			console.log("不明なlinerValue");
			return "";
	}

	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";

	return tempOrder;
}

function buildWobble(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";

	tempOrder += makeWaveLength(fx_name, currentDef, editorValue, valuePriority);

	switch (linerValue) {
		case "userDefinition":
			tempOrder += makeFreq(fx_name, "loFreq", currentDef, 0);
			tempOrder += makeFreq(fx_name, "hiFreq", currentDef, 0);
			tempOrder += makeFloat(fx_name, "Q", currentDef, 0, [0.1, 50]);
			break;
		case "arpus1":
			tempOrder += makeFreq(fx_name, "loFreq", currentDef, 0);
			tempOrder += makeFreq(fx_name, "hiFreq", currentDef, 0);
			tempOrder += makeFloat(fx_name, "Q", currentDef, 1.2, [0.1, 50]);
			break;
		case "arpus2":
			tempOrder += makeFreq(fx_name, "loFreq", currentDef, 5);
			tempOrder += makeFreq(fx_name, "hiFreq", currentDef, 5);
			tempOrder += makeFloat(fx_name, "Q", currentDef, 0, [0.1, 50]);
			break;
		default:
			console.log("不明なlinerValue");
			return "";
	}

	tempOrder += makeMix(fx_name, currentDef, mixScale) + "\r\n";

	return tempOrder;
}

function buildTapeStop(fx_side, fx_name, currentDef, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
	let tempOrder = "";

	// trigger固定
	tempOrder += `filter:AtLsr_${fx_name}:trigger=on\r\n`;

	let speedDef = getDefValue("speed", currentDef);
	switch (valuePriority) {
		case "editor":
			speedDef = `${editorValue[0]}%`;
			break;

		case "uneditable": {
			if (speedDef.includes("-")) {
				// 範囲指定は上書きしない
			} else {
				speedDef = `${editorValue[0]}%`;
			}
			break;
		}

		case "userDefinition":
				// ユーザー定義値をそのまま使う
			break;

		default:
			console.warn("不明なvaluePriority (TapeStop)");
			return "";
	}
	
	if (speedDef.includes("-")) {
		// speedは範囲指定なのでその場で精製
		tempOrder += `filter:AtLsr_${fx_name}:speed=${speedDef}\r\n`;
	} else {
	let speedValue = parseInt(speedDef);
		
		switch (linerValue) {
			case "userDefinition":
				// そのまま
				tempOrder += `filter:AtLsr_${fx_name}:speed=${speedValue}%\r\n`;
				break;
			case "arpus1":
				speedValue = Math.round(speedValue * 0.15);
				tempOrder += `filter:AtLsr_${fx_name}:speed=0%-${speedValue}%\r\n`;
				break;
			case "arpus2":
				speedValue = Math.round(speedValue * 0.35);
				tempOrder += `filter:AtLsr_${fx_name}:speed=0%-${speedValue}%\r\n`;
				return tempOrder;
			default:
				console.warn("不明なlinerValue (TapeStop)");
				return "";
		}
	}
	// mix
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

	// linerValueに応じた倍率設定
	let linerMultiplier = 0;
	switch (linerValue) {
		case "userDefinition":
			tempOrder += makeLength(fx_name, "holdTime", currentDef, 0);
			tempOrder += makeLength(fx_name, "attackTime", currentDef, 0);
			tempOrder += makeLength(fx_name, "releaseTime", currentDef, 0);
				break;
		case "arpus1":
			tempOrder += makeLength(fx_name, "holdTime", currentDef, 0);
			tempOrder += makeLength(fx_name, "attackTime", currentDef, 1.5);
			tempOrder += makeLength(fx_name, "releaseTime", currentDef, 1.5);
			break;
		case "arpus2":
			tempOrder += makeLength(fx_name, "holdTime", currentDef, 2);
			tempOrder += makeLength(fx_name, "attackTime", currentDef, 0);
			tempOrder += makeLength(fx_name, "releaseTime", currentDef, 0);
			break;
		default:
			console.warn("不明なlinerValue (SideChain)");
			return "";
	}
	
	// ratio
	tempOrder += makeRatio(fx_name, currentDef, mixScale) + "\r\n";

	return tempOrder;
}




function getTempOrder(fx_side, fx_name, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue) {
    let currentDef = audio_effect.fx.def.find(entry => entry[0] === fx_name);
    if (!currentDef) {
        console.log(`${fx_name} は定義されていません`);
        return "";
    }

    const fxType = getTypeValue(currentDef);
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







document.getElementById('run-button').addEventListener('click', () => {
	// 入力値を取得
	const startLine = parseInt(document.getElementById('startLine').value, 10);
	const endLine = parseInt(document.getElementById('endLine').value, 10);

	const headTrigger = document.getElementById('headTrigger').value;
	const valuePriority = document.getElementById('valuePriority').value;
	const mixScale = document.getElementById('mixScale').value;
	const linerValue = document.getElementById('linerValue').value;

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
					processingText_effect = getTempOrder(fx_side, fx_name, editorValue, audio_effect, headTrigger, valuePriority, mixScale, linerValue);
					processingText_effect += `fx_${fx_side}=\r\n`; //空のFxエフェクトに変更する
				}
			} else if (notesLine.test(lines[i])) { 
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
