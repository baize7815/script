// ==UserScript==
// @name         网站图片解除限制
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  解除网站上图片的右键和拖拽限制
// @author       您的名字
// @match        https://www.xiaohongshu.com/*
// @match        https://www.ccasy.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 解除右键限制
    document.addEventListener('contextmenu', function(event) {
        if (event.target.tagName === 'IMG') {
            event.stopPropagation();
            return true; // 允许默认右键菜单
        }
    }, true);

    // 解除拖拽限制
    document.addEventListener('dragstart', function(event) {
        if (event.target.tagName === 'IMG') {
            event.stopPropagation();
            event.dataTransfer.setData('text/plain', event.target.src);
        }
    }, true);

    // 移除可能的其他保护措施
    document.addEventListener('selectstart', function(event) {
        event.stopPropagation();
        return true;
    }, true);

    // 移除禁用复制的CSS属性
    const style = document.createElement('style');
    style.textContent = `
        img {
            -webkit-user-select: auto !important;
            -moz-user-select: auto !important;
            -ms-user-select: auto !important;
            user-select: auto !important;
            pointer-events: auto !important;
        }
    `;
    document.head.appendChild(style);
})();