# MCP Security Inspector | MCP安全检测器

[English](#english) | [中文](#chinese)

## English

A professional security testing tool for Model Context Protocol (MCP) servers. This Chrome extension helps developers and security researchers evaluate the security of MCP implementations.

### 🌟 Features

- **🛡️ Comprehensive Security Testing**: Automatically analyze MCP tools, resources, and prompts for potential security risks
- **🌐 Multi-language Support**: Full internationalization with Chinese and English language support
- **🔧 Multiple Authentication Methods**: Support for API Key, Basic Auth, Custom Headers, and Combined Authentication
- **📊 Real-time Risk Assessment**: Categorize risks as Low, Medium, High, or Critical with detailed recommendations
- **📈 History Tracking**: Keep detailed records of all testing activities
- **🔒 Privacy-First Design**: All data processed locally, no external data transmission
- **🎨 Modern UI**: Clean, intuitive interface built with Ant Design

### 🚀 Installation

#### Option 1: Chrome Web Store (Recommended | 推荐)
1. Visit [MCP Security Inspector on Chrome Web Store](https://chromewebstore.google.com/detail/mcp-security-inspector/opajbcoflmgkjmjafchlgehgllbekgeo?hl=en-US&utm_source=ext_sidebar)
2. Click "Add to Chrome" to install the extension
3. The extension will be automatically installed and ready to use

#### Option 2: Manual Installation (Developer Mode | 开发者模式)
1. Download the latest release from [GitHub Releases](https://github.com/purpleroc/mcp-security-inspector/releases)
2. Extract the ZIP file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

### 🛠️ Usage

1. **Configuration**: Set up your MCP server connection details
2. **Language Selection**: Choose your preferred language (Chinese/English) from the top-right dropdown
3. **Testing**: Browse and test available tools, resources, and prompts
4. **Analysis**: Review security assessments and recommendations
5. **History**: Track your testing activities over time

### 🔧 Development

   ```bash
# Install dependencies
   npm install

# Start development server
npm run dev

# Build for production
   npm run build:extension

# Package for distribution
npm run package
```

### 📋 System Requirements

- Chrome Browser 88+
- Access to MCP protocol-compliant servers

### 🔒 Permissions

- **Host Permissions (`<all_urls>`)**: Required to connect to MCP servers and handle CORS
- **No Storage Permission**: All data is stored using standard localStorage (no special permissions needed)

---

## Chinese

专业的Model Context Protocol (MCP) 服务器安全测试工具。这个Chrome扩展帮助开发者和安全研究人员评估MCP实现的安全性。

### 🌟 功能特性

- **🛡️ 全面安全测试**: 自动分析MCP工具、资源和提示的潜在安全风险
- **🌐 多语言支持**: 完整的国际化支持，提供中英文语言切换
- **🔧 多种认证方式**: 支持API Key、Basic认证、自定义请求头和组合认证
- **📊 实时风险评估**: 将风险分类为低、中、高、严重四个等级，并提供详细建议
- **📈 历史记录**: 保留所有测试活动的详细记录
- **🔒 隐私优先设计**: 所有数据本地处理，无外部数据传输
- **🎨 现代化界面**: 基于Ant Design构建的简洁直观界面

### 🚀 安装方法

#### 方法一：Chrome插件商城（推荐）
1. 访问 [Chrome插件商城中的MCP安全检测器](https://chromewebstore.google.com/detail/mcp-security-inspector/opajbcoflmgkjmjafchlgehgllbekgeo?hl=en-US&utm_source=ext_sidebar)
2. 点击"添加至Chrome"安装扩展程序
3. 扩展程序将自动安装并可以使用

#### 方法二：手动安装（开发者模式）
1. 从[GitHub Releases](https://github.com/purpleroc/mcp-security-inspector/releases)下载最新版本
2. 解压ZIP文件
3. 打开Chrome浏览器，访问 `chrome://extensions/`
4. 启用"开发者模式"
5. 点击"加载已解压的扩展程序"，选择解压后的文件夹

### 🛠️ 使用方法

1. **配置**: 设置MCP服务器连接详情
2. **语言选择**: 从右上角下拉菜单选择首选语言（中文/英文）
3. **测试**: 浏览和测试可用的工具、资源和提示
4. **分析**: 查看安全评估和建议
5. **历史**: 跟踪测试活动记录

### 🔧 开发指南

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build:extension

# 打包发布
npm run package
```

### 📋 系统要求

- Chrome浏览器 88+
- 需要访问符合MCP协议的服务器

### 🔒 权限说明

- **主机权限 (`<all_urls>`)**: 连接MCP服务器和处理CORS所需
- **无存储权限**: 所有数据使用标准localStorage存储（无需特殊权限）

## 📋 Supported Authentication | 支持的认证方式

- **None** | 无认证
- **API Key** | API密钥认证
- **Basic Authentication** | Basic认证
- **Custom Headers** | 自定义请求头
- **Combined Authentication** | 组合认证

## 🌐 Supported Transport | 支持的传输方式

- **Server-Sent Events** | 实时通信
- **HTTP/HTTPS** | 标准HTTP传输
- **CORS Support** | 跨域请求处理

## 📈 Changelog | 更新日志
### v1.0.5 (Current | 当前版本)
- 🌍 **Enhanced Multi-language Support** | 增强多语言支持：支持更多国家和地区的语言
- 📚 **History Records** | 历史记录：完整的测试历史记录和查看功能
- 🔗 **Connection History** | 连接记录：自动保存和管理MCP服务器连接历史

### v1.0.4 (Current | 当前版本)
- 🏪 **Chrome Web Store Release** | Chrome插件商城发布：现在可以通过Chrome Web Store直接安装
- 🌐 **Official Store Listing** | 官方商店上架：提供更便捷的安装方式
- 📦 **Simplified Installation** | 简化安装：一键安装，无需开发者模式

### v1.0.3
- ✨ **Multi-language Support** | 多语言支持：完整的中英文国际化
- 🌐 **Language Switching** | 语言切换：界面内快速切换语言
- 🔒 **Privacy Enhanced** | 隐私增强：移除不必要的storage权限
- 📱 **Better UX** | 用户体验：改进界面和交互体验
- 🛠️ **Enhanced Security** | 安全增强：更好的安全评估算法
- 💾 Local storage for connection history | 本地保存历史连接服务列表
- 📊 Enhanced call history details | 增强的调用历史详情
- 🔐 Multiple authentication adapters | 多种认证适配器支持

### v1.0.2
- 🔧 Fixed CORS errors from removing host_permissions | 修复去掉host_permissions导致的CORS错误
- 🧹 Removed redundant configurations | 去掉多余配置，单纯从SSE URL获取

### v1.0.1
- 🆕 New tab mode for better user experience | 新标签页模式，提供更好的用户体验
- 🔧 Fixed HTTP 400 errors, improved MCP protocol compatibility | 修复HTTP 400错误，改进MCP协议兼容性
- 📱 Responsive layout for different screen sizes | 响应式布局，适配不同屏幕尺寸
- 🧪 Built-in test server for functionality verification | 内置测试服务器，便于功能验证
- 🎨 Improved UI design and interaction experience | 改进UI设计和交互体验

### v1.0.0
- 🎉 Initial release | 初始版本发布
- 🔒 Complete MCP protocol security testing | 支持MCP协议的完整功能
- 🛡️ Security checks and risk assessment | 安全检查和风险评估
- 🖥️ Complete user interface and history tracking | 完整的用户界面和历史记录

---

**Developer | 开发者**: purpleroc  
**Contact | 联系方式**: [GitHub Issues](https://github.com/purpleroc/mcp-security-inspector/issues) 