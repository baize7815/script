// 广告屏蔽脚本 - 更精准的版本
(function() {
    // 更精确的广告选择器，减少误伤
    const adSelectors = [
        // 明确的广告标识
        '[class*="ad-"][class*="banner"]', '[class*="ad-"][class*="popup"]', 
        '[id*="ad-"][id*="banner"]', '[id*="ad-"][id*="popup"]',
        // 特定广告服务
        '.adsbygoogle', '#ad-container', '.ad-container:not(.content):not(.main)',
        // 弹窗和遮罩广告 - 更精确的匹配
        '.popup-ad', '.modal-ad', '.overlay-ad', '[class*="popup-ad"]', 
        // 广告框架 - 只匹配明确的广告来源
        'iframe[src*="googleadservices"]', 'iframe[src*="doubleclick"]', 
        'iframe[src*="ad."][src*="banner"]', 'iframe[src*="ads."][src*="banner"]', 
        // 广告图片 - 更明确的匹配
        'img[src*="ad."][src*="banner"]', 'img[src*="ads."][src*="banner"]',
        // 明确的广告标识
        '[class*="advertisement"]', '[id*="advertisement"]'
    ];
    
    // 白名单选择器 - 这些元素不会被屏蔽
    const safeSelectors = [
        '.content', '.main', '.article', '.post', 
        '.navigation', '.menu', '.header', '.footer',
        '#content', '#main', '#navigation', '#menu'
    ];
    
    /**
     * 检查元素是否在白名单中
     * @param {Element} element - 要检查的元素
     * @returns {boolean} - 如果元素在白名单中返回true
     */
    function isInSafeList(element) {
        // 检查元素自身及其父元素是否匹配白名单
        let current = element;
        while (current && current !== document.body) {
            for (const selector of safeSelectors) {
                if (current.matches && current.matches(selector)) {
                    return true;
                }
                
                // 检查class和id中是否包含白名单关键词
                const classNames = current.className.split(' ');
                for (const className of classNames) {
                    if (className && safeSelectors.some(s => s.replace('.', '') === className)) {
                        return true;
                    }
                }
                
                if (current.id && safeSelectors.some(s => s.replace('#', '') === current.id)) {
                    return true;
                }
            }
            current = current.parentElement;
        }
        return false;
    }
    
    /**
     * 更智能地移除广告元素
     */
    function removeAds() {
        // 合并所有选择器并查找匹配的元素
        const adElements = document.querySelectorAll(adSelectors.join(','));
        
        // 移除找到的广告元素，但先检查是否在白名单中
        adElements.forEach(element => {
            if(element && element.parentNode && !isInSafeList(element)) {
                console.log('移除广告元素:', element);
                element.parentNode.removeChild(element);
            }
        });
        
        // 更智能地移除固定定位元素
        const fixedElements = document.querySelectorAll('div[style*="position: fixed"]');
        fixedElements.forEach(element => {
            // 只有在确认是广告时才移除
            if(!isInSafeList(element) && 
               (element.innerHTML.toLowerCase().includes('advertisement') || 
                element.innerHTML.toLowerCase().includes('advertisement') ||
                element.innerHTML.toLowerCase().includes('广告') ||
                element.innerHTML.toLowerCase().includes('赞助'))) {
                console.log('移除固定定位广告元素:', element);
                element.parentNode.removeChild(element);
            }
        });
        
        // 更智能地处理body的overflow属性
        const visibleElements = document.querySelectorAll('body > *:not(script):not(style):not(noscript)');
        if(document.body.style.overflow === 'hidden' && visibleElements.length > 1) {
            document.body.style.overflow = 'auto';
        }
    }
    
    /**
     * 更智能地阻止广告脚本加载
     */
    function blockAdScripts() {
        // 创建一个新的空白函数来替换原始的广告函数
        const emptyFunc = function() { return true; };
        
        // 更精确的广告相关对象列表
        const adObjects = [
            'googletag', 'googlefc', 'googleAdSlots', 
            'amzn_assoc', 'criteo', 'taboola', 'outbrain'
        ];
        
        // 替换广告对象
        adObjects.forEach(obj => {
            if(window[obj] && typeof window[obj] !== 'function') {
                console.log('屏蔽广告对象:', obj);
                window[obj] = emptyFunc;
            }
        });
        
        // 更智能地阻止脚本加载
        const originalAppendChild = Element.prototype.appendChild;
        Element.prototype.appendChild = function(element) {
            if(element.tagName === 'SCRIPT') {
                const src = element.src || '';
                // 只阻止明确的广告脚本
                if(src.includes('doubleclick') || 
                   src.includes('googleadservices') ||
                   src.includes('adserver') ||
                   (src.includes('ad.') && src.includes('banner'))) {
                    console.log('阻止广告脚本加载:', src);
                    return document.createComment('已屏蔽的广告脚本: ' + src);
                }
            }
            return originalAppendChild.call(this, element);
        };
    }
    
    /**
     * 创建自定义样式来隐藏广告
     */
    function addAdBlockStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 只隐藏明确的广告元素，而不是全部隐藏 */
            ${adSelectors.join(', ')} {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * 初始化函数
     */
    function init() {
        console.log('广告屏蔽脚本已启动');
        
        // 添加广告屏蔽样式
        addAdBlockStyles();
        
        // 阻止广告脚本
        blockAdScripts();
        
        // 立即执行一次广告移除
        removeAds();
        
        // 设置定时器定期检查和移除新出现的广告
        setInterval(removeAds, 2000);  // 增加间隔，减少性能影响
        
        // 监听DOM变化，处理动态加载的广告
        const observer = new MutationObserver(mutations => {
            let shouldRemoveAds = false;
            
            mutations.forEach(mutation => {
                if(mutation.addedNodes.length > 0) {
                    // 检查新添加的节点是否可能是广告
                    for(const node of mutation.addedNodes) {
                        if(node.nodeType === 1) {  // 元素节点
                            // 检查是否匹配广告选择器且不在白名单中
                            for(const selector of adSelectors) {
                                if(node.matches && node.matches(selector) && !isInSafeList(node)) {
                                    shouldRemoveAds = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            });
            
            if(shouldRemoveAds) {
                removeAds();
            }
        });
        
        // 开始观察文档变化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // 当DOM加载完成后执行初始化
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
