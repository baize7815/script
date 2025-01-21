// ==UserScript==
// @name         Chat指纹重置
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  全维度环境隔离+指纹伪装，支持多域名
// @author       YourName
// @match        https://chat100.ai/*
// @match        https://chatai.baizebb.buzz/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/fingerprintjs2@latest/dist/fingerprint2.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Define domain configurations
    const DOMAIN_CONFIG = {
        'chat100.ai': {
            baseUrl: 'https://chat100.ai/zh-CN/app',
            cleanUrl: 'https://chat100.ai/zh-CN/app/7daeec0724d85cde5bde0600a05df738'
        },
        'chatai.baizebb.buzz': {
            baseUrl: 'https://chatai.baizebb.buzz/app',
            cleanUrl: 'https://chatai.baizebb.buzz/app'
        }
    };

    // Get current domain configuration
    const getCurrentDomainConfig = () => {
        const hostname = window.location.hostname;
        return DOMAIN_CONFIG[hostname] || DOMAIN_CONFIG['chat100.ai']; // fallback to chat100.ai
    };

    // 环境隔离容器
    class EnvIsolator {
        constructor() {
            this.sessionID = Date.now().toString(36) + Math.random().toString(36).substr(2);
            this.init();
        }

        async init() {
            await this.cleanLegacyData();
            this.injectFakeParameters();
            this.blockAdvancedAPIs();
            this.setupNetworkProxy();
        }

        // 清除所有历史痕迹
        async cleanLegacyData() {
            // 递归清理所有存储
            const cleanupTasks = [
                () => localStorage.clear(),
                () => sessionStorage.clear(),
                () => caches.keys().then(keys => keys.forEach(k => caches.delete(k))),
                () => indexedDB.databases().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name))),
                async () => {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    registrations.forEach(reg => reg.unregister());
                },
                () => {
                    document.cookie.split(";").forEach(cookie => {
                        const domains = [
                            window.location.hostname,
                            `.${window.location.hostname}`,
                            window.location.hostname.split('.').slice(-2).join('.')
                        ];
                        domains.forEach(domain => {
                            document.cookie = `${cookie.split('=')[0]}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${domain}; path=/`;
                        });
                    });
                }
            ];

            for (const task of cleanupTasks) {
                await (typeof task === 'function' ? task() : task);
            }
        }

        // 注入伪造参数
        injectFakeParameters() {
            // 动态硬件参数
            const hardwareProfile = {
                deviceMemory: _.sample([4, 8, 16]),
                hardwareConcurrency: _.random(2, 8),
                renderer: `ANGLE (${_.sample(['NVIDIA', 'AMD'])} ${_.sample(['RTX 3080', 'RX 6900 XT'])} Direct3D11 vs_5_0 ps_5_0)`,
                audioContextHash: _.random(1000000, 9999999).toString(16)
            };

            Object.defineProperties(navigator, {
                deviceMemory: { value: hardwareProfile.deviceMemory },
                hardwareConcurrency: { value: hardwareProfile.hardwareConcurrency },
                userAgent: { value: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${_.random(120, 125)}.0.0.0 Safari/537.36` }
            });

            // WebGL参数覆盖
            const getParameterProxy = (target, ctx) => new Proxy(target, {
                apply: (t, thisArg, args) => {
                    if (args[0] === 37445) return hardwareProfile.renderer;
                    if (args[0] === 7937) return 'WebKit'; // UNMASKED_VENDOR_WEBGL
                    return Reflect.apply(t, thisArg, args);
                }
            });

            WebGLRenderingContext.prototype.getParameter = getParameterProxy(WebGLRenderingContext.prototype.getParameter);
            WebGL2RenderingContext.prototype.getParameter = getParameterProxy(WebGL2RenderingContext.prototype.getParameter);

            // 音频指纹干扰
            const originalCreateOscillator = AudioContext.prototype.createOscillator;
            AudioContext.prototype.createOscillator = function() {
                const oscillator = originalCreateOscillator.call(this);
                oscillator.frequency.value += _.random(-10, 10);
                return oscillator;
            };
        }

        // 拦截高级API
        blockAdvancedAPIs() {
            // WebGPU拦截
            if ('gpu' in navigator) {
                navigator.gpu.requestAdapter = () => Promise.reject('WebGPU disabled');
            }

            // 字体枚举拦截
            const originalFonts = window.FontFace;
            window.FontFace = function() {
                throw new Error('FontFace API disabled');
            };
            window.FontFace.prototype = originalFonts.prototype;
        }

        // 网络层代理
        setupNetworkProxy() {
            const proxyConfig = {
                proxyServer: 'socks5://127.0.0.1:1080',
                rotateInterval: 300000 // 5分钟切换一次IP
            };

            // 动态切换代理（需本地代理客户端支持）
            GM_registerMenuCommand("切换代理节点", () => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: 'http://localhost:8080/rotate',
                    onload: () => window.location.reload()
                });
            });
        }
    }

    // 初始化环境隔离
    new EnvIsolator();

    // 添加控制面板
    GM_addStyle(`
        #env-control-trigger {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: rgba(30,30,30,0.9);
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 99999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s;
        }
        #env-control-trigger:hover {
            transform: scale(1.1);
        }
        #env-control-panel {
            position: fixed;
            bottom: 70px;
            right: 20px;
            background: rgba(30,30,30,0.9);
            border-radius: 8px;
            padding: 8px;
            color: white;
            z-index: 99998;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            display: none;
            transition: all 0.3s;
        }
        .env-control-btn {
            display: block;
            width: 150px;
            padding: 8px;
            margin: 4px 0;
            background: #444;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            font-size: 13px;
        }
        .env-control-btn:hover {
            background: #666;
            transform: translateX(3px);
        }
    `);

    // 创建触发按钮和面板
    const trigger = document.createElement('div');
    trigger.id = 'env-control-trigger';
    trigger.innerHTML = '⚙️';
    document.body.appendChild(trigger);

    const panel = document.createElement('div');
    panel.id = 'env-control-panel';
    panel.innerHTML = `
        <button class="env-control-btn" id="hard-reset">🔄 硬核环境重置</button>
        <button class="env-control-btn" id="new-identity">🎭 切换新身份</button>
        <button class="env-control-btn" id="flush-dns">🌐 刷新DNS缓存</button>
        <button class="env-control-btn" id="home-page">🏠 回到首页</button>
    `;
    document.body.appendChild(panel);

    // 点击触发按钮显示/隐藏面板
    let isPanelVisible = false;
    trigger.addEventListener('click', () => {
        isPanelVisible = !isPanelVisible;
        panel.style.display = isPanelVisible ? 'block' : 'none';
    });

    // 点击面板外区域隐藏面板
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== trigger) {
            isPanelVisible = false;
            panel.style.display = 'none';
        }
    });

    // 功能绑定
    document.getElementById('hard-reset').addEventListener('click', () => {
        const config = getCurrentDomainConfig();
        window.location.href = `${config.cleanUrl}?_clean=${Date.now()}`;
    });

    document.getElementById('new-identity').addEventListener('click', () => {
        GM_download({
            url: 'http://localhost:8080/rotate',
            name: 'proxy_rotate',
            onload: () => window.location.reload()
        });
    });

    document.getElementById('flush-dns').addEventListener('click', () => {
        // DNS刷新逻辑可以在这里添加
        fetch('http://localhost:8080/flush-dns', {
            method: 'POST'
        }).then(() => {
            console.log('DNS cache flushed');
            window.location.reload();
        }).catch(err => {
            console.error('Failed to flush DNS:', err);
        });
    });

    // 添加回到首页按钮的功能
    document.getElementById('home-page').addEventListener('click', () => {
        const config = getCurrentDomainConfig();
        window.location.href = config.baseUrl;
    });
})();
