function main(config, profileName) {
  // 在所有规则的最前面插入新规则
  config?.rules.unshift(
    // --- Adobe 全家桶直连规则 (最终版) ---
    "DOMAIN-SUFFIX,adobe.com,DIRECT",
    "DOMAIN-SUFFIX,adobe.io,DIRECT",
    "DOMAIN-SUFFIX,adobecc.com,DIRECT",      // Creative Cloud
    "DOMAIN-SUFFIX,adobesc.com,DIRECT",      //
    "DOMAIN-SUFFIX,adobelogin.com,DIRECT",   // 登录与账户
    "DOMAIN-SUFFIX,adobedtm.com,DIRECT",     // 后台分析服务
    "DOMAIN-SUFFIX,adobeccstatic.com,DIRECT", // 新增：处理Adobe静态资源域名
    "DOMAIN-SUFFIX,adobeexchange.com,DIRECT",// 插件市场
    "DOMAIN-SUFFIX,typekit.net,DIRECT",      // Adobe Fonts
    "DOMAIN-SUFFIX,typekit.com,DIRECT",      // Adobe Fonts
    "DOMAIN-SUFFIX,photoshop.com,DIRECT",    //
    "DOMAIN-SUFFIX,demdex.net,DIRECT",       // 后台分析服务
    "DOMAIN-SUFFIX,omtrdc.net,DIRECT",       // 后台分析服务
    "DOMAIN-SUFFIX,2o7.net,DIRECT",          // 后台分析服务

    // --- copilot规则 ---
    "DOMAIN,graph.microsoft.com,[代理名]",
    "DOMAIN-SUFFIX,windows.net,[代理名]",
    "DOMAIN,copilot.microsoft.com,[代理名]",
    "DOMAIN-SUFFIX,microsoft.com,[代理名]",
    "DOMAIN-SUFFIX,live.com,[代理名]",
    "DOMAIN-SUFFIX,microsoftonline.com,[代理名]",
    "DOMAIN-SUFFIX,github.com,[代理名]",
    "DOMAIN-SUFFIX,github.dev,[代理名]",
    "DOMAIN-SUFFIX,github.io,[代理名]",
    "DOMAIN-SUFFIX,githubassets.com,[代理名]",
    "DOMAIN-SUFFIX,githubusercontent.com,[代理名]",
    "DOMAIN,copilot-proxy.githubusercontent.com,[代理名]"
  );
  
  // 返回修改后的配置
  return config;
}
