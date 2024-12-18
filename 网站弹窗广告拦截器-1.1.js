// ==UserScript==
// @name         网站弹窗广告拦截器
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  拦截花瓣、站酷、千图网、享设计、堆友、稿定设计、3D溜溜等网站的弹窗广告
// @match        *://huaban.com/*
// @match        *://zcool.com.cn/*
// @match        *://qiantu.com/*
// @match        *://xiangshejia.com/*
// @match        *://www.duiyou.cn/*
// @match        *://gaoding.com/*
// @match        *://3dliu.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 通用的弹窗拦截函数
    function blockPopups() {
        // 扩展的弹窗选择器
        const popupSelectors = [
            '.modal', '.popup', '.dialog', '.ad-popup',
            '#ad-modal', '[id*="popup"]', '[class*="modal"]',
            '[class*="popup"]', '[class*="dialog"]',
            '.modal-backdrop', '.modal-mask',
            '[id*="modal"]', '.overlay',
            '.float-layer', '.float-box',
            '.ad-container', '.advertising-box'
        ];

        popupSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                // 完全移除弹窗
                el.remove();

                // 移除可能阻挡页面的遮罩层
                const overlays = document.querySelectorAll('.overlay, .mask, [class*="mask"]');
                overlays.forEach(overlay => overlay.remove());
            });
        });

        // 禁用特定事件
        document.addEventListener('contextmenu', function(e) {
            // 阻止右键菜单弹窗
            e.preventDefault();
        }, true);
    }

    // 初始页面加载时执行
    blockPopups();

    // 持续监控页面变化
    const observer = new MutationObserver(blockPopups);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 额外的针对性拦截
    function websiteSpecificBlock() {
        // 各网站特定拦截规则
        const siteSpecificSelectors = {
            'huaban.com': [
                '#huaban-modal',
                '.huaban-popup',
                '#user-guide-popup'
            ],
            'zcool.com.cn': [
                '.zcool-ad-popup',
                '#zcool-guide-modal',
                '.zcool-vip-popup'
            ],
            'qiantu.com': [
                '#qiantu-popup',
                '.qiantu-ad-modal',
                '#download-guide'
            ],
            'xiangshejia.com': [
                '.xsj-popup',
                '#xsj-ad-modal',
                '.xsj-guide-layer'
            ],
            'duiyou.cn': [
                '.duiyou-popup',
                '#duiyou-ad-modal',
                '.duiyou-guide'
            ],
            'gaoding.com': [
                '.gaoding-popup',
                '#gaoding-ad-modal',
                '.gaoding-guide-layer'
            ],
            '3dliu.com': [
                '.3dliu-popup',
                '#3dliu-ad-modal',
                '.3dliu-guide-layer'
            ]
        };

        // 获取当前域名
        const hostname = window.location.hostname;

        // 遍历并移除匹配的选择器
        Object.keys(siteSpecificSelectors).forEach(domain => {
            if (hostname.includes(domain)) {
                siteSpecificSelectors[domain].forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => el.remove());
                });
            }
        });

        // 通用广告和引导层拦截
        const generalAdSelectors = [
            '[class*="guide-layer"]',
            '[id*="guide-modal"]',
            '.vip-popup',
            '.download-guide',
            '[class*="advertising"]'
        ];

        generalAdSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
    }

    // 执行网站特定拦截
    websiteSpecificBlock();

    // 禁用一些常见的广告加载脚本
    function disableAdScripts() {
        const scriptsToBlock = [
            'ad.js',
            'advertisement.js',
            'popunder.js',
            'tracker.js'
        ];

        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            if (script.src && scriptsToBlock.some(badScript => script.src.includes(badScript))) {
                script.remove();
            }
        }
    }

    // 执行广告脚本禁用
    disableAdScripts();
})();