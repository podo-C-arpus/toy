const notes = /^([012]{4})\|([012]{2})\|(.{2,})$/;
const laserPos = /[0-9a-oA-Z]/;

function gcd(a, b) {
	return b === 0 ? a : gcd(b, a % b);
}

function gcdOfArray(arr) {
	if (arr.length === 0) {
		return 1;  // 配列が空の場合は 1 を返す（またはエラー処理）
	}
	let result = arr[0];
	// 配列の残りの各要素について、これまでのGCDと組み合わせる
	for (let i = 1; i < arr.length; i++) {
		result = gcd(result, arr[i]);
	}
	if (result === 0) {
		return 1; //0になったら代わりに1を返す
	}
	return result;
}

function needArray(arr) {
	const arr_max = Math.max(...arr);
	for (let unit = arr_max; unit >= 1; unit--) {
		if (arr_max % unit === 0 && allMultiples(arr, unit)) {
			return unit;
		}
	}
	return 1;
}

function getPrevNt(lines, i) { // 直前のノーツ情報を取得 bt,fxの判定に使用
	for (let j = i - 1; j >= 0; j--) {
		if (notes.test(lines[j])) {
			return lines[j];
		}
	}
	return "0000|00|--";
}

function getNextNt(lines, i) { // 直後のノーツ情報を取得 laserの判定に使用
	for (let j = i + 1; j < lines.length; j++) {
		if (notes.test(lines[j])) {
			return lines[j];
		}
	}
	return "0000|00|--";
}


function necessity(lines, i) {
	console.log(lines[i]);
	if (!notes.test(lines[i-1])) { // 臨時命令の有無を確認
		console.log("text");
		return true;
	}
	const prevNt = getPrevNt(lines, i);
	const currNt = lines[i];
	const nextNt = getNextNt(lines, i);
	for (let k = 0; k < 4; k++) { // btの条件を確認
		if (currNt[k] === "0" && prevNt[k] === "2") {
			console.log("bt");
			return true;
		} else if (currNt[k] === "1") {
			console.log("bt");
			return true;
		} else if (currNt[k] === "2" && prevNt[k] !== "2") {
			console.log("bt");
			return true;
		}
	}
	for (let k = 5; k < 7; k++) { // fxの条件を確認
		if (currNt[k] === "0" && prevNt[k] === "1") {
			console.log("fx");
			return true;
		} else if (currNt[k] === "2") {
			console.log("fx");
			return true;
		} else if (currNt[k] === "1" && prevNt[k] !== "1") {
			console.log("fx");
			return true;
		}
	}
	for (let k = 8; k < 10; k++) { // laserの条件を確認
		if (currNt[k] === "-" && prevNt[k] !== "-" && nextNt[k] !== "-") {
			console.log("laser");
			return true;
		} else if (laserPos.test(currNt[k])) {
			console.log("laser");
			return true;
		}
	}
	console.log("false");
	return false;
}

function conciseSegment(processText, needUnits) {
	const need = gcdOfArray(needUnits);
	console.log(needUnits, need);
	const processLines = processText.split("\r\n");
	let processUnit = 0;
	let conciseText = "";
	for (let l = 0; l < processLines.length; l++) {
		if (notes.test(processLines[l])) {
			if (processUnit % need === 0) {
				conciseText += processLines[l] + "\r\n";
			}
			processUnit += 1;
		} else {
			conciseText += processLines[l] + "\r\n";
		}
	}
	return conciseText;
}




document.getElementById("run-button").addEventListener("click", () => {

    const fileName = document.querySelector("#fileName")?.textContent;
    if (!fileName) {
        alert("ファイルが選択されていません");
        return;
    }

    if (!fileName.endsWith(".ksh")) {
        alert("対応していないファイル形式です。拡張子は .ksh である必要があります。");
        return;
    }

	const text = document.getElementById('textArea').value;
	let lines = text.split(/\r?\n/);
	let processText = "";
	let newText = "";
	let inSegmentUnit = 0;
	let needUnits = [];
	
	for (let i = 0; i < lines.length; i++) {
		lines[i] = lines[i].trim();
		processText += lines[i] + "\r\n";
		if (lines[i] === "--") {
			needUnits.push(inSegmentUnit);
			newText += conciseSegment(processText, needUnits).trimEnd(); // 冗長性を削除して1小節書き込む
			newText += "\r\n";
			// リセットして次の小節へ
			inSegmentUnit = 0;
			needUnits = [];
			processText = "";
		} else if (notes.test(lines[i])) {
			if (necessity(lines, i)) {
				needUnits.push(inSegmentUnit);
			}
			inSegmentUnit += 1;
		}
	}
	newText += processText;

	// ダウンロード用のファイル作成
	const bom = "\uFEFF";
	const blob = new Blob([bom + newText], { type: 'text/plain; charset=utf-8' }); // UTF-8 を指定
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	
	a.href = url;
	a.download = fileName.replace('.ksh', '-sml.ksh'); // ファイル名変更
	
	document.body.appendChild(a); // 一時的に追加
	a.click();
	document.body.removeChild(a); // クリック後に削除
	
	URL.revokeObjectURL(url); // メモリリークを防ぐ
});













