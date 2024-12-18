// ==UserScript==
// @name         网站弹窗广告拦截
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  智能拦截弹窗广告，保持网页功能正常
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

    // 智能拦截函数
    function smartBlockPopups() {
        // 复杂的选择器，增加了更多判断
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
                // 更智能的移除判断
                if (isReallySafeToRemove(el)) {
                    // 先隐藏，而不是直接移除
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.style.opacity = '0';

                    // 尝试移除遮罩效果
                    el.style.pointerEvents = 'none';
                }
            });
        });
    }

    // 安全移除判断函数
    function isReallySafeToRemove(element) {
        // 检查元素是否是真正的广告弹窗
        if (!element) return false;

        // 排除可能影响网页功能的关键元素
        const criticalClasses = [
            'login-modal',
            'user-agreement',
            'essential-popup',
            'system-notice'
        ];

        const criticalIds = [
            'login-modal',
            'user-agreement',
            'essential-popup',
            'system-notice'
        ];

        // 检查类名和ID
        const elementClass = element.className || '';
        const elementId = element.id || '';

        const isCritical = criticalClasses.some(cls => elementClass.includes(cls)) ||
                           criticalIds.some(id => elementId.includes(id));

        if (isCritical) return false;

        // 检查弹窗是否包含重要内容
        const importantTextKeywords = [
            '协议', '隐私', '用户', '系统',
            'agreement', 'privacy', 'notice',
            'system', 'warning'
        ];

        const text = element.innerText || '';
        const hasImportantText = importantTextKeywords.some(keyword =>
            text.toLowerCase().includes(keyword)
        );

        if (hasImportantText) return false;

        // 检查元素大小，过小的可能是广告
        const rect = element.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 50) return true;

        // 检查是否包含明显的广告特征
        const adKeywords = [
            'ad', 'advertisement', '广告',
            'sponsor', '推广', 'banner'
        ];

        const isAdElement = adKeywords.some(keyword =>
            (elementClass.toLowerCase().includes(keyword) ||
             elementId.toLowerCase().includes(keyword))
        );

        return isAdElement;
    }

    // 恢复页面可交互性
    function restorePageInteractivity() {
        // 移除可能阻止页面交互的样式
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';

        // 尝试移除所有遮罩层
        const masks = document.querySelectorAll('.mask, .overlay, [class*="mask"]');
        masks.forEach(mask => {
            mask.style.display = 'none';
            mask.style.visibility = 'hidden';
        });
    }

    // 初始化拦截
    function initialize() {
        // 延迟执行，确保页面完全加载
        setTimeout(() => {
            smartBlockPopups();
            restorePageInteractivity();
        }, 1000);
    }

    // 监听页面变化
    const observer = new MutationObserver(() => {
        smartBlockPopups();
        restorePageInteractivity();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 页面加载时初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
