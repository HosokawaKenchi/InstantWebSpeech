/**
 * InstantWebSpeech Service Worker
 * 
 * バージョン管理とキャッシュ戦略：
 * - キャッシュファースト戦略を採用
 * - ネットワークでファイルを取得できない場合はキャッシュから提供
 * - manifest.jsonから取得するバージョン情報に基づいて自動的にキャッシュを更新
 * - 古いキャッシュは自動的に削除される
 */

let CACHE_VERSION = null;
let CACHE_FILES = [];

/**
 * manifest.jsonからキャッシュ設定を取得
 */
async function loadCacheConfig() {
    try {
        const response = await fetch('manifest.json');
        const manifest = await response.json();
        CACHE_VERSION = manifest.cache_version || 'v1.0.3';
        CACHE_FILES = manifest.cache_files || [
            'index.html',
            'app.js',
            'theme.css',
            'languages.js',
            'icon.svg',
            'icon-192.png',
            'icon-512.png',
            'manifest.json',
            'sw.js'
        ];
    } catch (error) {
        console.warn('Failed to load manifest.json, using defaults:', error);
        CACHE_VERSION = 'v1.0.3';
        CACHE_FILES = [
            'index.html',
            'app.js',
            'theme.css',
            'languages.js',
            'icon.svg',
            'icon-192.png',
            'icon-512.png',
            'manifest.json',
            'sw.js'
        ];
    }
}

/**
 * Service Workerのインストールイベント
 * 初期キャッシュの作成
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        (async () => {
            await loadCacheConfig();
            const cacheName = `instant-speech-${CACHE_VERSION}`;
            const cache = await caches.open(cacheName);
            
            try {
                // ファイルをキャッシュに追加
                await cache.addAll(CACHE_FILES);
                console.log(`[SW] Cached ${CACHE_FILES.length} files in ${cacheName}`);
            } catch (error) {
                console.warn('[SW] Failed to cache all files:', error);
                // 部分的なキャッシュ成功でも続行
                for (const file of CACHE_FILES) {
                    try {
                        await cache.add(file);
                    } catch (err) {
                        console.warn(`[SW] Failed to cache ${file}:`, err);
                    }
                }
            }
            
            // 新しいService Workerをすぐにアクティベート
            await self.skipWaiting();
        })()
    );
});

/**
 * Service Workerのアクティベーションイベント
 * 古いキャッシュの削除
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        (async () => {
            await loadCacheConfig();
            const currentCacheName = `instant-speech-${CACHE_VERSION}`;
            
            // すべてのキャッシュ名を取得
            const cacheNames = await caches.keys();
            
            // 現在のバージョン以外のキャッシュを削除
            const deletePromises = cacheNames
                .filter((name) => {
                    return name.startsWith('instant-speech-') && name !== currentCacheName;
                })
                .map((name) => {
                    console.log(`[SW] Deleting old cache: ${name}`);
                    return caches.delete(name);
                });
            
            await Promise.all(deletePromises);
            
            // Service Workerをすぐにすべてのクライアントで有効化
            await self.clients.claim();
            console.log(`[SW] Activation complete. Active cache: ${currentCacheName}`);
        })()
    );
});

/**
 * フェッチイベント
 * キャッシュファースト戦略を実装
 * 1. キャッシュにあればそれを返す
 * 2. ネットワークから取得を試みる（新しいバージョン確認）
 * 3. ネットワーク失敗時はキャッシュを使用
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // GETリクエストのみをキャッシュ対象
    if (request.method !== 'GET') {
        return;
    }
    
    // 外部オリジンへのリクエストはスキップ
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        (async () => {
            const cacheName = `instant-speech-${CACHE_VERSION}`;
            const cache = await caches.open(cacheName);
            
            try {
                // ネットワークからリソースを取得（新しいバージョン確認）
                const networkResponse = await fetch(request);
                
                // 成功時はキャッシュを更新
                if (networkResponse.ok) {
                    cache.put(request, networkResponse.clone());
                }
                
                return networkResponse;
            } catch (error) {
                // ネットワーク失敗時はキャッシュから取得
                const cachedResponse = await cache.match(request);
                
                if (cachedResponse) {
                    console.log(`[SW] Serving from cache: ${request.url}`);
                    return cachedResponse;
                }
                
                // キャッシュにもない場合はエラーレスポンスを返す
                return new Response('Network and cache unavailable', {
                    status: 503,
                    statusText: 'Service Unavailable',
                });
            }
        })()
    );
});

/**
 * メッセージイベント
 * クライアント（app.js）からのメッセージを処理
 * 用途例：キャッシュクリア、バージョン確認など
 */
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'GET_CACHE_VERSION':
            // クライアントにキャッシュバージョンを返す
            event.ports[0].postMessage({
                type: 'CACHE_VERSION',
                version: CACHE_VERSION,
                cacheFiles: CACHE_FILES
            });
            break;
            
        case 'CLEAR_CACHE':
            // すべてのキャッシュを削除
            event.waitUntil(
                (async () => {
                    const cacheNames = await caches.keys();
                    const deletePromises = cacheNames
                        .filter((name) => name.startsWith('instant-speech-'))
                        .map((name) => caches.delete(name));
                    
                    await Promise.all(deletePromises);
                    console.log('[SW] All caches cleared');
                    
                    event.ports[0].postMessage({
                        type: 'CACHE_CLEARED',
                        success: true
                    });
                })()
            );
            break;
            
        default:
            console.log('[SW] Unknown message type:', type);
    }
});

console.log('[SW] Service Worker script loaded');
