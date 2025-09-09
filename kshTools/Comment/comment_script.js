const notesLine = /^[0-2]{4}\|[0-2]{2}\|[\s\S]*$/;

document.getElementById("run-button").addEventListener("click", () => {
	const bom = "\uFEFF";
	
    // 入力値を取得
    const delete_slash = document.getElementById("delete_slash").checked;
    const alter_crlf = document.getElementById("alter_crlf").checked;
    const delete_beat = document.getElementById("delete_beat").checked;
    const delete_t = document.getElementById("delete_t").checked;


    // ファイル名とテキストエリアの内容を取得
    const fileName = document.querySelector("#fileName").textContent;
    if (!fileName) {
        alert("ファイルが選択されていません");
        return;
    }

    // ファイル拡張子を確認
    if (!fileName.endsWith(".ksh")) {
        alert("対応していないファイル形式です。拡張子は .ksh である必要があります。");
        return;
    }

    const text = document.getElementById("textArea").value;
    const lines = text.split("\r\n");
    let kshTexts = []; // 3次元配列 [bar][unit][line]
    let bar = 0;
    let unit = 0;
    let line = 0;
    const ensure = () => { // 配列の初期化
        kshTexts[bar] ??= [];
        kshTexts[bar][unit] ??= [];
    }
    ensure();

    for (const textLine of lines) { // 3次元配列に変換
        if (textLine === "--") {
            bar += 1;
            unit = 0;
            ensure();
            continue;
        }
        if (notesLine.test(textLine)) {
            kshTexts[bar][unit].push(textLine);
            unit += 1;
            ensure();
            continue;
        }
        kshTexts[bar][unit].push(textLine);
    }


    // 変換処理
    console.log("処理開始", "delete_slash:", delete_slash, "alter_crlf:", alter_crlf, "delete_beat:", delete_beat, "delete_t:", delete_t);
    kshTexts.forEach((barData, barIndex) => {
        barData.forEach((unitData, unitIndex) => {
            if (delete_slash) { // delete_slash オプションの処理
                const double_slash = /^\/{2,}#/;
                unitData.forEach((textLine, lineIndex) => {
                    kshTexts[barIndex][unitIndex][lineIndex] = textLine.replace(double_slash, ""); // #付きのものを削除
                });
            }
            if (alter_crlf) { // alter_crlf オプションの処理
                unitData.forEach((textLine, lineIndex) => {
                    kshTexts[barIndex][unitIndex][lineIndex] = textLine.replace(/CRLF/g, "\r\n");
                });
            }
            if (delete_beat) { // delete_beat オプションの処理
                let flag = false;
                unitData.forEach((textLine, lineIndex) => {
                    if (textLine.includes("beat=delete")) {
                        flag = true;
                        kshTexts[barIndex][unitIndex][lineIndex] = textLine.replace(/beat=#/g, "");
                    }
                });
                if (flag) {
                    for (let i = 0; i < unitData.length; i++) {
                        let textLine = unitData[i];
                        if (textLine.startsWith("beat=")) {
                            kshTexts[barIndex][unitIndex][i] = "";
                            break;
                        }
                    }
                }
            }
            if (delete_t) { // delete_t オプションの処理
                const t_not_beat_test = /(^|[^a-zA-Z])t=#/;
                const t_not_beat_repl = /(^|[^a-zA-Z])t=#/g;
                let flag = false;
                unitData.forEach((textLine, lineIndex) => {
                    if (t_not_beat_test.test(textLine)) {
                        flag = true;
                        kshTexts[barIndex][unitIndex][lineIndex] = textLine.replace(t_not_beat_repl, "$1");
                    }
                });
                if (flag) {
                    for (let i = 0; i < unitData.length; i++) {
                        let textLine = unitData[i];
                        if (textLine.startsWith("t=")) {
                            kshTexts[barIndex][unitIndex][i] = "";
                            break;
                        }
                    }
                }
            }
        });
    });


    for (let barIndex = 0; barIndex < kshTexts.length; barIndex++) {
        for (let unitIndex = 0; unitIndex < kshTexts[barIndex].length; unitIndex++) {
            // 空文字や空白だけの行を削除する場合は trim を利用
            kshTexts[barIndex][unitIndex] = kshTexts[barIndex][unitIndex].filter(line => line.trim() !== "");
        }
    }

    let newText = "";
    kshTexts.forEach((barData) => {
        let textadded = false;
        barData.forEach((unitData) => {
            unitData.forEach((textLine) => {
                if (textLine && (textLine !== "")) { // 空行を除外
                    textadded = true;
                    newText += textLine + "\r\n";
                }
            });
        });
        if (textadded) {
            newText += "--\r\n"; // 小節区切りを追加
        }
    });
    newText = newText.trim(); // 末尾の改行を削除
    newText = newText.replace(/\r?\n/g, "\r\n");



    // ダウンロード用のファイル作成
    const blob = new Blob([bom + newText], { type: "text/plain; charset=utf-8" }); // UTF-8 を指定
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(".ksh", "-com.ksh"); // ファイル名変更
    a.click();
    URL.revokeObjectURL(url);
});