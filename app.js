// app.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

const btn = document.getElementById('btn');
const copyBtn = document.getElementById('copyBtn');
const resetBtn = document.getElementById('resetBtn');
const resultDiv = document.getElementById('result');
const langSelect = document.getElementById('langSelect');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let currentLangConfig = SUPPORTED_LANGUAGES[0]; // デフォルトは日本語

// --- UIのテキストを更新する関数 ---
const updateUI = () => {
    const langCode = langSelect.value;
    currentLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];
    
    // ボタンのテキストを現在の言語設定に合わせて更新
    // 録音中かどうかでメインボタンの文字を出し分ける
    const isRecording = btn.classList.contains('recording');
    btn.textContent = isRecording ? currentLangConfig.ui.stop : currentLangConfig.ui.start;
    
    copyBtn.textContent = currentLangConfig.ui.copy;
    resetBtn.textContent = currentLangConfig.ui.reset;
};

window.onload = () => {
    const savedText = localStorage.getItem('transcription_data');
    if (savedText) {
        resultDiv.textContent = savedText;
    }

    if (typeof SUPPORTED_LANGUAGES !== 'undefined') {
        SUPPORTED_LANGUAGES.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            langSelect.appendChild(option);
        });
    }

    const savedLang = localStorage.getItem('selected_lang');
    if (savedLang) {
        langSelect.value = savedLang;
    }
    
    updateUI(); // 初回表示時のUI更新
};

langSelect.onchange = () => {
    localStorage.setItem('selected_lang', langSelect.value);
    updateUI(); // 言語変更時にUIを更新
};

if (!SpeechRecognition) {
    resultDiv.textContent = "Speech Recognition is not supported.";
} else {
    const recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.continuous = true;

    let isRecording = false;

    btn.onclick = () => {
        if (!isRecording) {
            recognition.lang = langSelect.value;
            recognition.start();
            
            isRecording = true;
            btn.classList.add('recording'); // 録音中状態をクラスで管理
            btn.textContent = currentLangConfig.ui.stop;
            btn.style.background = "#dc3545";
            langSelect.disabled = true;
        } else {
            recognition.stop();
            
            isRecording = false;
            btn.classList.remove('recording');
            btn.textContent = currentLangConfig.ui.start;
            btn.style.background = "#007bff";
            langSelect.disabled = false;
        }
    };

    recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
        }
        resultDiv.textContent = text;
        localStorage.setItem('transcription_data', text);
        window.scrollTo(0, document.body.scrollHeight);
    };

    copyBtn.onclick = () => {
        const text = resultDiv.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = currentLangConfig.ui.copyDone;
            setTimeout(() => copyBtn.textContent = originalText, 1500);
        });
    };

    resetBtn.onclick = () => {
        if (confirm(currentLangConfig.ui.confirmReset)) {
            resultDiv.textContent = "";
            localStorage.removeItem('transcription_data');
            // 録音中のリセット対応
            if (isRecording) {
                recognition.stop();
                setTimeout(() => recognition.start(), 100);
            }
        }
    };
}