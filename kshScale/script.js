document.getElementById('run-button').addEventListener('click', () => {
	const bom = '\uFEFF';
	
    // 入力値を取得
    const startLine = parseInt(document.getElementById('startLine').value, 10);
    const endLine = parseInt(document.getElementById('endLine').value, 10);
    const item = document.getElementById('item').value;
    const aFactor = parseFloat(document.getElementById('aFactor').value, 10);
    const bFactor = parseFloat(document.getElementById('bFactor').value, 10);
    const cFactor = parseFloat(document.getElementById('cFactor').value, 10);

    // 初期値設定
    let line = 0;
    let kshValue = 0;

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
        if (textLine === '--') {
            newText += textLine + '\r\n'; // '--' の行はそのまま転記
            line += 1; // Line に 1 を加算
        } else if (line >= startLine && line <= endLine) {
            if (textLine.startsWith(item)) { //対象をみつける
				kshValue = parseFloat(textLine.split('=')[1], 10);
				if (item === 'zoom_top' || item === 'zoom_bottom' || item === 'zoom_side' || item === 'center_split') {
					kshValue = Math.round(aFactor * kshValue * kshValue + bFactor * kshValue + cFactor);
					newText += `${item}=${kshValue}\r\n`; //新たなテキストを記入
				} else if (item === 'tilt'){
					if (isNaN(kshValue)){
						newText += textLine + '\r\n'; // tilt=normalなどはそのまま転記
					} else {
						kshValue = kshValue * 100
						kshValue = 0.01 * 0.001 * Math.round(1000 * (aFactor * kshValue * kshValue + bFactor * kshValue + cFactor));
						newText += `${item}=${kshValue}\r\n`; //新たなテキストを記入
					}
				} else if (item === 'pfiltergain' || item === 'chokkakuvol'){
					kshValue = Math.min(100, Math.max(0, Math.round(aFactor * kshValue * kshValue + bFactor * kshValue + cFactor)));
					newText += `${item}=${kshValue}\r\n`; //新たなテキストを記入
				} else {
					// このelseは発生しない
				}
			} else{
                newText += textLine + '\r\n'; // それ以外の行はそのまま転記
            }
        } else {
            newText += textLine + '\r\n'; // 変換対象範囲外の行はそのまま転記
        }
    });

    // ダウンロード用のファイル作成
    const blob = new Blob([bom + newText], { type: 'text/plain; charset=utf-8' }); // UTF-8 を指定
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace('.ksh', '-scl.ksh'); // ファイル名変更
    a.click();
    URL.revokeObjectURL(url);
});
