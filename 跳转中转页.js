// ==UserScript==
// @name           Open the F**king URL Right Now (Optimized)
// @description    Instantly redirects to the destination URL, bypassing annoying intermediate pages on many websites.
// @name:zh-CN     跳转中转页
// @description:zh-CN 自动跳转某些网站不希望用户直达的外链中转页（重构优化版）。
// @author         OldPanda (Optimized by Gemini)
// @version        2.0.0
// @namespace      https://old-panda.com/
// @match          *://*/*
// @grant          GM_getValue
// @grant          GM_setValue
// @run-at         document-start
// @license        GPLv3 License

// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = window.location.href;
    const hostname = window.location.hostname;

    /**
     * @typedef {'redirect' | 'process_page' | 'custom'} RuleType
     *
     * @typedef {Object} Rule
     * @property {string | RegExp} host - The hostname or a regex to match the hostname.
     * @property {string} [path] - The path to match. Can be a string or use wildcards/regex patterns.
     * @property {RuleType} type - The type of action to take.
     * @property {string} [param] - The URL parameter that contains the destination URL (for 'redirect' type).
     * @property {Function} [customHandler] - A custom function to handle the redirection or page processing.
     */

    /**
     * @type {Rule[]}
     * An array of rules to bypass intermediate pages.
     */
    const rules = [
        // Common Redirects
        { host: /^(link\.zhihu\.com|link\.juejin\.cn|link\.csdn\.net|sspai\.com|www\.gcores\.com|developer\.aliyun\.com|cloud\.tencent\.com|gitee\.com|afdian\.net|afdian\.com|hd\.nowcoder\.com|www\.tianyancha\.com|leetcode\.cn|hellogithub\.com)$/, path: '/link', type: 'redirect', param: 'target' },
        { host: /^(www\.douban\.com|www\.oschina\.net|game\.bilibili\.com|steamcommunity\.com|www\.coolapk\.com|www\.yuque\.com|ask\.latexstudio\.net|blzxteam\.com|www\.kookapp\.cn|ref\.gamer\.com\.tw|shimo\.im|www\.baike\.com|tieba\.baidu\.com|developers\.weixin\.qq\.com)$/, type: 'redirect', param: 'url' },
        { host: 'c.pc.qq.com', type: 'redirect', param: 'url' },
        { host: 'docs.qq.com', path: '/scenario/link.html', type: 'redirect', param: 'url' },
        { host: 'www.curseforge.com', path: '/linkout', type: 'redirect', param: 'remoteUrl' },
        { host: 'www.youtube.com', path: '/redirect', type: 'redirect', param: 'q' },
        { host: 'link.ld246.com', path: '/forward', type: 'redirect', param: 'goto' },
        { host: 'link.uisdc.com', type: 'redirect', param: 'redirect' },
        { host: 'www.linkedin.com', path: '/safety/go', type: 'redirect', param: 'url' },
        { host: 't.me', path: '/iv', type: 'redirect', param: 'url' },
        { host: 'www.nodeseek.com', path: '/jump', type: 'redirect', param: 'to' },
        { host: 'www.qcc.com', path: '/web/transfer-link', type: 'redirect', param: 'link' },
        { host: /^(txc|support)\.qq\.com$/, type: 'redirect', param: 'jump' },

        // Custom Handlers for complex cases
        { host: 't.cn', type: 'custom', customHandler: handleWeiboShortlink },
        { host: 'weibo.cn', path: '/sinaurl', type: 'custom', customHandler: handleWeiboRedirect },
        { host: 'weixin110.qq.com', type: 'custom', customHandler: handleWeixinRedirect },
        { host: 'jump2.bdimg.com', path: '/safecheck/index', type: 'custom', customHandler: () => getAndRedirect('.btn', 'href') },
        { host: 'www.jianshu.com', path: '/go-wild', type: 'custom', customHandler: () => redirectFromParam('url') },
        { host: 'www.pixiv.net', path: '/jump.php', type: 'custom', customHandler: () => redirectFromParam(null) },

        // Page Processors (modify content on the page itself)
        { host: 'mp.weixin.qq.com', path: '/s', type: 'process_page', customHandler: processWeixinArticle },
        { host: /^(bbs\.nga\.cn|nga\.178\.com)$/, path: '/read.php', type: 'process_page', customHandler: () => removeAttributeFromLinks('#m_posts_c a', 'onclick') },
        { host: 'www.360doc.com', path: '/content/', type: 'process_page', customHandler: () => removeAttributeFromLinks('#articlecontent a', 'onclick') },
    ];

    /**
     * Redirects based on a URL parameter.
     * @param {string | null} paramName - The name of the parameter. If null, takes the entire query string.
     */
    function redirectFromParam(paramName) {
        let targetUrl;
        if (paramName) {
            const urlParams = new URLSearchParams(window.location.search);
            targetUrl = urlParams.get(paramName);
        } else {
            // For cases like pixiv.net/jump.php?http://example.com
            targetUrl = window.location.search.substring(1);
        }

        if (targetUrl) {
            safeRedirect(decodeURIComponent(targetUrl));
        }
    }

    /**
     * Safely redirects the page to a new URL.
     * @param {string} url - The destination URL.
     */
    function safeRedirect(url) {
        // Stop the current page from loading further.
        window.stop();
        // Add http protocol if missing
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        window.location.replace(url);
    }

    /**
     * A helper to get an attribute from a selector and redirect.
     * @param {string} selector - The CSS selector for the element.
     * @param {string} attribute - The attribute name to get the URL from.
     */
    function getAndRedirect(selector, attribute) {
        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                const url = element.getAttribute(attribute);
                if (url) {
                    safeRedirect(url);
                }
                obs.disconnect();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // --- Custom Handlers ---

    function handleWeiboShortlink() {
        // For t.cn links, they often show an intermediate page.
        // This waits for the link element to appear and then redirects.
        getAndRedirect('.wrap .link', 'textContent');
    }

    function handleWeiboRedirect() {
        // weibo.cn/sinaurl can have different params like 'u' or 'toasturl'
        const urlParams = new URLSearchParams(window.location.search);
        const targetUrl = urlParams.get('u') || urlParams.get('toasturl');
        if (targetUrl) {
            safeRedirect(decodeURIComponent(targetUrl));
        }
    }

    function handleWeixinRedirect() {
        // This page shows the URL as text.
        getAndRedirect('.weui-msg__desc', 'textContent');
    }

    // --- Page Processors ---

    function processWeixinArticle() {
        // This function handles links within WeChat articles.
        // It's designed to run after the DOM is ready.
        const makeLinksClickable = () => {
            const contentArea = document.querySelector('#js_content');
            if (!contentArea) return;

            const urlRegex = /https?:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=%]+/g;
            const sections = contentArea.querySelectorAll('p, section');

            sections.forEach(section => {
                // Avoid processing code blocks
                if (section.querySelector('pre, code')) return;

                // Check if this part of content has already been processed.
                if (section.dataset.processedByUrlOpener) return;
                section.dataset.processedByUrlOpener = 'true';

                const textNodes = [];
                // Find all text nodes within the section
                const walk = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while(node = walk.nextNode()) {
                    // Make sure it's not inside an existing link
                    if(node.parentElement.tagName !== 'A'){
                       textNodes.push(node);
                    }
                }

                textNodes.forEach(textNode => {
                    const text = textNode.textContent;
                    const matches = text.match(urlRegex);

                    if (matches) {
                        const fragment = document.createDocumentFragment();
                        let lastIndex = 0;

                        matches.forEach(match => {
                            const index = text.indexOf(match, lastIndex);
                            // Add text before the link
                            fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
                            // Create and add the link
                            const a = document.createElement('a');
                            a.href = match;
                            a.textContent = match;
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            fragment.appendChild(a);

                            lastIndex = index + match.length;
                        });
                        // Add any remaining text
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                        textNode.parentNode.replaceChild(fragment, textNode);
                    }
                });
            });
        };

        // Run once on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', makeLinksClickable);
        } else {
            makeLinksClickable();
        }

        // Use MutationObserver to handle dynamically loaded content
        const observer = new MutationObserver(makeLinksClickable);
        const targetNode = document.getElementById('js_content') || document.body;
        observer.observe(targetNode, { childList: true, subtree: true });
    }

    function removeAttributeFromLinks(selector, attribute) {
         const observer = new MutationObserver(() => {
            document.querySelectorAll(selector).forEach(link => {
                if (link.hasAttribute(attribute)) {
                    link.removeAttribute(attribute);
                }
            });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // --- Main Logic ---

    function main() {
        for (const rule of rules) {
            const hostMatch = typeof rule.host === 'string' ? hostname === rule.host : rule.host.test(hostname);

            if (hostMatch) {
                const pathMatch = !rule.path || currentUrl.includes(rule.path);
                if (pathMatch) {
                    switch (rule.type) {
                        case 'redirect':
                            redirectFromParam(rule.param);
                            return; // Stop after first match
                        case 'custom':
                            rule.customHandler();
                            return; // Stop after first match
                        case 'process_page':
                             // For page processors, we don't return, as multiple might apply.
                             // The logic is attached to DOM events, so it will run when ready.
                            rule.customHandler();
                            break;
                    }
                }
            }
        }
    }

    // Run the script
    main();

})();
