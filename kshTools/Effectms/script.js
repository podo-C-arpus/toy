// BPM または 長さが変更された時に calc-ms を更新
function updateMsValue() {
    const bpm = parseFloat(document.getElementById("calc-BPM").value);  // BPMの値を取得
    const textLine = document.getElementById("calc-length").value;  // 単位長さの値を取得 ("1/16"など)
    
    // 単位長さを分子と分母に分割
    const numerator = parseInt(textLine.split('/')[0], 10);  // 分子
    const denominator = parseInt(textLine.split('/')[1], 10);  // 分母

    // 計算式: 0.001 * round( 240000000 / bpm * numerator / denominator )
    const ms = 0.001 * Math.round(240000000 / bpm * numerator / denominator);

    // calc-ms に計算結果を代入
    document.getElementById("calc-ms").value = ms;
}

// ページ読み込み時の処理
window.addEventListener("DOMContentLoaded", function() {
    // BPM と Length の入力欄の変更を監視
    document.getElementById("calc-BPM").addEventListener("input", updateMsValue);
    document.getElementById("calc-length").addEventListener("input", updateMsValue);
});

















// EffectTypeの選択に基づいてフォームを更新する関数
function updateForm() {
    const selectedEffectType = document.getElementById("EffectType").value;  // エフェクトの種類の選択
    const parameters = document.querySelectorAll("#Parameter p");  // パラメータ全体を取得

    parameters.forEach(param => {
        const effectType = param.getAttribute('data-effecttype');  // data-effecttype 属性を取得
        if (effectType) {
            const effectTypeList = effectType.split(' ');  // スペースで分割

            // 選択された EffectType に一致するかを確認
            if (effectTypeList.includes('all') || effectTypeList.includes(selectedEffectType)) {
                param.style.display = 'block';  // 一致する場合は表示
            } else {
                param.style.display = 'none';  // 一致しない場合は非表示
                // 非表示にする際に、inputの値をクリア
                const inputs = param.querySelectorAll('input');
                inputs.forEach(input => {
                    input.value = '';  // 入力値をクリア
                });
            }
        } else {
            // data-effecttype 属性が存在しない場合も非表示にし、値をクリア
            param.style.display = 'none';
            const inputs = param.querySelectorAll('input');
            inputs.forEach(input => {
                input.value = '';  // 入力値をクリア
            });
        }
    });
}

// EffectType の変更を監視してフォームを更新
document.getElementById("EffectType").addEventListener("change", updateForm);

// ページ読み込み時にもフォームを更新
window.addEventListener("load", updateForm);









// FxFilterとEffectTypeの初期値を設定するマッピング
const defaultValues = {
    fx: {
        Retrigger: {effectName: 'Re', updatePeriod: '1/2', rate: '70%', waveLength: '', updateTrigger: 'off', mix: '0%>100%'},
		Gate: {effectName: 'Ga', waveLength: '', rate: '60%', mix: '0%>90%'},
		Flanger: {effectName: 'Flan', period: '2.0', delay: '30samples', depth: '45samples', feedback: '60%', stereoWidth: '0%', volume: '75%', mix: '0%>80%'},
		PitchShift: {effectName: 'Pitc', pitch: '0.0-12.0', chunkSize: '700samples', overWrap: '40%', mix: '0%>100%'},
		BitCrusher: {effectName: 'BitC', reduction: '0samples-30samples', mix: '0%>100%'},
		Phaser: {effectName: 'Phas', period: '1/2', stage: '6', loFreq: '1500Hz', hiFreq: '20000Hz', Q: '0.707', feedback: '35%', stereoWidth: '75%', hiCutGain: '-8.0dB', mix: '0%>50%'},
		Wobble: {effectName: 'Wo', waveLength: '1/12', loFreq: '500Hz', hiFreq: '20000Hz', Q: '1.414', mix: '0%>50%'},
		TapeStop: {effectName: 'TStp', speed: '50%', trigger: 'off>on', mix: '0%>100%'},
		Echo: {effectName: 'Ec', updatePeriod: '0', waveLength: '', feedbackLevel: '', mix: '0%>100%'},
		SideChain: {effectName: 'SiCh', period: '1/4', holdTime: '50ms', attackTime: '10ms', releaseTime: '1/16', ratio: '5'},
		SwitchAudio: {effectName: 'Swit', fileName: '.mp3'},
    },
    filter: {
        Retrigger: {effectName: 'RE', updatePeriod: '1/2', rate: '70%', waveLength: '1/8', updateTrigger: 'off', mix: '0%>100%'},
		Gate: {effectName: 'GA', waveLength: '1/8', rate: '60%', mix: '0%>90%'},
		Flanger: {effectName: 'FLAN', period: '2.0', delay: '30samples', depth: '45samples', feedback: '60%', stereoWidth: '0%', volume: '75%', mix: '0%>80%'},
		PitchShift: {effectName: 'PITC', pitch: '0.0-12.0', chunkSize: '700samples', overWrap: '40%', mix: '0%>100%'},
		BitCrusher: {effectName: 'BITC', reduction: '0samples-30samples', mix: '0%>100%'},
		Phaser: {effectName: 'PHAS', period: '1/2', stage: '6', loFreq: '1500Hz', hiFreq: '20000Hz', Q: '0.707', feedback: '35%', stereoWidth: '75%', hiCutGain: '-8.0dB', mix: '0%>50%'},
		Wobble: {effectName: 'WO', waveLength: '1/12', loFreq: '500Hz', hiFreq: '20000Hz', Q: '1.414', mix: '0%>50%'},
		TapeStop: {effectName: 'TSTP', speed: '50%', trigger: 'off>on', mix: '0%>100%'},
		Echo: {effectName: 'EC', updatePeriod: '0', waveLength: '1/4', feedbackLevel: '100%', mix: '0%>100%'},
		SideChain: {effectName: 'SICH', period: '1/4', holdTime: '50ms', attackTime: '10ms', releaseTime: '1/16', ratio: '5'},
		SwitchAudio: {effectName: 'SWIT', fileName: '.mp3'},
    }
};

// FxFilter と EffectType の選択に応じて初期値を設定する関数
function setInitialValue(paramId) {
    const selectedFxFilter = document.getElementById("FxFilter").value;  // FX or LASER の選択
    const selectedEffectType = document.getElementById("EffectType").value;  // エフェクトタイプの選択

    // 該当する初期値をマッピングから取得して代入
    const value = defaultValues[selectedFxFilter]?.[selectedEffectType]?.[paramId];
    if (value !== undefined) {
        document.getElementById(paramId).value = value;
    }
}

// 初期値リセットボタンがクリックされたときの処理
document.querySelectorAll(".reset-button").forEach(button => {
    button.addEventListener("click", function() {
        const paramId = this.getAttribute("data-param");  // ボタンの data-param 属性から対象のIDを取得
        setInitialValue(paramId);
    });
});











// ボタンがクリックされた時に空欄でない入力値を取得して追記する関数
function appendEffectData() {
    let resultText = "";  // 追記するテキスト
    const inputs = document.querySelectorAll("#Parameter input");  // パラメータ内のすべてのinputを取得

    inputs.forEach(input => {
        // inputが表示されていて、空欄でない場合に取得
        if (input.value.trim() !== "" && input.offsetParent !== null) {
            const key = input.id.replace("calc-", "");  // inputのIDから名前を取得
            const value = input.value;  // 入力値を取得
			if (key === 'effectName') {
				const FxFilter = document.getElementById("FxFilter").value;
				const EffectType = document.getElementById("EffectType").value;
				resultText += `#define_${FxFilter} ${value} type=${EffectType};`;
			} else {
				resultText += `${key}=${value};`;  // key=valueの形式で追加
			}
        }
    });

	const resultArea = document.getElementById("result-area");
    // テキストエリア先頭に記入
    if (resultText) {
		if (document.getElementById("effectName").value === ''){
			resultArea.value = `エフェクト名が必要です\r\n${resultArea.value}`;
		} else {
		resultArea.value = `${resultText.slice(0, -1)}\r\n${resultArea.value}`;  // 最後の";"を除去して追記
		}
    } else {
		resultArea.value = `エフェクトが作成されていません\r\n${resultArea.value}`;
	}
}

// ページ読み込み時の処理
window.addEventListener("DOMContentLoaded", function() {
    document.getElementById("add-button").addEventListener("click", appendEffectData);
});





























// Retrigger Gate Flanger PitchShift BitCrusher Phaser Wobble TapeStop Echo



// Retrigger
// Gate
// Flanger
// PitchShift
// BitCrusher
// Phaser
// Wobble
// TapeStop
// Echo
// SideChain
// SwitchAudio



// effectName
// updatePeriod
// waveLength
// rate
// updateTrigger
// period
// stage
// loFreq
// hiFreq
// Q
// delay
// depth
// feedback
// stereoWidth
// volume
// pitch
// chunkSize
// overWrap
// reduction=<in
// hiCutGain=<in
// speed=<input 
// trigger=<inpu
// feedbackLevel
// holdTime=<inp
// attackTime=<i
// releaseTime=<
// ratio=<input 
// mix=<input id
// fileName=<inp