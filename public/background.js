// Background script for MCP Security Inspector
chrome.action.onClicked.addListener((tab) => {
  // 当用户点击扩展图标时，打开新标签页
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('MCP Security Inspector 已安装');
});

// 处理CORS - 修改响应头
chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    const headers = details.responseHeaders || [];
    
    // 添加CORS响应头
    headers.push({
      name: 'Access-Control-Allow-Origin',
      value: '*'
    });
    headers.push({
      name: 'Access-Control-Allow-Methods',
      value: 'GET, POST, PUT, DELETE, OPTIONS'
    });
    headers.push({
      name: 'Access-Control-Allow-Headers',
      value: 'Content-Type, Authorization, X-Requested-With'
    });
    headers.push({
      name: 'Access-Control-Allow-Credentials',
      value: 'true'
    });

    return { responseHeaders: headers };
  },
  {
    urls: ["<all_urls>"],
    types: ["xmlhttprequest", "other"]
  },
  ["blocking", "responseHeaders", "extraHeaders"]
); 