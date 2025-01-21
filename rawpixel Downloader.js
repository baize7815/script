// ==UserScript==
// @name         rawpixel Downloader
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Download images from thumbnailUrl links
// @match        *://*/*
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    // 创建下载按钮
    const button = document.createElement('div');
    button.innerHTML = '⬇️';
    button.style.cssText = `
        position: fixed;
        left: 20px;
        bottom: 20px;
        width: 35px;
        height: 35px;
        background-color: #4CAF50;
        color: white;
        border-radius: 50%;
        text-align: center;
        line-height: 35px;
        cursor: pointer;
        z-index: 9999;
        font-size: 20px;
    `;
    document.body.appendChild(button);

    // 创建进度条
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        left: 70px;
        bottom: 20px;
        width: 200px;
        height: 35px;
        background-color: #f3f3f3;
        border-radius: 5px;
        display: none;
        z-index: 9999;
    `;
    const progressInner = document.createElement('div');
    progressInner.style.cssText = `
        width: 0%;
        height: 100%;
        background-color: #4CAF50;
        border-radius: 5px;
        transition: width 0.5s;
    `;
    progressBar.appendChild(progressInner);
    document.body.appendChild(progressBar);

    // 下载函数
    function downloadThumbnails() {
        const links = document.querySelectorAll('link[property="thumbnailUrl"]');
        const totalImages = links.length;
        let downloadedImages = 0;

        if (totalImages === 0) {
            alert('没有找到thumbnailUrl链接');
            return;
        }

        progressBar.style.display = 'block';

        links.forEach((link, index) => {
            const src = link.getAttribute('href');
            if (src) {
                const filename = src.split('/').pop();
                setTimeout(() => {
                    GM_download(src, filename);
                    downloadedImages++;
                    progressInner.style.width = `${(downloadedImages / totalImages) * 100}%`;
                    if (downloadedImages === totalImages) {
                        setTimeout(() => {
                            progressBar.style.display = 'none';
                            progressInner.style.width = '0%';
                        }, 1000);
                    }
                }, index * 200);  // 每200ms下载一张图片，避免同时发起过多请求
            }
        });
    }

    // 添加点击事件
    button.addEventListener('click', downloadThumbnails);
})();
