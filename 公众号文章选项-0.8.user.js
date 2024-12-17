// ==UserScript==
// @name               Wechat Article Menu
// @name:zh-CN         公众号文章选项
// @description        Wechat Article Menu, Show Some Useful Options.
// @description:zh-CN  微信公众号文章菜单选项，展示一些有用的选项。
// @namespace          https://www.runningcheese.com
// @version            0.8
// @author             aniyagigi
// @match              https://mp.weixin.qq.com/s/*
// @match              https://mp.weixin.qq.com/s?__biz=*
// @grant              none
// @run-at             document-end
// ==/UserScript==

(function() {
    'use strict';

    // Create menu container
    const menuContainer = document.createElement('div');
    menuContainer.id = 'wechat-article-menu';
    menuContainer.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: white;
        border: 1px solid #d9dadc;
        padding: 10px;
        z-index: 10000;
        display: none;
    `;

    // Menu options
    const menuOptions = [
        {
            title: '文章封面',
            action: () => {
                const coverUrl =
                    document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                    document.querySelector('meta[property="twitter:image"]')?.getAttribute('content') ||
                    document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

                if (coverUrl) {
                    window.open(coverUrl, '_blank');
                } else {
                    alert('无法找到文章封面');
                }
            }
        },
        {
            title: '文章摘要',
            action: () => {
                const summary =
                    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                    document.querySelector('meta[property="og:description"]')?.getAttribute('content');

                if (summary) {
                    prompt('文章摘要：', summary);
                } else {
                    alert('无法找到文章摘要');
                }
            }
        },
        {
            title: '原始链接',
            action: () => {
                const urlParams = new URLSearchParams(window.location.search);
                const biz = urlParams.get('__biz') || '';
                const mid = urlParams.get('mid') || '';
                const sn = urlParams.get('sn') || '';
                const link = `https://mp.weixin.qq.com/s?__biz=${biz}&mid=${mid}&sn=${sn}`;

                prompt('原始链接：', link);
            }
        },
        {
            title: '历史消息链接',
            action: () => {
                const urlParams = new URLSearchParams(window.location.search);
                const biz = urlParams.get('__biz') || '';
                const link = `https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=${biz}#wechat_redirect`;

                prompt('历史消息链接：', link);
            }
        },
        {
            title: '解除复制限制',
            action: () => {
                // Remove copy restrictions
                document.oncopy = null;
                document.oncontextmenu = null;

                const style = document.createElement('style');
                style.textContent = `
                    * {
                        -webkit-user-select: text !important;
                        -moz-user-select: text !important;
                        user-select: text !important;
                    }
                `;
                document.head.appendChild(style);

                alert('已解除复制限制');
            }
        }
    ];

    // Create menu buttons
    menuOptions.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.title;
        button.style.cssText = `
            display: block;
            width: 100%;
            margin: 5px 0;
            padding: 5px;
        `;
        button.addEventListener('click', () => {
            option.action();
            menuContainer.style.display = 'none';
        });
        menuContainer.appendChild(button);
    });

    // Toggle menu button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '📋';
    toggleButton.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 10001;
        background: white;
        border: 1px solid #d9dadc;
        padding: 5px;
        cursor: pointer;
    `;

    toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuContainer.style.display =
            menuContainer.style.display === 'none' ? 'block' : 'none';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuContainer.contains(e.target) && e.target !== toggleButton) {
            menuContainer.style.display = 'none';
        }
    });

    // Add elements to document
    document.body.appendChild(toggleButton);
    document.body.appendChild(menuContainer);
})()