// Define main function (script entry)

function main(config, profileName) {
  // 在所有规则的最前面插入两条新规则
  config?.rules.unshift(
    "PROCESS-NAME,Adobe Creative Cloud.exe,REJECT-DROP",
    "PROCESS-NAME,Photoshop.exe,REJECT-DROP",
    "PROCESS-NAME,Illustrator.exe,REJECT-DROP",
    "DOMAIN,graph.microsoft.com,PROXY",
    "DOMAIN-SUFFIX,windows.net,PROXY",  
    "DOMAIN,copilot.microsoft.com,PROXY",
    "DOMAIN-SUFFIX,microsoft.com,PROXY",
    "DOMAIN-SUFFIX,live.com,PROXY",
    "DOMAIN-SUFFIX,microsoftonline.com,PROXY",
    "DOMAIN-SUFFIX,github.com,PROXY",
    "DOMAIN-SUFFIX,github.dev,PROXY",
    "DOMAIN-SUFFIX,github.io,PROXY",
    "DOMAIN-SUFFIX,githubassets.com,PROXY",
    "DOMAIN-SUFFIX,githubusercontent.com,PROXY",
    "DOMAIN,copilot-proxy.githubusercontent.com,PROXY",
    
  );
  
  // 返回修改后的配置
  return config;
}
