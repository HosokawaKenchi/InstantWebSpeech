// languages.js
const SUPPORTED_LANGUAGES = [
    { 
        name: "日本語", 
        code: "ja-JP",
        ui: {
            start: "録音開始",
            stop: "停止",
            copy: "📋 内容をコピー",
            reset: "🗑️ 文字起こし内容を消去",
            confirmReset: "内容をクリアしますか？",
            copyDone: "完了！"
        }
    },
    { 
        name: "English", 
        code: "en-US",
        ui: {
            start: "Start Recording",
            stop: "Stop",
            copy: "📋 Copy Text",
            reset: "🗑️ Clear Transcription",
            confirmReset: "Are you sure you want to clear the text?",
            copyDone: "Done!"
        }
    },
    { 
        name: "Español", 
        code: "es-ES",
        ui: {
            start: "Iniciar grabación",
            stop: "Detener",
            copy: "📋 Copiar texto",
            reset: "🗑️ Borrar transcripción",
            confirmReset: "¿Estás seguro de que deseas borrar el texto?",
            copyDone: "¡Copiado!"
        }
    },
    { 
        name: "Français", 
        code: "fr-FR",
        ui: {
            start: "Démarrer l'enregistrement",
            stop: "Arrêter",
            copy: "📋 Copier le texte",
            reset: "🗑️ Effacer la transcription",
            confirmReset: "Êtes-vous sûr de vouloir effacer le texte ?",
            copyDone: "Copié !"
        }
    },
    { 
        name: "中文", 
        code: "zh-CN",
        ui: {
            start: "开始录音",
            stop: "停止",
            copy: "📋 复制文本",
            reset: "🗑️ 清除内容",
            confirmReset: "您確定要清除文字嗎？",
            copyDone: "完成！"
        }
    }
];