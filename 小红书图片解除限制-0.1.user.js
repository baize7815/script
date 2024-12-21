// ==UserScript==
// @name         小红书图片解除限制
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  解除小红书上图片的右键和拖拽限制
// @author       您的名字
// @match        https://www.xiaohongshu.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 解除右键限制
    document.addEventListener('contextmenu', function(event) {
        if (event.target.tagName === 'IMG') {
            event.stopPropagation();
        }
    }, true);

    // 解除拖拽限制
    document.addEventListener('dragstart', function(event) {
        if (event.target.tagName === 'IMG') {
            event.dataTransfer.setData('text/plain', event.target.src);
        }
    }, true);
})();
