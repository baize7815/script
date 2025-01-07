// ==UserScript==
// @name         账号切换器(增强版-滚动条)
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  用于开发测试的账号切换工具
// @author       You
// @match        https://coverai.cn/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // 添加Font Awesome
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
    document.head.appendChild(link);

    // 添加样式
    GM_addStyle(`
        .account-switcher {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
        }
        
        .icon-button {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: white;
            border: 1px solid #ddd;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            color: #666;
            transition: all 0.3s;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .icon-button:hover {
            transform: scale(1.1);
            box-shadow: 0 3px 8px rgba(0,0,0,0.15);
        }
        
        .dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 5px 0;
            margin-top: 5px;
            display: none;
            min-width: 120px;
        }
        
        .dropdown-menu.show {
            display: block;
        }
        
        .dropdown-item {
            padding: 8px 15px;
            cursor: pointer;
            display: flex;
            align-items: center;
            color: #333;
            transition: background 0.2s;
        }
        
        .dropdown-item:hover {
            background: #f5f5f5;
        }
        
        .dropdown-item i {
            margin-right: 8px;
            width: 16px;
        }
        
        .account-manager {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 3px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            width: 280px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
        }
        
        #accountList {
            overflow-y: auto;
            max-height: calc(80vh - 150px);
            margin: 10px 0;
            padding-right: 5px;
        }

        #accountList::-webkit-scrollbar {
            width: 6px;
        }

        #accountList::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }

        #accountList::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 3px;
        }

        #accountList::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
        
        .account-item {
            margin-bottom: 8px;
            padding: 8px;
            border: 1px solid #eee;
            border-radius: 4px;
        }
        
        .account-item input {
            width: calc(100% - 40px);
            padding: 4px;
            margin: 2px 0;
            border: 1px solid #ddd;
            border-radius: 3px;
        }
        
        .account-item button {
            padding: 2px 5px;
            margin-left: 5px;
            border: none;
            background: #ff4444;
            color: white;
            border-radius: 3px;
            cursor: pointer;
        }
        
        .manager-buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            flex-shrink: 0;
        }
        
        .manager-buttons button {
            padding: 5px 10px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            background: #4CAF50;
            color: white;
        }
        
        .manager-buttons button:hover {
            opacity: 0.9;
        }

        .password-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }
        
        .password-wrapper input {
            padding-right: 30px !important;
        }
        
        .toggle-password {
            position: absolute;
            right: 45px;
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
            padding: 0;
            font-size: 14px;
        }
        
        .toggle-password:hover {
            color: #333;
        }
        
        .import-export-buttons {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            gap: 5px;
            flex-shrink: 0;
        }
        
        .import-export-buttons button {
            flex: 1;
            padding: 5px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            background: #2196F3;
            color: white;
        }
        
        .current-account {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
            text-align: center;
            flex-shrink: 0;
        }

        .account-manager h3 {
            margin: 0 0 10px 0;
            flex-shrink: 0;
        }
    `);

    // 获取存储的账号
    const getAccounts = () => GM_getValue('accounts', []);
    
    // 保存账号
    const saveAccounts = (accounts) => GM_setValue('accounts', accounts);

    // 创建账号管理界面
    const createAccountManager = () => {
        const div = document.createElement('div');
        div.className = 'account-manager';
        
        const accounts = getAccounts();
        const currentIndex = GM_getValue('currentIndex', 0);
        
        div.innerHTML = `
            <h3>账号管理</h3>
            <div class="import-export-buttons">
                <button id="exportAccounts"><i class="fas fa-download"></i> 导出账号</button>
                <button id="importAccounts"><i class="fas fa-upload"></i> 导入账号</button>
            </div>
            <div id="accountList">
                ${accounts.map((acc, idx) => `
                    <div class="account-item">
                        <input type="email" value="${acc.email}" placeholder="邮箱" />
                        <div class="password-wrapper">
                            <input type="password" value="${acc.password}" placeholder="密码" />
                            <button class="toggle-password" type="button">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <button onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
                    </div>
                `).join('')}
            </div>
            <div class="manager-buttons">
                <button id="addAccount"><i class="fas fa-plus"></i> 添加</button>
                <button id="saveAccounts"><i class="fas fa-save"></i> 保存</button>
                <button id="closeManager"><i class="fas fa-times"></i> 关闭</button>
            </div>
            ${accounts.length > 0 ? `
                <div class="current-account">
                    当前账号: ${accounts[currentIndex]?.email || '未设置'} (${currentIndex + 1}/${accounts.length})
                </div>
            ` : ''}
        `;
        
        document.body.appendChild(div);

        // 密码显示切换
        const setupPasswordToggles = () => {
            div.querySelectorAll('.toggle-password').forEach(button => {
                button.onclick = (e) => {
                    const passwordInput = e.target.closest('.password-wrapper').querySelector('input');
                    const icon = e.target.closest('.toggle-password').querySelector('i');
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        icon.className = 'fas fa-eye-slash';
                    } else {
                        passwordInput.type = 'password';
                        icon.className = 'fas fa-eye';
                    }
                };
            });
        };
        
        setupPasswordToggles();

        // 导出账号
        div.querySelector('#exportAccounts').onclick = () => {
            const accounts = getAccounts();
            const blob = new Blob([JSON.stringify(accounts, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'coverai-accounts.json';
            a.click();
            URL.revokeObjectURL(url);
        };

        // 导入账号
        div.querySelector('#importAccounts').onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                try {
                    const file = e.target.files[0];
                    const text = await file.text();
                    const accounts = JSON.parse(text);
                    
                    if (!Array.isArray(accounts) || !accounts.every(acc => acc.email && acc.password)) {
                        throw new Error('无效的账号数据格式');
                    }
                    
                    saveAccounts(accounts);
                    alert('账号导入成功！');
                    location.reload();
                } catch (err) {
                    alert('导入失败：' + err.message);
                }
            };
            input.click();
        };

        // 添加账号
        div.querySelector('#addAccount').onclick = () => {
            const accountList = div.querySelector('#accountList');
            const accountItem = document.createElement('div');
            accountItem.className = 'account-item';
            accountItem.innerHTML = `
                <input type="email" placeholder="邮箱" />
                <div class="password-wrapper">
                    <input type="password" placeholder="密码" />
                    <button class="toggle-password" type="button">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <button onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
            `;
            accountList.appendChild(accountItem);
            setupPasswordToggles();
        };
        
        // 保存账号
        div.querySelector('#saveAccounts').onclick = () => {
            const items = div.querySelectorAll('.account-item');
            const accounts = Array.from(items).map(item => ({
                email: item.querySelector('input[type="email"]').value,
                password: item.querySelector('input[type="password"]').value
            })).filter(acc => acc.email && acc.password);
            
            saveAccounts(accounts);
            alert('保存成功！');
            location.reload();
        };
        
        // 关闭管理界面
        div.querySelector('#closeManager').onclick = () => div.remove();
    };

    // 创建切换器UI
    const createSwitcher = () => {
        const div = document.createElement('div');
        div.className = 'account-switcher';
        
        const accounts = getAccounts();
        const currentIndex = GM_getValue('currentIndex', 0);
        
        div.innerHTML = `
            <div class="icon-button" title="账号管理">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="dropdown-menu">
                <div class="dropdown-item switch-account">
                    <i class="fas fa-sync"></i>
                    <span>切换账号 (${currentIndex + 1}/${accounts.length || 0})</span>
                </div>
                <div class="dropdown-item manage-accounts">
                    <i class="fas fa-cog"></i>
                    <span>管理账号</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(div);

        // 显示/隐藏下拉菜单
        const iconButton = div.querySelector('.icon-button');
        const dropdownMenu = div.querySelector('.dropdown-menu');
        
        iconButton.onclick = (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        };

        // 点击其他地方关闭下拉菜单
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });
        
        // 切换账号
        div.querySelector('.switch-account').onclick = async () => {
            const accounts = getAccounts();
            if (accounts.length === 0) {
                alert('请先添加账号！');
                return;
            }
            
            let nextIndex = (currentIndex + 1) % accounts.length;
            GM_setValue('currentIndex', nextIndex);
            
            if (location.pathname === '/login') {
                const emailInput = document.querySelector('input[type="email"]');
                const passwordInput = document.querySelector('input[type="password"]');
                if (emailInput && passwordInput) {
                    emailInput.value = accounts[nextIndex].email;
                    passwordInput.value = accounts[nextIndex].password;
                    document.querySelector('button[type="submit"]')?.click();
                }
            } else {
                const logoutBtn = document.querySelector('a[href*="logout"]');
                if (logoutBtn) {
                    logoutBtn.click();
                } else {
                    location.href = '/login';
                }
            }
        };
        
        // 打开账号管理
        div.querySelector('.manage-accounts').onclick = () => createAccountManager();
    };

    // 注册脚本菜单
    GM_registerMenuCommand('管理账号', createAccountManager);

    // 创建切换器
    createSwitcher();
})();
