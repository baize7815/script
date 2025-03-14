(function() {
    function enableNativeContextMenu() {
        document.addEventListener('contextmenu', function(e) {
            e.stopPropagation();
            return true;
        }, true);

        document.oncontextmenu = function() { return true; };
        
        const style = document.createElement('style');
        style.innerHTML = `
            * {
                -webkit-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enableNativeContextMenu);
    } else {
        enableNativeContextMenu();
    }
})();