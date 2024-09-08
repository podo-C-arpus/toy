document.getElementById('run-button').addEventListener('click', () => {
	const bom = '\uFEFF';
	
    // 入力値を取得
    const startLine = parseInt(document.getElementById('startLine').value, 10);
    const endLine = parseInt(document.getElementById('endLine').value, 10);
    const sentakuShi = parseInt(document.getElementById('sentakuShi').value, 10);

    // 初期値設定
    let line = 0;
    let zoomSide = 0;
    let centerSplit = 0;

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
            if (textLine.startsWith('zoom_side=')) { //zoom_sideについての処理
				if (sentakuShi == 0) { //zoom_sideを削除してcenter_splitに置換する
					zoomSide = parseInt(textLine.split('=')[1], 10);
					centerSplit = zoomSide * 4;
					newText += `center_split=${centerSplit}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 100) { //center_splitを追記 左側(ABL)をデフォルト位置に固定
					zoomSide = parseInt(textLine.split('=')[1], 10);
					centerSplit = zoomSide * 4;
					newText += `zoom_side=${zoomSide}\r\ncenter_split=${centerSplit}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 101) { //center_splitを追記 右側(CDR)をデフォルト位置に固定
					zoomSide = parseInt(textLine.split('=')[1], 10);
					centerSplit = zoomSide * -4;
					newText += `zoom_side=${zoomSide}\r\ncenter_split=${centerSplit}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 200) { //zoom_sideの正負を反転
					zoomSide = parseInt(textLine.split('=')[1], 10);
					centerSplit = zoomSide * -1;
					newText += `center_split=${centerSplit}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 201) { //center_splitの正負を反転
					// newText += textLine + '\r\n'; // そのまま転記
				} else if (sentakuShi == 300) { //zoom_sideを削除
					// 転記せず削除
				} else if (sentakuShi == 301) { //center_splitを削除
					newText += textLine + '\r\n'; // そのまま転記
				} else if (sentakuShi == 402) { //zoom_sideのスケールを2倍にする
					zoomSide = parseInt(textLine.split('=')[1], 10);
					zoomSide = zoomSide * 2;
					newText += `zoom_side=${zoomSide}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 403) { //zoom_sideのスケールを3倍にする
					zoomSide = parseInt(textLine.split('=')[1], 10);
					zoomSide = zoomSide * 3;
					newText += `zoom_side=${zoomSide}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 404) { //zoom_sideのスケールを4倍にする
					zoomSide = parseInt(textLine.split('=')[1], 10);
					zoomSide = zoomSide * 4;
					newText += `zoom_side=${zoomSide}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 502) { //zoom_sideのスケールを1/2倍にする
					zoomSide = parseInt(textLine.split('=')[1], 10);
					zoomSide = Math.round(zoomSide / 2);
					newText += `zoom_side=${zoomSide}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 503) { //zoom_sideのスケールを1/3倍にする
					zoomSide = parseInt(textLine.split('=')[1], 10);
					zoomSide = Math.round(zoomSide / 3);
					newText += `zoom_side=${zoomSide}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 504) { //zoom_sideのスケールを1/4倍にする
					zoomSide = parseInt(textLine.split('=')[1], 10);
					zoomSide = Math.round(zoomSide / 4);
					newText += `zoom_side=${zoomSide}\r\n`; //新たなテキストを記入
				} else { // このelseは発生しないはず
					newText += textLine + '\r\n'; // そのまま転記
				}
			} else if (textLine.startsWith('center_split=')) { //center_splitについての処理
				if (sentakuShi == 201) { //center_splitの正負を反転
					centerSplit = parseInt(textLine.split('=')[1], 10);
					centerSplit = centerSplit * -1;
					newText += `center_split=${centerSplit}\r\n`; //新たなテキストを記入
				} else if (sentakuShi == 301) { //center_splitを削除
					// 転記せず削除
				} else {
					newText += textLine + '\r\n'; // そのまま転記
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
    a.download = fileName.replace('.ksh', '-z2c.ksh'); // ファイル名変更
    a.click();
    URL.revokeObjectURL(url);
});
