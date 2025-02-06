// ==UserScript==
// @name         AI图片下载助手-移动端支持
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  下载即梦AI和豆包AI的无水印大图和视频,支持手机端
// @author       You
// @match        https://jimeng.jianying.com/*
// @match        https://www.doubao.com/chat/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      byteimg.com
// @connect      vlabvod.com
// @connect      doubao.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式(增加了移动端适配)
    GM_addStyle(`
        .download-btn {
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            width: 40px;
            height: 40px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            padding: 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            /* 移动端适配 */
            @media (max-width: 768px) {
                width: 50px;
                height: 50px;
                right: 15px;
                top: 85%;
                transform: translateY(0);
            }
        }
        .download-btn:hover {
            background: #45a049;
            transform: translateY(-50%) scale(1.1);
        }
        .download-btn:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        .download-btn svg {
            width: 20px;
            height: 20px;
        }
        .download-btn.success {
            background: #45a049;
        }
        .download-btn.error {
            background: #f44336;
        }
        .download-btn .loading {
            width: 20px;
            height: 20px;
            border: 2px solid #ffffff;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `);

    // 下载图标SVG
    const downloadIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
    `;

    // 成功图标SVG
    const successIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    `;

    // 错误图标SVG
    const errorIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12" y2="16"/>
        </svg>
    `;

    // 检查页面类型和平台
    function checkPageType() {
        const url = window.location.href;
        const platform = url.includes('doubao.com') ? 'doubao' : 'jimeng';

        if (platform === 'jimeng') {
            if(url.includes('workDetailType=AiVideo') || url.includes('workDetailType=ShowcaseVideo')) {
                return { type: 'video', platform };
            }
            return { type: 'image', platform };
        } else {
            return { type: 'image', platform };
        }
    }

    // 获取豆包AI图片URL
    function getDoubaoImageUrl() {
        // 首先尝试获取预览图片
        const previewImg = document.querySelector('.semi-image-preview-image-img');
        if (previewImg && previewImg.src) {
            return previewImg.src;
        }

        // 如果没有预览图,则获取对话中的图片
        const images = document.querySelectorAll('img[src*="imagex-sign.byteimg.com"]');
        for (const img of images) {
            if (img.src && !img.src.includes('avatar')) {
                return img.src;
            }
        }

        // 如果上面都没找到,尝试其他可能的选择器
        const allImages = document.querySelectorAll('img[src*="byteimg.com"]');
        for (const img of allImages) {
            if (img.src &&
                !img.src.includes('avatar') &&
                !img.src.includes('emoji') &&
                !img.src.includes('icon')) {
                return img.src;
            }
        }

        return null;
    }

    // 获取即夢AI图片URL
    function getJimengImageUrl() {
        const image = document.querySelector('.image-origin > img, .preview-image img, video');
        if (image && image.src) {
            return image.src;
        }
        return null;
    }

    // 获取图片描述词
    function getImageDescription() {
        const { platform } = checkPageType();

        if (platform === 'doubao') {
            const messageElements = document.querySelectorAll('.message-content');
            for (const element of messageElements) {
                if (element.textContent.includes('/imagine')) {
                    const text = element.textContent.trim();
                    const match = text.match(/\/imagine\s+(.+)/);
                    if (match) {
                        return match[1].trim()
                            .replace(/[<>:"/\\|?*]/g, '')
                            .replace(/\s+/g, '_')
                            .slice(0, 100);
                    }
                }
            }
            return '';
        }

        // 即夢AI平台的描述词提取
        const descElement = document.querySelector('.image-description, .prompt-text, [class*="description"], [class*="prompt"]');
        if (descElement) {
            const text = descElement.textContent.trim();
            const match = text.match(/(描述|提示)词[::]\s*(.+)/);
            if (match) {
                return match[2].trim()
                    .replace(/[<>:"/\\|?*]/g, '')
                    .replace(/\s+/g, '_')
                    .slice(0, 100);
            }
        }
        return '';
    }

    // WebP转JPEG函数
    async function webpToJpeg(webpBlob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.95);
                URL.revokeObjectURL(img.src);
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('图片转换失败'));
            };
            img.src = URL.createObjectURL(webpBlob);
        });
    }

    // 获取当前预览图片的URL
    function getCurrentImageUrl() {
        const { platform } = checkPageType();

        if (platform === 'doubao') {
            return getDoubaoImageUrl();
        }

        // 原有的即梦AI逻辑
        const previewImage = document.querySelector('[role="dialog"] img, .preview-image img');
        if (previewImage && previewImage.src) {
            return previewImage.src.replace(/resize:\d+:\d+/, 'resize:2048:2048');
        }
        return null;
    }

    // 获取视频URL
    function getVideoUrl() {
        // 尝试多种选择器来定位视频元素
        const videoSelectors = [
            'video source',
            'video[src]',
            '[class*="player"] video',
            '[class*="video"] video',
            '.showcase-video video',
            '.story-video video'
        ];

        // 首先尝试直接获取视频元素
        for (const selector of videoSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const url = element.src || element.currentSrc;
                if (url) return url;
            }
        }

        // 如果直接获取失败，尝试从网页内容中提取
        const pageContent = document.documentElement.innerHTML;
        const urlPatterns = [
            /(https?:\/\/[^"']*vlabvod\.com[^"']*)/,
            /(https?:\/\/[^"']*\.mp4[^"']*)/,
            /(https?:\/\/[^"']*video[^"']*)/
        ];

        for (const pattern of urlPatterns) {
            const match = pageContent.match(pattern);
            if (match) return match[0];
        }

        return null;
    }

    // 处理图片下载
    async function handleImageDownload(btn) {
        try {
            const originalUrl = getCurrentImageUrl();
            if (!originalUrl) {
                throw new Error('未找到可下载的图片');
            }

            GM_xmlhttpRequest({
                method: 'GET',
                url: originalUrl,
                responseType: 'blob',
                headers: {
                    'Referer': window.location.href,
                    'Origin': window.location.origin
                },
                onload: async function(response) {
                    try {
                        if (response.status !== 200) {
                            throw new Error('图片下载失败');
                        }

                        const jpegBlob = await webpToJpeg(response.response);
                        const url = URL.createObjectURL(jpegBlob);

                        const description = getImageDescription();
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const platform = checkPageType().platform;
                        const filename = description
                            ? `${description}.jpg`
                            : `${platform}_${timestamp}.jpg`;

                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        showSuccess(btn);
                    } catch (error) {
                        throw new Error('图片处理失败');
                    }
                },
                onerror: function() {
                    throw new Error('网络请求失败');
                }
            });
        } catch (error) {
            showError(btn, error);
        }
    }

    // 处理视频下载
    async function handleVideoDownload(btn) {
        try {
            let videoUrl = getVideoUrl();
            if (!videoUrl) {
                // 等待视频加载
                await new Promise(resolve => setTimeout(resolve, 1500));
                videoUrl = getVideoUrl();
            }

            if (!videoUrl) {
                throw new Error('未找到可下载的视频，请等待视频加载完成后重试');
            }

            GM_xmlhttpRequest({
                method: 'GET',
                url: videoUrl,
                headers: {
                    'Referer': 'https://jimeng.jianying.com/',
                    'Origin': 'https://jimeng.jianying.com'
                },
                responseType: 'blob',
                onload: function(response) {
                    if (response.status === 200) {
                        const blob = new Blob([response.response], { type: 'video/mp4' });
                        const url = URL.createObjectURL(blob);
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `jimeng_video_${timestamp}.mp4`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showSuccess(btn);
                    } else {
                        throw new Error('视频下载失败');
                    }
                },
                onerror: function() {
                    throw new Error('网络请求失败，可能是防盗链导致');
                }
            });
        } catch (error) {
            showError(btn, error);
        }
    }

    // 显示成功状态
    function showSuccess(btn) {
        btn.innerHTML = successIcon;
        btn.classList.add('success');
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = downloadIcon;
            btn.classList.remove('success');
        }, 1500);
    }

    // 显示错误状态
    function showError(btn, error) {
        console.error('下载出错:', error);
        alert(error.message || '下载失败,请重试');
        btn.disabled = false;
        btn.innerHTML = downloadIcon;
        btn.classList.remove('success');
        btn.classList.add('error');
        setTimeout(() => {
            btn.classList.remove('error');
        }, 1500);
    }

    // 处理下载
    async function handleDownload(event) {
        const btn = event.target.closest('.download-btn');
        if (btn.disabled) return;

        btn.disabled = true;
        btn.innerHTML = `<span class="loading"></span>`;

        const { type } = checkPageType();
        if (type === 'video') {
            await handleVideoDownload(btn);
        } else {
            await handleImageDownload(btn);
        }
    }

    // 创建或更新下载按钮
    function createOrUpdateButton() {
        let btn = document.querySelector('.download-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'download-btn';
            btn.innerHTML = downloadIcon;
            btn.addEventListener('click', handleDownload);
            document.body.appendChild(btn);
        }
        return btn;
    }

    // 监听页面变化
    const observer = new MutationObserver(() => {
        const { platform } = checkPageType();

        if (platform === 'doubao') {
            // 检查是否有预览图片或普通图片
            const hasPreviewImage = document.querySelector('.semi-image-preview-image-img');
            const hasNormalImage = document.querySelector('img[src*="imagex-sign.byteimg.com"]');
            const hasVideo = document.querySelector('video');

            if (hasPreviewImage || hasNormalImage || hasVideo) {
                createOrUpdateButton();
            } else {
                const btn = document.querySelector('.download-btn');
                if (btn) btn.remove();
            }
        } else {
            const previewDialog = document.querySelector('[role="dialog"] img, .preview-image, video');
            if (previewDialog) {
                createOrUpdateButton();
            } else {
                const btn = document.querySelector('.download-btn');
                if (btn) btn.remove();
            }
        }
    });

    // 开始监听
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 初始化检查
    createOrUpdateButton();
})();

