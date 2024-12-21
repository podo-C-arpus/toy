const fxLine = /^fx-[lr]=[\s\S]*$/;
const notesLine = /^[0-2]{4}\|[0-2]{2}\|[\s\S]*$/;
const fx_Re = /^fx-[lr]=Retrigger;\d+$/;
const fx_Ga = /^fx-[lr]=Gate;\d+$/;
const fx_Fl = /^fx-[lr]=Flanger$/;
const fx_Ph = /^fx-[lr]=Phaser$/;
const fx_Wo = /^fx-[lr]=Wobble;\d+$/;
const fx_Ec = /^fx-[lr]=Echo;\d+;\d+$/;
const bom = '\uFEFF';
let msLength = 0;
let editorValue = 4;
let editorValueFeedback = 60;


document.getElementById('run-button').addEventListener('click', () => {
	// 入力値を取得
	const startLine = parseInt(document.getElementById('startLine').value, 10);
	const endLine = parseInt(document.getElementById('endLine').value, 10);
	
	// 初期値を設定
	let defineRe = false;
	let defineGa = false;
	let defineFl = false;
	let definePh = false;
	let defineWo = false;
	let defineEc = false;
	let line = 0;
	let originalBPM = 200;
	let fxL = 'Dry';
	let fxR = 'Dry';

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

	const text = document.getElementById('textArea').value;
	const lines = text.split('\n');
	let newText = '';

// ファイルを1行ずつ編集する
	lines.forEach((textLine) => {
		if (textLine === '--') {
		// 小節線
			newText += textLine + '\r\n'; // そのまま転記
			line += 1;

		} else if (textLine.startsWith('t=')) {
		// t=の行
			modify = true; // 変更すべきことを記憶
			originalBPM = parseFloat(textLine.split('=')[1]);
			newText += textLine + '\r\n'; // そのまま転記
		} else if (fxLine.test(textLine)) {
		//fxエフェクトを取得、始点を書き込む
			if (line >= startLine && line <= endLine) {
				// 適用範囲内
				if (textLine.startsWith('fx-l')) {
					if (fxL !== 'Dry') {
						//FXエフェクト切り替わりの可能性を考慮して古いエフェクトを切る
						newText += `ms${fxL}MnCn:mix=0%\r\n`;
					} else {
						//何もしない
					}
					if (fx_Re.test(textLine)) {
						editorValue = parseInt(textLine.split(';')[1]);
						fxL = 'Re';
						msLength = Math.round(1000 * 60 * 4 / originalBPM / editorValue);
						newText += `fx-l=\r\nfx:msReMnCn:updateTrigger=on\r\nfx:msReMnCn:waveLength=${msLength}ms\r\nfx:msReMnCn:mix=100%\r\n`;
					} else if (fx_Ga.test(textLine)) {
						fxL = 'Ga';
						editorValue = parseInt(textLine.split(';')[1]);
						msLength = Math.round(1000 * 60 * 4 / originalBPM / editorValue);
						newText += `fx-l=\r\nfx:msGaMnCn:waveLength=${msLength}ms\r\nfx:msGaMnCn:mix=90%\r\n`;
					} else if (fx_Fl.test(textLine)) {
						fxL = 'Dry'; // mixは臨時命令しないためDryとして扱う
						msLength = Math.round(1000 * 60 * 4 / originalBPM / 0.5);
						newText += `fx-l=msFlMnCn\r\nfx:msFlMnCn:period=${msLength}ms\r\n`;
					} else if (fx_Ph.test(textLine)) {
						fxL = 'Dry'; // mixは臨時命令しないためDryとして扱う
						msLength = Math.round(1000 * 60 * 4 / originalBPM / 2);
						newText += `fx-l=msPhMnCn\r\nfx:msPhMnCn:period=${msLength}ms\r\n`;
					} else if (fx_Wo.test(textLine)) {
						fxL = 'Wo';
						editorValue = parseInt(textLine.split(';')[1]);
						msLength = Math.round(1000 * 60 * 4 / originalBPM / editorValue);
						newText += `\r\nfx:msWoMnCn:waveLength=${msLength}ms\r\nfx:msWoMnCn:mix=50%\r\n`;
					} else if (fx_Ec.test(textLine)) {
						fxL = 'Ec';
						editorValue = parseInt(textLine.split(';')[1]);
						editorValueFeedback = parseInt(textLine.split(';')[2]);
						msLength = Math.round(1000 * 60 * 4 / originalBPM / editorValue);
						newText += `\r\nfx:msEcMnCn:waveLength=${msLength}ms\r\nfx:msEcMnCn:feedbackLevel=${editorValueFeedback}%\r\nfx:msEcMnCn:mix=100%\r\n`;
					} else {
						newText += textLine + '\r\n'; // そのまま転記
					}
				} else if (textLine.startsWith('fx-r')) {
					if (fxR !== 'Dry') {
						//FXエフェクト切り替わりの可能性を考慮して古いエフェクトを切る
						newText += `ms${fxR}MnCn:mix=0%\r\n`;
					} else {
						//何もしない
					}
					if (fx_Re.test(textLine)) {
						fxR = 'Re';
						editorValue = parseInt(textLine.split(';')[1]);
						msLength = Math.round(1000 * 60 * 4 / originalBPM / editorValue);
						newText += `fx-r=\r\nfx:msReMnCn:updateTrigger=on\r\nfx:msReMnCn:waveLength=${msLength}ms\r\nfx:msReMnCn:mix=100%\r\n`;
					} else if (fx_Ga.test(textLine)) {
						fxR = 'Ga';
						editorValue = parseInt(textLine.split(';')[1]);
						msLength = Math.round(1000 * 60 * 4 / originalBPM / editorValue);
						newText += `fx-r=\r\nfx:msGaMnCn:waveLength=${msLength}ms\r\nfx:msGaMnCn:mix=90%\r\n`;
					} else if (fx_Fl.test(textLine)) {
						fxR = 'Dry'; // mixは臨時命令しないためDryとして扱う
						msLength = Math.round(1000 * 60 * 4 / originalBPM / 0.5);
						newText += `fx-r=msFlMnCn\r\nfx:msFlMnCn:period=${msLength}ms\r\n`;
					} else if (fx_Ph.test(textLine)) {
						fxR = 'Dry'; // mixは臨時命令しないためDryとして扱う
						msLength = Math.round(1000 * 60 * 4 / originalBPM / 2);
						newText += `fx-r=msPhMnCn\r\nfx:msPhMnCn:period=${msLength}ms\r\n`;
					} else if (fx_Wo.test(textLine)) {
						fxR = 'Wo';
						editorValue = parseInt(textLine.split(';')[1]);
						msLength = Math.round(1000 * 60 * 4 / originalBPM / editorValue);
						newText += `fx-r=\r\nfx:msWoMnCn:waveLength=${msLength}ms\r\nfx:msWoMnCn:mix=50%\r\n`;
					} else if (fx_Ec.test(textLine)) {
						fxR = 'Ec';
						editorValue = parseInt(textLine.split(';')[1]);
						editorValueFeedback = parseInt(textLine.split(';')[2]);
						msLength = Math.round(1000 * 60 * 4 / originalBPM / editorValue);
						newText += `fx-r=\r\nfx:msEcMnCn:waveLength=${msLength}ms\r\nfx:msEcMnCn:feedbackLevel=${editorValueFeedback}%\r\nfx:msEcMnCn:mix=100%\r\n`;
					} else {
						newText += textLine + '\r\n'; // そのまま転記
					}
				} else {
					//何もしない
				}
			} else {
				// 適用範囲外
				newText += textLine + '\r\n'; // そのまま転記
			}
		} else if (notesLine.test(textLine)) {
			if (fxL !== 'Dry' && textLine[5] !== '1') {
				//fx_Lの終点
				newText += `fx:ms${fxL}MnCn:mix=0%\r\n`;
				fxL = 'Dry';
			} else if (fxR !== 'Dry' && textLine[6] !== '1') {
				//fx_Rの終点
				newText += `fx:ms${fxR}MnCn:mix=0%\r\n`;
				fxR = 'Dry';
			} else {
				//何もしない
			}
			newText += textLine + '\r\n'; // そのまま転記
		} else {
			newText += textLine + '\r\n'; // そのまま転記
			if (textLine.startsWith('#define_fx msReMnCn')) {
				defineRe = true;
			} else if (textLine.startsWith('#define_fx msGaMnCn')) {
				defineGa = true;
			} else if (textLine.startsWith('#define_fx msFlMnCn')) {
				defineFl = true;
			} else if (textLine.startsWith('#define_fx msPhMnCn')) {
				definePh = true;
			} else if (textLine.startsWith('#define_fx msWoMnCn')) {
				defineWo = true;
			} else if (textLine.startsWith('#define_fx msEcMnCn')) {
				defineEc = true;
			}
		}
	});
// 不足しているユーザー定義エフェクトを記入
	if (defineRe === false) {
		newText += `#define_fx msReMnCn type=Retrigger;updatePeriod=0;waveLength=1/4;rate=70%;updateTrigger=off;mix=0%>100%\r\n`;
	} else {
		//何もしない
	}
	if (defineGa === false) {
	newText += `#define_fx msGaMnCn type=Gate;waveLength=1/4;rate=60%;mix=0%>90%\r\n`;
	} else {
		//何もしない
	}
	if (defineFl === false) {
	newText += `#define_fx msFlMnCn type=Flanger;period=2.0;delay=30samples;depth=45samples;feedback=60%; stereoWidth=0%;volume=75%;mix=0%>80%\r\n`;
	} else {
		//何もしない
	}
	if (definePh === false) {
	newText += `#define_fx msPhMnCn type=Phaser;period=1/2;stage=6;loFreq=1500Hz;hiFreq=20000Hz;Q=0.707;feedback=35%;stereoWidth=75%;hiCutGain=-8.9dB;mix=0%>50%\r\n`;
	} else {
		//何もしない
	}
	if (defineWo === false) {
	newText += `#define_fx msWoMnCn type=Wobble;waveLength=1/12;loFreq=500Hz;hiFreq=20000Hz;Q=1.414;mix=0%>50%\r\n`;
	} else {
		//何もしない
	}
	if (defineEc === false) {
	newText += `#define_fx msEcMnCn type=Echo;updatePeriod=0;waveLength=1/4;updateTrigger=off>on;feedbackLevel=100%;mix=0%>100%\r\n`;
	} else {
		//何もしない
	}

	// ダウンロード用のファイル作成
	const blob = new Blob([bom + newText], { type: 'text/plain; charset=utf-8' }); // UTF-8 を指定
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName.replace('.ksh', '-ms.ksh'); // ファイル名を変更
	a.click();
	URL.revokeObjectURL(url);
});