// app.js
import { SUPPORTED_LANGUAGES } from './languages.js';

/**
 * 設定管理
 */
let settings = {
    logCount: 0
};

function loadSettings() {
    const saved = localStorage.getItem('settings');
    if (saved) {
        settings = JSON.parse(saved);
    }
    logCountInput.value = settings.logCount;
}

function saveSettings() {
    settings.logCount = parseInt(logCountInput.value) || 0;
    localStorage.setItem('settings', JSON.stringify(settings));
}

/**
 * ログ管理
 */
function getLogKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('log_')) {
            keys.push(key);
        }
    }
    return keys.sort();
}

function saveLog(text) {
    if (settings.logCount === 0) return;
    const timestamp = new Date().toISOString().replace('T', 'T').replace(/\..+/, '');
    const key = 'log_' + timestamp;
    localStorage.setItem(key, text);
    
    // 古いログを削除
    const keys = getLogKeys();
    while (keys.length > settings.logCount) {
        localStorage.removeItem(keys.shift());
    }
}

function deleteAllLogs() {
    const keys = getLogKeys();
    keys.forEach(key => localStorage.removeItem(key));
}

function getLatestLog() {
    const keys = getLogKeys();
    if (keys.length === 0) return null;
    return localStorage.getItem(keys[keys.length - 1]);
}

function showLogs() {
    logsList.innerHTML = '';
    const keys = getLogKeys();
    keys.forEach(key => {
        const timestamp = key.replace('log_', '');
        const text = localStorage.getItem(key);
        const div = document.createElement('div');
        div.innerHTML = `<strong>${timestamp}</strong><br>${text}`;
        logsList.appendChild(div);
    });
}

/**
 * Service Worker管理
 * バージョン管理と自動更新機能
 */
let serviceWorkerContainer = null;
let currentCacheVersion = null;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { type: 'module'}).then((registration) => {
        serviceWorkerContainer = registration;
        
        // ページロード時に一度だけアップデートを確認
        registration.update();
        
        // Service Workerの状態変化を監視
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // 新しいService Workerがインストールされた
                        notifyServiceWorkerUpdate();
                    }
                });
            }
        });
        
        // 現在のキャッシュバージョンを取得
        if (navigator.serviceWorker.controller) {
            getCacheVersion();
        }
    }).catch((error) => {
        console.log('[App] Service Worker registration failed:', error);
    });
    
    // Service Workerからのメッセージを受け取る
    navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, version } = event.data;
        if (type === 'CACHE_VERSION') {
            currentCacheVersion = version;
            console.log('[App] Current cache version:', version);
        }
    });
}

/**
 * Service Workerからキャッシュバージョンを取得
 */
function getCacheVersion() {
    if (navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        navigator.serviceWorker.controller.postMessage(
            { type: 'GET_CACHE_VERSION' },
            [messageChannel.port2]
        );
        
        messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'CACHE_VERSION') {
                currentCacheVersion = event.data.version;
            }
        };
    }
}

/**
 * Service Worker更新通知
 * ユーザーにページの再読み込みを促す
 */
function notifyServiceWorkerUpdate() {
    const message = currentLangConfig.ui.updateMessage;
    
    // コンソール通知
    console.log('[App] ' + message);
    
    // UI通知を表示
    const notificationDiv = document.getElementById('updateNotification');
    if (notificationDiv) {
        notificationDiv.style.display = 'flex';
    }
    
    // 再読み込みボタンのイベントリスナー
    const reloadBtn = document.getElementById('reloadBtn');
    if (reloadBtn) {
        reloadBtn.textContent = currentLangConfig.ui.reload;
        reloadBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }
}

const btn = document.getElementById('btn');
const stopControls = document.getElementById('stopControls');
const stopBtn = document.getElementById('stopBtn');
const restartBtn = document.getElementById('restartBtn');
const copyBtn = document.getElementById('copyBtn');
const copyOrganizeBtn = document.getElementById('copyOrganizeBtn');
const resetBtn = document.getElementById('resetBtn');
const resultDiv = document.getElementById('result');
const langSelect = document.getElementById('langSelect');
const settingsBtn = document.getElementById('settingsBtn');
const settingsDialog = document.getElementById('settingsDialog');
const logsDialog = document.getElementById('logsDialog');
const logCountInput = document.getElementById('logCountInput');
const viewLogsBtn = document.getElementById('viewLogsBtn');
const deleteAllLogsBtn = document.getElementById('deleteAllLogsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const closeLogsBtn = document.getElementById('closeLogsBtn');
const logsList = document.getElementById('logsList');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let currentLangConfig = SUPPORTED_LANGUAGES[0]; // デフォルトは日本語

// --- UIのテキストを更新する関数 ---
const updateUI = () => {
    const langCode = langSelect.value;
    currentLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];
    
    // ボタンのテキストを現在の言語設定に合わせて更新
    // 録音中かどうかでメインボタンの文字を出し分ける
    const isRecording = stopControls.style.display !== 'none';
    if (isRecording) {
        stopBtn.textContent = currentLangConfig.ui.stop;
        restartBtn.textContent = currentLangConfig.ui.restart;
    } else {
        btn.textContent = currentLangConfig.ui.start;
    }
    
    copyBtn.textContent = currentLangConfig.ui.copy;
    if (copyOrganizeBtn) copyOrganizeBtn.textContent = currentLangConfig.ui.organizeCopy || currentLangConfig.ui.copy;
    resetBtn.textContent = currentLangConfig.ui.reset;
    
    // 設定ダイアログ
    const settingsTitle = document.querySelector('#settingsDialog h2');
    if (settingsTitle) settingsTitle.textContent = currentLangConfig.ui.settings;
    const settingsP1 = document.querySelector('#settingsDialog p:first-of-type');
    if (settingsP1) settingsP1.textContent = currentLangConfig.ui.settingsMessage1;
    const settingsLabel = document.querySelector('#settingsDialog label');
    if (settingsLabel) {
        const labelText = currentLangConfig.ui.settingsLabel.replace('{0}', '<input type="number" id="logCountInput" min="0" value="0">');
        settingsLabel.innerHTML = labelText;
    }
    const settingsP2 = document.querySelector('#settingsDialog p:last-of-type');
    if (settingsP2) settingsP2.textContent = currentLangConfig.ui.settingsMessage2;
    viewLogsBtn.textContent = currentLangConfig.ui.viewLogs;
    deleteAllLogsBtn.textContent = currentLangConfig.ui.deleteAllLogs;
    closeSettingsBtn.textContent = currentLangConfig.ui.close;
    
    // ログダイアログ
    const logsTitle = document.querySelector('#logsDialog h2');
    if (logsTitle) logsTitle.textContent = currentLangConfig.ui.logs;
    closeLogsBtn.textContent = currentLangConfig.ui.close;
    
    // 更新通知
    const updateSpan = document.querySelector('#updateNotification span');
    if (updateSpan) updateSpan.textContent = currentLangConfig.ui.updateMessage;
    const reloadBtn = document.getElementById('reloadBtn');
    if (reloadBtn) reloadBtn.textContent = currentLangConfig.ui.reload;
};

window.onload = () => {
    loadSettings();
    
    // 設定が行われていない場合、強制的にダイアログを開く
    if (!localStorage.getItem('settings')) {
        settingsDialog.classList.add('show');
    }
    
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
    
    // 初期表示：録音開始ボタンのみ表示
    stopControls.style.display = 'none';
    
    updateUI(); // 初回表示時のUI更新
};

langSelect.onchange = () => {
    localStorage.setItem('selected_lang', langSelect.value);
    updateUI(); // 言語変更時にUIを更新
};

settingsBtn.onclick = () => {
    settingsDialog.classList.add('show');
};

closeSettingsBtn.onclick = () => {
    saveSettings();
    settingsDialog.classList.remove('show');
};

viewLogsBtn.onclick = () => {
    showLogs();
    logsDialog.classList.add('show');
};

deleteAllLogsBtn.onclick = () => {
    if (confirm('ログを全部削除しますか？')) {
        deleteAllLogs();
    }
};

closeLogsBtn.onclick = () => {
    logsDialog.classList.remove('show');
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
            btn.style.display = 'none';
            stopControls.style.display = 'flex';
            stopBtn.textContent = currentLangConfig.ui.stop;
            stopBtn.style.background = "#dc3545";
            restartBtn.style.background = "#ffc107";
            langSelect.disabled = true;
        }
    };

    stopBtn.onclick = () => {
        if (isRecording) {
            recognition.stop();
            
            isRecording = false;
            stopControls.style.display = 'none';
            btn.style.display = 'block';
            btn.textContent = currentLangConfig.ui.start;
            btn.style.background = "#007bff";
            langSelect.disabled = false;
            
            // ログ保存
            const text = resultDiv.textContent;
            if (settings.logCount > 0) {
                saveLog(text);
            }
        }
    };

    restartBtn.onclick = () => {
        if (isRecording) {
            recognition.stop();
            
            isRecording = false;
            stopControls.style.display = 'none';
            btn.style.display = 'block';
            btn.textContent = currentLangConfig.ui.start;
            btn.style.background = "#007bff";
            langSelect.disabled = false;
            
            // ログ保存なし
        }
    };

    recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
        }
        resultDiv.textContent = text;
        if (settings.logCount === 0) {
            localStorage.setItem('transcription_data', text);
        }
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

    if (copyOrganizeBtn) {
        copyOrganizeBtn.onclick = () => {
            const text = resultDiv.textContent || "";
            const prompt = currentLangConfig.ui.organizePrompt || "";
            navigator.clipboard.writeText(prompt + text).then(() => {
                const originalText = copyOrganizeBtn.textContent;
                copyOrganizeBtn.textContent = currentLangConfig.ui.copyDone;
                setTimeout(() => copyOrganizeBtn.textContent = originalText, 1500);
            });
        };
    }

    resetBtn.onclick = () => {
        if (confirm(currentLangConfig.ui.confirmReset)) {
            resultDiv.textContent = "";
            if (settings.logCount === 0) {
                localStorage.removeItem('transcription_data');
            }
            // 録音中のリセット対応
            if (isRecording) {
                recognition.stop();
                setTimeout(() => {
                    stopControls.style.display = 'none';
                    btn.style.display = 'block';
                    btn.textContent = currentLangConfig.ui.start;
                    btn.style.background = "#007bff";
                    langSelect.disabled = false;
                    isRecording = false;
                }, 100);
            }
        }
    };
}

// ウィンドウ閉じる際の処理
window.addEventListener('beforeunload', (event) => {
    const currentText = resultDiv.textContent;
    const latestLog = getLatestLog();
    if (latestLog !== currentText && currentText.trim() !== '') {
        if (settings.logCount > 0) {
            saveLog(currentText);
        }
    }
});