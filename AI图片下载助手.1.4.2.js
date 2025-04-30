// ==UserScript==
// @name         AI图片下载助手
// @namespace    http://tampermonkey.net/
// @version      1.4.6
// @description  下载即梦AI和豆包AI的无水印大图和视频,支持手机端
// @author       You
// @match        https://jimeng.jianying.com/*
// @match        https://www.doubao.com/chat/*
// @match        https://dreamina.capcut.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      byteimg.com
// @connect      vlabvod.com
// @connect      doubao.com
// @connect      ibyteimg.com
// @connect      *
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
        let platform;

        if (url.includes('doubao.com')) {
            platform = 'doubao';
        } else if (url.includes('dreamina.capcut.com')) {
            platform = 'dreamina';
            if(url.includes('workDetailType=AiVideo') || url.includes('workDetailType=ShowcaseVideo')) {
                return { type: 'video', platform };
            }
            return { type: 'image', platform };
        } else {
            platform = 'jimeng';
            if(url.includes('workDetailType=AiVideo') || url.includes('workDetailType=ShowcaseVideo')) {
                return { type: 'video', platform };
            }
            return { type: 'image', platform };
        }

        return { type: 'image', platform };
    }

    // 获取豆包AI图片URL（返回所有大图URL）
    function getDoubaoImageUrls() {
        // 查找所有可能的图片元素
        const allImages = Array.from(document.querySelectorAll('img'));
        // 过滤出豆包AI生成的大图
        const aiGeneratedImages = allImages.filter(img => {
            return img.src &&
                (img.src.includes('byteimg.com') || img.src.includes('imagex') || img.src.includes('doubao.com')) &&
                !img.src.includes('avatar') &&
                !img.src.includes('emoji') &&
                !img.src.includes('icon') &&
                img.width > 200 &&
                img.height > 200;
        });
        // 按尺寸排序，优先选择大的图片
        const sortedImages = aiGeneratedImages.sort((a, b) => {
            const areaA = a.width * a.height;
            const areaB = b.width * b.height;
            return areaB - areaA;
        });
        // 处理URL，去除水印参数
        return sortedImages.map(img => {
            let url = img.src;
            // 保存原始URL用于备选方案
            const originalUrl = url;
            const baseUrl = url.split('?')[0];
            const hasExtension = /\.(jpg|jpeg|png|gif|webp)$/i.test(baseUrl);
            if (!hasExtension) url = url.replace(/(\?|$)/, '.png$1');
            url = url.replace(/image-dark-watermark/g, 'image');
            url = url.replace(/~\d+x\d+\.image/g, '.image');
            url = url.replace(/format=webp/g, 'format=png');
            url = url.replace(/quality=\d+/g, 'quality=100');
            // 返回处理后的URL和原始URL
            return { processedUrl: url, originalUrl: originalUrl };
        });
    }

    // 获取即夢AI图片URL
    function getJimengImageUrl() {
        // 尝试获取预览大图
        const previewImage = document.querySelector('.imageWrapper-Lc22P_ img, [role="dialog"] img, .preview-image img, .image-preview img');
        if (previewImage && previewImage.src) {
            // 解码HTML实体
            const tempElement = document.createElement('div');
            tempElement.innerHTML = previewImage.src;
            return tempElement.textContent || tempElement.innerText || previewImage.src;
        }
        
        // 尝试获取页面上的其他图片
        const images = Array.from(document.querySelectorAll('img[src*="byteimg.com"], img[src*="ibyteimg.com"]'))
            .filter(img =>
                img.src &&
                !img.src.includes('avatar') &&
                !img.src.includes('emoji') &&
                !img.src.includes('icon') &&
                img.width > 200 &&
                img.height > 200
            );
        
        if (images.length > 0) {
            // 取最大宽高的那张
            images.sort((a, b) => (b.width * b.height) - (a.width * a.height));
            const tempElement = document.createElement('div');
            tempElement.innerHTML = images[0].src;
            return tempElement.textContent || tempElement.innerText || images[0].src;
        }
        
        // 尝试获取页面上的其他图片（原有逻辑保留作为备选）
        const image = document.querySelector('.image-origin > img, video');
        if (image && image.src) {
            // 解码HTML实体
            const tempElement = document.createElement('div');
            tempElement.innerHTML = image.src;
            return tempElement.textContent || tempElement.innerText || image.src;
        }
        
        return null;
    }

    // 获取Dreamina图片URL
    function getDreaminaImageUrl() {
        // 尝试获取预览大图
        const previewImage = document.querySelector('.imageWrapper-Lc22P_ img, [role="dialog"] img, .preview-image img, .image-preview img');
        if (previewImage && previewImage.src) {
            // 解码HTML实体
            const tempElement = document.createElement('div');
            tempElement.innerHTML = previewImage.src;
            const url = tempElement.textContent || tempElement.innerText || previewImage.src;
            return { processedUrl: url, originalUrl: previewImage.src };
        }
        
        // 尝试获取页面上的其他图片
        const images = Array.from(document.querySelectorAll('img[src*="byteimg.com"], img[src*="ibyteimg.com"]'))
            .filter(img =>
                img.src &&
                !img.src.includes('avatar') &&
                !img.src.includes('emoji') &&
                !img.src.includes('icon') &&
                img.width > 200 &&
                img.height > 200
            );
        
        if (images.length > 0) {
            // 取最大宽高的那张
            images.sort((a, b) => (b.width * b.height) - (a.width * a.height));
            const tempElement = document.createElement('div');
            tempElement.innerHTML = images[0].src;
            const url = tempElement.textContent || tempElement.innerText || images[0].src;
            return { processedUrl: url, originalUrl: images[0].src };
        }
        
        return null;
    }

    // 获取当前预览图片的URL（只返回一张）
    function getCurrentImageUrl() {
        const { platform } = checkPageType();
        if (platform === 'doubao') {
            // 调用正确的函数名 getDoubaoImageUrls (复数)
            const urls = getDoubaoImageUrls();
            // 返回数组中的第一个URL，如果数组不为空
            return urls.length > 0 ? urls[0] : null;
        } else if (platform === 'jimeng') {
            // 即梦AI专用逻辑
            return { processedUrl: getJimengImageUrl(), originalUrl: getJimengImageUrl() };
        } else if (platform === 'dreamina') {
            // Dreamina平台专用逻辑
            return getDreaminaImageUrl();
        }
        return null;
    }

    // 添加WebP转JPEG的函数
    async function webpToJpeg(blob) {
        return new Promise((resolve, reject) => {
            try {
                // 创建一个图片元素来加载WebP
                const img = new Image();
                img.onload = function() {
                    // 创建canvas并绘制图像
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // 将canvas转换为JPEG Blob
                    canvas.toBlob(function(jpegBlob) {
                        resolve(jpegBlob);
                    }, 'image/jpeg', 0.95);
                };
                img.onerror = function() {
                    reject(new Error('WebP图像加载失败'));
                };
                
                // 从Blob创建URL并加载图像
                img.src = URL.createObjectURL(blob);
            } catch (e) {
                reject(e);
            }
        });
    }

    // 下载Blob对象
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // 处理图片下载（只下载当前点开的那一张）
    async function handleImageDownload(btn) {
        try {
            console.log('开始处理图片下载...');
            const { platform } = checkPageType();
            console.log('当前平台:', platform);

            // 获取原始URL
            let urlObj = getCurrentImageUrl();
            if (!urlObj) {
                console.error('获取图片URL失败');
                throw new Error('未找到可下载的图片');
            }

            let originalUrl = urlObj.originalUrl || urlObj.processedUrl;
            let processedUrl = urlObj.processedUrl || originalUrl;
            
            console.log('获取到的原始URL:', originalUrl);
            console.log('处理后的URL:', processedUrl);

            // 1. 处理HTML实体 (&amp; -> &)
            let urlForProcessing = processedUrl.replace(/&amp;/g, '&');
            console.log('处理HTML实体后的URL:', urlForProcessing);

            // 2. 准备用于下载的URL (根据平台决定是否解码)
            let urlForDownload = urlForProcessing; // 默认使用未解码的
            let decodedUrlForFilename = urlForProcessing; // 用于文件名的URL，优先尝试解码

            if (platform !== 'jimeng') {
                // 对于非即梦平台，尝试解码URL用于下载
                try {
                    urlForDownload = decodeURIComponent(urlForProcessing);
                    console.log('为非即梦平台解码URL (用于下载):', urlForDownload);
                    decodedUrlForFilename = urlForDownload; // 文件名也用解码后的
                } catch (e) {
                    console.warn(`为平台 ${platform} 解码URL失败，将使用未解码URL进行下载:`, e);
                    // 如果解码失败，下载和文件名都用未解码的
                    urlForDownload = urlForProcessing;
                    decodedUrlForFilename = urlForProcessing;
                }
            } else {
                 // 对于即梦平台，下载时不解码，但尝试解码用于获取文件名
                 console.log('即梦平台，下载URL保持不解码:', urlForDownload);
                 try {
                    decodedUrlForFilename = decodeURIComponent(urlForProcessing);
                    console.log('为即梦平台尝试解码URL (仅用于提取文件名):', decodedUrlForFilename);
                 } catch (e) {
                    console.warn('为即梦平台解码URL以获取文件名失败，将使用未解码URL尝试提取:', e);
                    decodedUrlForFilename = urlForProcessing; // 解码失败则用未解码的提取文件名
                 }
            }

            // 3. 获取文件名 (从尝试解码后的URL中提取)
            let desc = getImageDescription() || 'AI图片';
            const extMatch = decodedUrlForFilename.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
            const ext = extMatch ? extMatch[1] : 'png';
            const filename = `${desc}.${ext}`;
            console.log('生成的文件名:', filename);

            // 4. 设置请求头
            const headers = {
                'Referer': window.location.href,
                'Origin': window.location.origin,
                'Accept': 'image/webp,image/*,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'User-Agent': navigator.userAgent,
                'sec-ch-ua': `"Not A(Brand";v="99", "Google Chrome";v="${navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '120'}", "Chromium";v="${navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '120'}"`,
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'image',
                'sec-fetch-mode': 'no-cors',
                'sec-fetch-site': 'cross-site'
            };

            // 添加平台特定的请求头
            if (platform === 'jimeng') {
                headers['Cookie'] = document.cookie;
                console.log('为即梦平台添加Cookie请求头');
            } else if (platform === 'doubao') {
                // 豆包特定请求头
                headers['Cookie'] = document.cookie;
                headers['x-requested-with'] = 'XMLHttpRequest';
                console.log('为豆包平台添加特定请求头');
            } else if (platform === 'dreamina') {
                // Dreamina特定请求头
                headers['Cookie'] = document.cookie;
                headers['x-requested-with'] = 'XMLHttpRequest';
                console.log('为Dreamina平台添加特定请求头');
            }

            console.log('最终请求头:', headers);
            console.log('最终下载URL:', urlForDownload); // 确认最终用于下载的URL

            // 5. 下载图片 (使用根据平台处理过的 urlForDownload)
            await new Promise((resolve, reject) => {
                // 尝试使用fetch API直接下载（对于豆包和Dreamina可能更有效）
                if ((platform === 'doubao' || platform === 'dreamina') && typeof fetch === 'function') {
                    console.log('尝试使用fetch API下载图片');
                    
                    // 使用fetch API
                    fetch(urlForDownload, {
                        method: 'GET',
                        headers: headers,
                        credentials: 'include',
                        mode: 'cors'
                    })
                    .then(response => {
                        if (!response.ok) {
                            console.warn(`Fetch下载失败 (${response.status})，尝试备选方案`);
                            throw new Error(`Fetch下载失败，状态码: ${response.status}`);
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        // 处理WebP转换
                        if (filename.endsWith('.webp')) {
                            return webpToJpeg(blob).then(jpegBlob => {
                                const newFilename = filename.replace(/\.webp$/i, '.jpg');
                                downloadBlob(jpegBlob, newFilename);
                                console.log('WebP转换成功并下载:', newFilename);
                                return true;
                            }).catch(e => {
                                console.error('WebP转换失败，使用原格式下载', e);
                                downloadBlob(blob, filename);
                                return true;
                            });
                        } else {
                            downloadBlob(blob, filename);
                            console.log('直接下载非WebP格式:', filename);
                            return true;
                        }
                    })
                    .then(() => {
                        showSuccess(btn);
                        resolve();
                    })
                    .catch(err => {
                        console.warn('Fetch API下载失败，尝试GM_xmlhttpRequest:', err);
                        // 如果fetch失败，回退到GM_xmlhttpRequest
                        useGMXmlHttpRequest();
                    });
                } else {
                    // 直接使用GM_xmlhttpRequest
                    useGMXmlHttpRequest();
                }

                // 使用GM_xmlhttpRequest的函数
                function useGMXmlHttpRequest() {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: urlForDownload,
                        responseType: 'blob',
                        headers: headers,
                        withCredentials: true,
                        onload: async function(response) {
                            console.log(`GM_xmlhttpRequest onload - 状态码: ${response.status}`);
                            if (response.status !== 200) {
                                // 尝试使用原始URL作为备选
                                if (originalUrl && originalUrl !== urlForDownload) {
                                    console.warn(`下载处理后URL失败，尝试使用原始URL: ${originalUrl}`);
                                    tryOriginalUrl();
                                    return;
                                }
                                
                                // 失败处理逻辑
                                handleDownloadFailure(response.status);
                                return;
                            }

                            let blob = response.response;
                            // WebP转换逻辑
                            if (filename.endsWith('.webp')) {
                                try {
                                    console.log('尝试将WebP转换为JPEG');
                                    blob = await webpToJpeg(blob);
                                    const newFilename = filename.replace(/\.webp$/i, '.jpg');
                                    downloadBlob(blob, newFilename);
                                    console.log('WebP转换成功并下载:', newFilename);
                                } catch (e) {
                                    console.error('WebP转换失败，使用原格式下载', e);
                                    downloadBlob(blob, filename);
                                }
                            } else {
                                downloadBlob(blob, filename);
                                console.log('直接下载非WebP格式:', filename);
                            }

                            showSuccess(btn);
                            resolve();
                        },
                        onerror: function(err) {
                            console.error('GM_xmlhttpRequest发生错误:', err);
                            
                            // 尝试使用原始URL作为备选
                            if (originalUrl && originalUrl !== urlForDownload) {
                                console.warn(`下载处理后URL失败，尝试使用原始URL: ${originalUrl}`);
                                tryOriginalUrl();
                                return;
                            }
                            
                            // 错误处理逻辑
                            handleDownloadError(err);
                        }
                    });
                }
                
                // 尝试使用原始URL下载
                function tryOriginalUrl() {
                    console.log('尝试使用原始URL下载:', originalUrl);
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: originalUrl,
                        responseType: 'blob',
                        headers: headers,
                        withCredentials: true,
                        onload: async function(response) {
                            console.log(`使用原始URL - GM_xmlhttpRequest onload - 状态码: ${response.status}`);
                            if (response.status !== 200) {
                                // 失败处理逻辑
                                handleDownloadFailure(response.status);
                                return;
                            }

                            let blob = response.response;
                            // WebP转换逻辑
                            if (filename.endsWith('.webp')) {
                                try {
                                    blob = await webpToJpeg(blob);
                                    const newFilename = filename.replace(/\.webp$/i, '.jpg');
                                    downloadBlob(blob, newFilename);
                                } catch (e) {
                                    downloadBlob(blob, filename);
                                }
                            } else {
                                downloadBlob(blob, filename);
                            }

                            showSuccess(btn);
                            resolve();
                        },
                        onerror: function(err) {
                            // 错误处理逻辑
                            handleDownloadError(err);
                        }
                    });
                }
                
                // 处理下载失败
                function handleDownloadFailure(status) {
                    if (platform === 'jimeng') {
                        console.warn(`GM_xmlhttpRequest下载失败 (${status})，尝试直接打开图片让用户手动保存`);
                        alert('自动下载失败，即将打开图片，请在图片上右键选择"图片另存为"进行保存');
                        window.open(urlForDownload, '_blank');
                        showError(btn, new Error(`下载失败，状态码: ${status}，已尝试打开图片。`));
                        reject(new Error(`下载失败，状态码: ${status}`));
                    } else if (platform === 'doubao' || platform === 'dreamina') {
                        console.warn(`${platform}平台下载失败 (${status})，尝试直接打开图片让用户手动保存`);
                        alert('自动下载失败，即将打开图片，请在图片上右键选择"图片另存为"进行保存');
                        window.open(originalUrl || urlForDownload, '_blank');
                        showError(btn, new Error(`下载失败，状态码: ${status}，已尝试打开图片。`));
                        reject(new Error(`下载失败，状态码: ${status}`));
                    } else {
                        console.error(`平台 ${platform} 下载失败，状态码: ${status}`);
                        showError(btn, new Error(`下载失败，状态码: ${status}`));
                        reject(new Error(`下载失败，状态码: ${status}`));
                    }
                }
                
                // 处理下载错误
                function handleDownloadError(err) {
                    if (platform === 'jimeng') {
                        console.error('GM_xmlhttpRequest发生错误，尝试直接打开图片让用户手动保存:', err);
                        alert('自动下载失败，即将打开图片，请在图片上右键选择"图片另存为"进行保存');
                        window.open(urlForDownload, '_blank');
                        showError(btn, new Error('下载请求错误，已尝试打开图片。'));
                        reject(err);
                    } else if (platform === 'doubao' || platform === 'dreamina') {
                        console.error(`${platform}平台下载请求错误，尝试直接打开图片:`, err);
                        alert('自动下载失败，即将打开图片，请在图片上右键选择"图片另存为"进行保存');
                        window.open(originalUrl || urlForDownload, '_blank');
                        showError(btn, new Error('下载请求错误，已尝试打开图片。'));
                        reject(err);
                    } else {
                        console.error(`平台 ${platform} 下载请求错误:`, err);
                        showError(btn, new Error('下载请求错误'));
                        reject(err);
                    }
                }
            });
        } catch (e) {
            console.error('handleImageDownload函数捕获到错误:', e);
            // 异常处理逻辑
            const { platform } = checkPageType(); // 重新获取以防万一
            if ((platform === 'jimeng' || platform === 'doubao' || platform === 'dreamina') && e.message !== '未找到可下载的图片') {
                 console.error(`${platform}平台下载过程中发生未知错误，尝试直接打开图片:`, e);
                 alert('自动下载失败，即将打开图片，请在图片上右键选择"图片另存为"进行保存');
                 let urlObj = getCurrentImageUrl();
                 if (urlObj) {
                     let urlToOpen = urlObj.originalUrl || urlObj.processedUrl;
                     if (urlToOpen) {
                         urlToOpen = urlToOpen.replace(/&amp;/g, '&');
                         window.open(urlToOpen, '_blank');
                     }
                 }
                 showError(btn, e);
            } else if (e.message !== '未找到可下载的图片') {
                 // 其他平台或找不到图片错误
                 console.error(`平台 ${platform} 下载过程中发生未知错误:`, e);
                 showError(btn, e);
            } else {
                 // 未找到图片错误
                 showError(btn, e);
                 console.error('下载失败', e);
            }
        }
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

    // 获取图片描述词 (确保能正确处理)
    function getImageDescription() {
        const { platform } = checkPageType();
        let descElement = null;
        let text = '';
        let match = null;

        if (platform === 'doubao') {
            const messageElements = document.querySelectorAll('.message-content');
            for (const element of messageElements) {
                if (element.textContent.includes('/imagine')) {
                    const text = element.textContent.trim();
                    const match = text.match(/\/imagine\s+(.+)/);
                    if (match) {
                        return match[1].trim()
                            .replace(/[<>:"\/\\|?*]/g, '')
                            .replace(/\s+/g, '_')
                            .slice(0, 100);
                    }
                }
            }
            return '';
        } else if (platform === 'dreamina') {
            // Dreamina平台的描述词提取
            const descElement = document.querySelector('.image-description, .prompt-text, [class*="description"], [class*="prompt"]');
            if (descElement) {
                const text = descElement.textContent.trim();
                const match = text.match(/(描述|影像提示|Prompt)[:：\s]*(.+)/i);
                if (match) {
                    text = match[1].trim();
                }
                // 如果没有匹配到特定前缀，直接使用全部文本
                return text.replace(/[<>:"\/\\|?*]/g, '') // 移除非法字符
                           .replace(/\s+/g, '_') // 空格替换为下划线
                           .slice(0, 150); // 限制长度
            }
        }
        // 备选：尝试从aria-label或alt属性获取
        const imgElement = document.querySelector('.imageWrapper-Lc22P_ img, [role="dialog"] img, .preview-image img, .image-preview img, .image-origin > img');
        if(imgElement) {
            text = imgElement.getAttribute('aria-label') || imgElement.alt || '';
            if (text) {
                 return text.replace(/[<>:"\/\\|?*]/g, '')
                           .replace(/\s+/g, '_')
                           .slice(0, 150);
            }
        }

        return ''; // 默认返回空字符串
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
            console.error('下载过程中发生错误:', error);
            console.error('错误堆栈:', error.stack);
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
            btn.title = '下载无水印图片';
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

