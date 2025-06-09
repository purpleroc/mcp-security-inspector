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