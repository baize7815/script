// 广告屏蔽脚本 - 在网页加载后自动执行
(function() {
    // 通用广告选择器
    const adSelectors = [
        // 常见广告容器
        '[class*="ad-"]', '[class*="ads-"]', '[class*="advertisement"]', 
        '[id*="ad-"]', '[id*="ads-"]', '[id*="advertisement"]',
        // 弹窗相关
        '.popup', '.modal-ad', '.overlay-ad', '[class*="popup"]', 
        // 常见广告框架
        'iframe[src*="googleadservices"]', 'iframe[src*="doubleclick"]', 
        'iframe[src*="ad."]', 'iframe[src*="ads."]', 'iframe[src*="advert"]',
        // 广告图片和横幅
        'img[src*="ad."]', 'img[src*="ads."]', 'img[src*="advert"]',
        'div[class*="banner"]', '[id*="banner"]',
        // 特定广告容器
        '.adsbygoogle', '#ad-container', '.ad-container', '.ad-wrapper',
        // 弹出层和遮罩
        '.modal', '.overlay', '.mask', '[class*="mask"]'
    ];
    
    // 移除广告元素的函数
    function removeAds() {
        // 合并所有选择器并查找匹配的元素
        const adElements = document.querySelectorAll(adSelectors.join(','));
        
        // 移除找到的广告元素
        adElements.forEach(element => {
            if(element && element.parentNode) {
                console.log('移除广告元素:', element);
                element.parentNode.removeChild(element);
            }
        });
        
        // 移除可能的固定定位元素（常见于弹窗广告）
        const fixedElements = document.querySelectorAll('div[style*="position: fixed"]');
        fixedElements.forEach(element => {
            // 检查是否可能是广告（简单启发式判断）
            if(element.innerHTML.toLowerCase().includes('ad') || 
               element.innerHTML.toLowerCase().includes('广告') ||
               element.style.zIndex > 1000) {
                console.log('移除固定定位广告元素:', element);
                element.parentNode.removeChild(element);
            }
        });
        
        // 移除body上的可能阻止滚动的样式（常见于全屏弹窗）
        if(document.body.style.overflow === 'hidden') {
            document.body.style.overflow = 'auto';
        }
    }
    
    // 阻止广告脚本加载
    function blockAdScripts() {
        // 创建一个新的空白函数来替换原始的广告函数
        const emptyFunc = function() { return true; };
        
        // 常见的广告相关对象和函数
        const adObjects = [
            'googletag', 'googlefc', 'googleAdSlots', 'adsbygoogle',
            'amzn_assoc', 'criteo', 'taboola', 'outbrain'
        ];
        
        // 替换广告对象
        adObjects.forEach(obj => {
            if(window[obj]) {
                console.log('屏蔽广告对象:', obj);
                window[obj] = emptyFunc;
            }
        });
        
        // 阻止新的广告脚本加载
        const originalAppendChild = Element.prototype.appendChild;
        Element.prototype.appendChild = function(element) {
            if(element.tagName === 'SCRIPT') {
                const src = element.src || '';
                if(src.includes('ads') || src.includes('ad.') || 
                   src.includes('analytics') || src.includes('tracker')) {
                    console.log('阻止广告脚本加载:', src);
                    return document.createComment('已屏蔽的广告脚本: ' + src);
                }
            }
            return originalAppendChild.call(this, element);
        };
    }
    
    // 创建自定义样式来隐藏广告
    function addAdBlockStyles() {
        const style = document.createElement('style');
        style.textContent = `
            ${adSelectors.join(', ')} {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                height: 0 !important;
                min-height: 0 !important;
                max-height: 0 !important;
                overflow: hidden !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 初始执行
    function init() {
        console.log('广告屏蔽脚本已启动');
        
        // 添加广告屏蔽样式
        addAdBlockStyles();
        
        // 阻止广告脚本
        blockAdScripts();
        
        // 立即执行一次广告移除
        removeAds();
        
        // 设置定时器定期检查和移除新出现的广告
        setInterval(removeAds, 1000);
        
        // 监听DOM变化，处理动态加载的广告
        const observer = new MutationObserver(mutations => {
            let shouldRemoveAds = false;
            
            mutations.forEach(mutation => {
                if(mutation.addedNodes.length > 0) {
                    shouldRemoveAds = true;
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