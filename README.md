# MCP Security Inspector

一个用于检测Model Context Protocol (MCP)安全性的Chrome扩展工具。

(该项目纯cursor生成)


## 🆕 更新内容

### v1.1.0 新特性
- ✅ **新标签页模式**: 点击扩展图标现在会在新标签页中打开完整界面
- ✅ **改进的MCP协议支持**: 修复HTTP 400错误，支持最新的MCP协议格式
- ✅ **响应式布局**: 适配全屏显示，提供更好的用户体验
- ✅ **测试服务器**: 提供内置测试服务器用于验证功能

## 功能特性

### 🔧 核心功能
- **MCP服务器连接**: 支持HTTP、SSE、Stdio等多种传输方式
- **自动发现**: 自动获取并展示MCP服务器的tools、resources、prompts
- **动态测试**: 支持选择工具并动态生成参数表单进行测试
- **安全检查**: 实时分析工具调用的安全风险
- **结果展示**: 友好展示调用结果，支持多种内容类型
- **历史记录**: 完整记录所有调用历史，支持回溯和分析

### 🛡️ 安全特性
- **风险等级评估**: 自动评估工具调用的安全风险（低/中/高/严重）
- **敏感信息检测**: 识别参数中的敏感信息（密码、token等）
- **脚本注入防护**: 检测参数值中的潜在恶意脚本
- **安全建议**: 提供针对性的安全建议和最佳实践

### 📊 界面功能
- **配置面板**: 支持手动输入或从JSON文件导入MCP服务器配置
- **工具面板**: 展示可用工具，支持参数配置和调用
- **资源面板**: 查看和读取MCP资源
- **提示面板**: 管理和使用MCP提示模板
- **历史面板**: 查看调用历史，支持筛选和导出

## 使用截屏
### index
![](./images/index.png)

### explorer
![](./images/explorer.png)

### history
![](./images/history.png)

## 快速开始

### 1. 安装扩展

1. **下载或构建项目**:
   ```bash
   git clone <repository-url>
   cd mcp_inspector
   npm install
   npm run build
   ```

2. **准备扩展文件**:
   ```bash
   cp public/manifest.json dist/
   cp public/background.js dist/
   cp -r public/icons dist/
   mv dist/public/index.html dist/index.html
   ```

3. **安装到Chrome**:
   - 打开Chrome浏览器
   - 访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 文件夹

### 2. 启动测试服务器

为了快速体验功能，可以使用内置的测试服务器：

```bash
python3 test-mcp-server.py
```

服务器将在 `http://localhost:8000` 启动。

### 3. 配置和测试

1. **点击Chrome工具栏中的扩展图标**，会在新标签页中打开MCP Security Inspector

2. **配置MCP服务器** (推荐使用分别配置方式):
   - 服务器名称: `Docs Server`
   - **分别配置** (推荐):
     - 主机地址: `http://127.0.0.1:8020`
     - SSE路径: `/sse`
     - 消息路径: `/messages/`
   - **或传统方式**:
     - 服务器端点: `http://localhost:8020/sse`
   - 传输方式: `SSE`

3. **点击"连接"**:
   - 系统会建立SSE连接，等待服务器推送endpoint信息
   - 从返回的`event: endpoint, data: /messages/?session_id=xxx`中提取session_id
   - 连接成功后会自动获取所有tools、resources、prompts数据
   - 自动切换到相应的功能页面（优先显示tools）

4. **开始测试**:
   - 在工具页面选择 `get_docs` 工具进行测试
   - 输入参数如：query="React Agent", library="langchain"
   - 查看实时的安全风险评估和建议

## 详细使用指南

### 配置MCP服务器

**手动配置**:
- 输入服务器名称
- 设置服务器端点URL
- 选择传输方式(SSE/HTTP/Stdio)
- 可选：输入API密钥

**从文件导入**:
支持标准MCP配置格式：
```json
{
  "mcpServers": {
    "my-server": {
      "endpoint": "https://api.example.com/mcp",
      "transport": "http",
      "apiKey": "your-api-key"
    }
  }
}
```

### 安全检查功能

扩展会自动分析每个工具调用的安全风险：

- **🟢 低风险**: 常规操作，相对安全
- **🟡 中等风险**: 包含敏感参数，需要注意
- **🟠 高风险**: 可能执行危险操作
- **🔴 严重风险**: 检测到潜在的恶意内容

### 历史记录管理

- 查看所有调用记录
- 按类型筛选（工具/资源/提示）
- 查看安全警告和错误信息
- 导出或清空记录

## 技术架构

### 前端技术栈
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Ant Design** - UI组件库
- **Redux Toolkit** - 状态管理
- **Vite** - 构建工具

### MCP协议支持
- **JSON-RPC 2.0** - 消息格式
- **协议版本**: 2024-11-05
- **Server-Sent Events** - 实时通信
- **HTTP/HTTPS** - 标准HTTP传输
- **CORS支持** - 跨域请求处理

### 安全机制
- **静态分析** - 参数和工具名称安全检查
- **风险评估** - 多级安全风险等级
- **沙箱执行** - 隔离的测试环境
- **审计日志** - 完整的操作记录

## 开发模式

开发时使用以下命令：

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 启动测试MCP服务器
python3 test-mcp-server.py
```

## 故障排除

### 常见问题

1. **HTTP 400错误**:
   - 确保MCP服务器支持CORS
   - 检查端点URL是否正确
   - 验证请求格式是否符合JSON-RPC 2.0规范

2. **连接超时**:
   - 检查网络连接
   - 确认服务器是否正在运行
   - 尝试增加超时时间

3. **扩展无法加载**:
   - 确保所有文件都已正确复制到dist目录
   - 检查manifest.json格式是否正确
   - 查看Chrome扩展页面的错误信息

### 调试技巧

- 打开Chrome开发者工具查看控制台日志
- 使用测试服务器验证基本功能
- 检查网络面板中的HTTP请求和响应

## 支持的MCP版本

- MCP协议版本: 2024-11-05
- 支持所有标准MCP功能:
  - Tools (工具调用)
  - Resources (资源访问)  
  - Prompts (提示模板)
  - Logging (日志记录)

## 安全注意事项

⚠️ **重要提醒**:
- 此工具仅用于安全测试和开发调试
- 不要在生产环境中测试未知的MCP工具
- 注意保护敏感信息，如API密钥和认证token
- 定期检查和清理调用历史记录
- 在测试危险工具时使用隔离环境

## 贡献指南

欢迎提交Issue和Pull Request来改进这个工具！

### 开发环境设置
1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 许可证

MIT License

## 更新日志

### v1.1.0 (当前版本)
- 🆕 新标签页模式，提供更好的用户体验
- 🔧 修复HTTP 400错误，改进MCP协议兼容性
- 📱 响应式布局，适配不同屏幕尺寸
- 🧪 内置测试服务器，便于功能验证
- 🎨 改进UI设计和交互体验

### v1.0.0
- 初始版本发布
- 支持MCP协议的完整功能
- 安全检查和风险评估
- 完整的用户界面和历史记录

---

**开发者**: MCP Security Inspector Team  
**联系方式**: [GitHub Issues](https://github.com/purpleroc/mcp-security-inspector/issues) 