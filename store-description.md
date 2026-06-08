# MCP Security Inspector - Chrome Web Store描述

## 简短描述 (132字符以内)
MCP 协议调试与安全检测 — 连接远程服务器、导入 mcp.json、AI 增强安全审计

## 详细描述

MCP Security Inspector 是一款面向 **Model Context Protocol (MCP)** 远程服务器的 Chrome 扩展，集 **协议调试** 与 **AI 增强安全检测** 于一体，帮助开发者和安全研究人员快速连接、调用并审计 MCP 服务。

### 🔌 MCP 协议调试

- 支持 **SSE** 与 **Streamable HTTP** 两种传输模式
- 浏览并调用工具、读取资源、获取提示
- 自定义 Headers、组合认证（Bearer / Basic / API Key 等）
- 可配置结果展示模板（`{{auto}}` 自动美化、原始/格式化双栏）

### 📥 配置导入导出

- **导入** Cursor、Claude Desktop、VS Code、Windsurf 等工具的 `mcp.json`
- 导入前预览，自动识别配置来源
- 自动过滤本地 stdio 进程与暂不支持的模式
- **导出** 标准 `mcp.json`，与其他 MCP 客户端互通

### 🛡️ 安全检测

- **工具检测**：输入验证、权限控制、注入攻击、数据泄露等
- **资源检测**：路径遍历、访问控制、敏感数据泄露
- **提示检测**：提示注入、角色操纵、上下文污染
- **AI 增强**：集成 OpenAI、Claude、Gemini 等 LLM，自动生成测试用例
- **双重模式**：主动扫描 + 被动监控

### 🔧 使用方法

1. 点击扩展图标打开 MCP Security Inspector
2. 导入已有 `mcp.json`，或手动配置 MCP 服务器连接
3. 在 MCP 浏览器中调用工具、资源、提示
4. （可选）配置 LLM 服务，执行安全检测并查看报告

### 🎯 适用人群

- MCP 协议开发者
- AI 应用与安全研究人员
- 需要审计远程 MCP 服务的团队

### 🔒 隐私保护

- 检测与配置均在本地处理
- 不收集用户个人信息
- API 密钥等敏感信息仅存于浏览器本地

### 📋 系统要求

- Chrome 浏览器 88+
- 可访问支持 MCP 协议的远程服务器

## 标签
MCP, Model Context Protocol, Security, Testing, Developer Tools, API Testing, Cursor, mcp.json

## 类别
Developer Tools

## 语言支持
- 中文 (简体)
- English

## v2.1.0 更新
- 支持标准 mcp.json 导入/导出，兼容 Cursor、Claude、VS Code、Windsurf
- 导入预览：展示来源识别、可导入列表及跳过项
- 配置列表点击加载、选中态视觉优化
