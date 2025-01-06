// ==UserScript==
// @name         防盗链资源解析助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  解析防盗链保护的资源，支持图片和视频
// @author       Your name
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .anti-hotlink-dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10001;
            width: 400px;
            display: none;
        }

        .anti-hotlink-dialog h3 {
            margin: 0 0 15px 0;
            color: #2d3436;
            font-size: 16px;
        }

        .anti-hotlink-dialog input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin-bottom: 15px;
            box-sizing: border-box;
        }

        .anti-hotlink-dialog .buttons {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .anti-hotlink-dialog button {
            padding: 8px 15px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }

        .anti-hotlink-dialog .confirm {
            background: #6c5ce7;
            color: white;
        }

        .anti-hotlink-dialog .cancel {
            background: #e0e0e0;
            color: #333;
        }

        .anti-hotlink-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10002;
            display: none;
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `);

    // 创建对话框
    function createDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'anti-hotlink-dialog';
        dialog.innerHTML = `
            <h3>防盗链资源解析</h3>
            <input type="text" placeholder="请输入来源网站地址" id="refererInput">
            <div class="buttons">
                <button class="cancel">取消</button>
                <button class="confirm">解析</button>
            </div>
        `;
        document.body.appendChild(dialog);

        // 提示框
        const toast = document.createElement('div');
        toast.className = 'anti-hotlink-toast';
        document.body.appendChild(toast);

        return { dialog, toast };
    }

    // 显示提示
    function showToast(message, duration = 3000) {
        const toast = document.querySelector('.anti-hotlink-toast');
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }

    // 处理资源
    function handleResource(url, referer) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: {
                'Referer': referer,
                'User-Agent': navigator.userAgent,
                'Accept': '*/*'
            },
            responseType: 'blob',
            onload: function(response) {
                if (response.status === 200) {
                    const blob = response.response;
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = url.split('/').pop().split('?')[0];
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                    showToast('资源下载成功！');
                } else {
                    showToast('解析失败：' + response.status);
                }
            },
            onerror: function(error) {
                showToast('解析失败：' + error.error);
            }
        });
    }

    // 初始化界面和事件
    function initialize() {
        const { dialog } = createDialog();
        const currentUrl = window.location.href;

        // 点击取消按钮
        dialog.querySelector('.cancel').addEventListener('click', () => {
            dialog.style.display = 'none';
        });

        // 点击解析按钮
        dialog.querySelector('.confirm').addEventListener('click', () => {
            const referer = dialog.querySelector('#refererInput').value.trim();
            if (!referer) {
                showToast('请输入来源网站地址');
                return;
            }
            dialog.style.display = 'none';
            showToast('正在解析资源...');
            handleResource(currentUrl, referer);
        });

        // 点击对话框外关闭
        document.addEventListener('click', (e) => {
            if (!dialog.contains(e.target)) {
                dialog.style.display = 'none';
            }
        });

        // 注册菜单命令
        GM_registerMenuCommand('🔓 解析防盗链资源', () => {
            dialog.style.display = 'block';
        });
    }

    // 启动脚本
    initialize();
})(); 