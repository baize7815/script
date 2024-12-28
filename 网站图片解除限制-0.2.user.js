
// ==UserScript==
// @name         网站图片解除限制增强版
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  增强版解除网站上图片的右键和拖拽限制
// @author       您的名字
// @match        https://www.xiaohongshu.com/*
// @match        https://www.ccasy.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 移除全局事件监听器
    function removeEventListeners() {
        const events = ['contextmenu', 'copy', 'cut', 'paste', 'keydown', 'mousedown', 'selectstart', 'dragstart'];
        events.forEach(event => {
            window.addEventListener(event, function(e) {
                e.stopPropagation();
                return true;
            }, true);
        });
    }

    // 定期检查并移除限制
    function removeRestrictions() {
        // 移除 body 和 document 上的事件监听器
        document.body && (document.body.oncontextmenu = null);
        document.oncontextmenu = null;

        // 遍历所有元素移除限制
        const elements = document.getElementsByTagName('*');
        for (let element of elements) {
            element.oncontextmenu = null;
            element.onselectstart = null;
            element.ondragstart = null;
            element.onmousedown = null;
            element.style.userSelect = 'auto';
            element.style.webkitUserSelect = 'auto';
            element.style.MozUserSelect = 'auto';
            element.style.msUserSelect = 'auto';

            // 移除可能的阻止复制属性
            element.removeAttribute('unselectable');
            element.removeAttribute('oncontextmenu');
            element.removeAttribute('ondragstart');
            element.removeAttribute('onselectstart');
        }
    }

    // 注入CSS样式
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
                user-select: auto !important;
                pointer-events: auto !important;
            }

            img {
                pointer-events: auto !important;
                -webkit-user-drag: auto !important;
                -khtml-user-drag: auto !important;
                -moz-user-drag: auto !important;
                -o-user-drag: auto !important;
                user-drag: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    // 初始化函数
    function initialize() {
        removeEventListeners();
        injectStyles();

        // 页面加载完成后执行
        document.addEventListener('DOMContentLoaded', function() {
            removeRestrictions();
            // 定期检查并移除新添加的限制
            setInterval(removeRestrictions, 1000);
        });
    }

    // 执行初始化
    initialize();

    // 重写可能被覆盖的函数
    window.addEventListener('load', function() {
        Object.defineProperty(document, 'oncontextmenu', {
            get: function() {
                return null;
            },
            set: function() {
                return null;
            }
        });
    });
})();
