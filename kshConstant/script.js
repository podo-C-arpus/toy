document.getElementById('run-button').addEventListener('click', () => {
	const bom = '\uFEFF';
	
    // 入力値を取得
    const startLine = parseInt(document.getElementById('startLine').value, 10);
    const endLine = parseInt(document.getElementById('endLine').value, 10);
    const standardBPM = parseFloat(document.getElementById('standardBPM').value);

    // 初期値設定
    let line = 0;
    let originalBPM = 200;
    let originalBeat = 192;
    let newBPM = 200;
    let newBeat = 192;
	let modify = true;
	let numerator =4;
	let denominator =4;

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

    lines.forEach((textLine) => {
		const fractionMatch = textLine.match(/(\d+)\/(\d+)/);
        if (textLine === '--') {
            newText += textLine + '\r\n'; // '--' の行はそのまま転記
            line += 1; // Line に 1 を加算
		} else if (textLine.startsWith('beat=')) { // beat=の行
			modify = true; // 変更すべきことを記憶
			numerator = parseInt(fractionMatch[1], 10);  // 分子
			denominator = parseInt(fractionMatch[2], 10);  // 分母
			originalBeat = numerator * (192 / denominator); //192分での分子
			if (line >= startLine && line <= endLine + 1) {
				// 適用範囲内と直後はいったん記入しない
			} else {
				newText += textLine + '\r\n'; // 適用範囲外はそのまま転記
			}
		} else if (textLine.startsWith('t=')) { // t=の行
			modify = true; // 変更すべきことを記憶
			originalBPM = parseFloat(textLine.split('=')[1]);
			if (line >= startLine && line <= endLine + 1) {
				// 適用範囲内と直後はいったん記入しない
			} else {
				newText += textLine + '\r\n'; // 適用範囲外はそのまま転記
			}
		} else {
			if (modify) { // 手動コンスタント処理
				newBeat = Math.round(originalBeat * standardBPM / originalBPM);
				newBPM = 0.001 * Math.round(1000 * (originalBPM * newBeat / originalBeat));
				if (line >= startLine && line <= endLine) {
					newText += `beat=${newBeat}/192\r\nt=${newBPM}\r\n`; //新たなテキストを記入
				} else if (line === endLine + 1) {
					newText += `beat=${numerator}/${denominator}\r\nt=${originalBPM}\r\n`; //新たなテキストを記入
				} else {
					// このelseは発生しない
				}
				modify = false;
			}
			newText += textLine + '\r\n'; // 原則としてそのまま転記
		}
	});

    // ダウンロード用のファイル作成
    const blob = new Blob([bom + newText], { type: 'text/plain; charset=utf-8' }); // UTF-8 を指定
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace('.ksh', '-con.ksh'); // ファイル名変更
    a.click();
    URL.revokeObjectURL(url);
});
