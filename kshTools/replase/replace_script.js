// replace_script.js
(() => {
    const dropArea        = document.getElementById('dropArea');
    const fileInput       = document.getElementById('fileInput');
    const previewArea     = document.getElementById('textArea');
    const fileNameDisplay = document.getElementById('fileName');
    const rulesContainer  = document.getElementById('rules');
    const addRuleBtn      = document.getElementById('add-rule');
    let fileContent       = '';
    let originalFileName  = '';

    // ファイル読み込み処理
    function handleFile(file) {
        if (!file || !file.name.endsWith('.ksh')) {
            alert('非対応のファイル形式です Unsupported file formats');
            return;
        }
        originalFileName = file.name;
        fileNameDisplay.textContent = originalFileName;
        const reader = new FileReader();
        reader.onload = () => {
            // CRLF 正規化
            fileContent = reader.result.replace(/\r?\n/g, '\r\n');
            const lines = fileContent.split('\r\n');
            previewArea.value = fileContent;
        };
        reader.readAsText(file, 'UTF-8');
    }

    // ドラッグオーバー／ドラッグリーブ
    dropArea.addEventListener('dragover', e => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });
    dropArea.addEventListener('dragleave', e => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
    });

    // ドロップ
    dropArea.addEventListener('drop', e => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0]);
    });

    // クリックでファイル選択
    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        handleFile(e.target.files[0]);
        // 同じファイルを再選択可能に
        e.target.value = '';
    });

    // ルール追加
    addRuleBtn.addEventListener('click', () => {
        const rule = document.createElement('div');
        rule.className = 'rule';
        rule.innerHTML = `
            <textarea class="search" placeholder="検索文字列 Search pattern"></textarea>
            <textarea class="replace" placeholder="置換文字列 Replasement pattern"></textarea>
            <button type="button" class="remove-rule">−</button>
        `;
        rulesContainer.appendChild(rule);
    });

    // ルール削除
    rulesContainer.addEventListener('click', e => {
        if (e.target.classList.contains('remove-rule')) {
            e.target.parentElement.remove();
        }
    });

    // 置換実行
    document.getElementById('replace-btn').addEventListener('click', () => {
        if (!fileContent) {
            alert('.kshファイルをドロップまたは選択してください。Drop or select your .ksh file.');
            return;
        }
        let result = fileContent;
        document.querySelectorAll('#rules .rule').forEach(rule => {
            let rawSearch = rule.querySelector('.search').value;
            if (!rawSearch) return;
            rawSearch = rawSearch.replace(/\r?\n/g, '\r\n');
            let rawReplace = rule.querySelector('.replace').value;
            rawReplace = rawReplace.replace(/\r?\n/g, '\r\n');
            result = result.split(rawSearch).join(rawReplace);
        });
        const blob = new Blob(['\uFEFF' + result], { type: 'text/plain;charset=utf-8' });
        const downloadName = originalFileName.replace(/\.ksh$/, '') + '-rpl.ksh';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
})();
