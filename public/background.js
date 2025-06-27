// Background script for MCP Security Inspector
console.log('MCP Security Inspector background script 开始加载');

// 当用户点击扩展图标时，打开新标签页
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('index.html')
  });
});

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('MCP Security Inspector 已安装');
});

console.log('MCP Security Inspector background script 加载完成'); 