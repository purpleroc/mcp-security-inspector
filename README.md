# MCP Security Inspector

<div align="center">

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue?logo=googlechrome)](https://chromewebstore.google.com/detail/mcp-security-inspector/opajbcoflmgkjmjafchlgehgllbekgeo)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)](https://github.com/purpleroc/mcp-security-inspector)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**专为 Model Context Protocol (MCP) 服务器设计的AI增强安全检测Chrome扩展.[项目由Cursor完成]**

[English](#english) | [中文](#chinese)

</div>

---

<a id="chinese"></a>
## 🚀 项目概述

MCP Security Inspector 是专为 Model Context Protocol (MCP) 服务器设计的AI增强安全检测Chrome扩展。该项目结合主动扫描和被动监控两种方式，深度集成多种LLM服务（OpenAI GPT、Claude、Gemini等），让AI直接参与测试样例的生成和安全分析，确保安全检测既全面又实时。

### ✨ 核心特性

- 🧠 **AI增强检测**: 集成OpenAI、Claude、Gemini等多种LLM服务
- 🔄 **双重检测模式**: 主动扫描 + 被动监控，确保全面安全覆盖
- 🎯 **统一检测引擎**: 支持工具、提示、资源三种MCP组件的统一安全检测
- 🌐 **多语言支持**: 完整的中英双语界面
- 📊 **智能报告**: 实时生成详细的安全分析报告
- 🛡️ **隐私保护**: 本地检测，敏感信息智能遮蔽

## 🏗️ 技术架构

### 统一安全检测引擎

采用统一的安全检测引擎，将工具、提示、资源三种不同类型的MCP组件纳入统一的安全检测框架：

```typescript
// 统一安全检测接口
public async performSecurityAnalysis(
  type: 'tool' | 'prompt' | 'resource',
  target: MCPTool | MCPPrompt | MCPResource,
  config: SecurityCheckConfig,
  parameters?: Record<string, unknown>
): Promise<SecurityAnalysisResult>
```

### 双重检测模式

#### 🔍 主动扫描模式
- 用户主动触发的全面安全扫描
- LLM增强的深度安全分析
- 智能测试用例生成和执行
- 详细的安全报告和修复建议

#### 📡 被动监控模式
- 实时监控MCP调用和交互
- 自动检测潜在的安全威胁
- 实时安全警报和日志记录
- 历史记录和趋势分析

### 检测流程

1. **静态分析**: 对组件定义进行初步分析，识别潜在安全风险
2. **LLM深度分析**: 使用大语言模型进行深度安全分析
3. **规则检测**: 基于预定义的安全规则进行威胁检测
4. **动态测试**: 执行实际的安全测试，验证潜在漏洞
5. **风险评估**: 综合各种检测结果，计算整体风险等级
6. **报告生成**: 生成详细的安全报告和修复建议

## 🔒 安全检测能力

### 工具安全检测
- **输入验证分析**: 检查工具参数的验证机制
- **权限控制检查**: 评估工具的权限控制机制
- **数据泄露检测**: 识别工具可能泄露的敏感信息
- **注入攻击防护**: 检测SQL注入、XSS、命令注入等攻击
- **拒绝服务防护**: 评估对资源消耗攻击的防护能力

### 提示安全检测
- **提示注入检测**: 识别可能绕过AI模型安全边界的恶意提示
- **角色操纵检测**: 检测可能改变AI模型行为的角色定义
- **上下文污染检测**: 识别可能导致上下文污染的提示内容
- **隐私泄露检测**: 检测可能泄露敏感信息的提示
- **恶意引导检测**: 识别可能引导AI模型执行恶意行为的提示

### 资源安全检测
- **路径遍历检测**: 识别可能绕过访问控制的路径遍历攻击
- **访问控制检测**: 验证资源的访问控制机制是否有效
- **敏感数据检测**: 识别可能泄露的敏感文件和数据
- **内容注入检测**: 检测资源内容中可能包含的恶意内容
- **协议安全检测**: 验证资源访问协议的安全性

## 🤖 LLM增强分析

### 支持的LLM服务
- **OpenAI GPT系列**: GPT-3.5、GPT-4
- **Anthropic Claude系列**: Claude-3 Sonnet、Claude-3.5 Sonnet
- **Google Gemini系列**: Gemini Pro、Gemini Ultra
- **自定义Ollama服务**: 支持本地部署的开源模型
- **通用HTTP API接口**: 兼容OpenAI API格式的服务

### 智能测试用例生成
- 基于组件定义分析潜在风险点
- 使用LLM识别可能的安全风险
- 根据风险点制定相应的测试策略
- 生成具体的测试用例和测试数据
- 执行测试用例并智能评估结果

## 🚀 快速开始

### 安装步骤

#### 方式一：从Chrome商店安装（推荐）

1. **直接安装**
   - 访问 [Chrome应用商店 - MCP Security Inspector](https://chromewebstore.google.com/detail/mcp-security-inspector/opajbcoflmgkjmjafchlgehgllbekgeo)
   - 点击"添加至Chrome"按钮
   - 在弹出的确认对话框中点击"添加扩展程序"

#### 方式二：从源码构建安装

1. **下载源码**
   ```bash
   git clone https://github.com/purpleroc/mcp-security-inspector.git
   cd mcp-security-inspector
   npm install
   npm run build:extension
   ```

2. **加载到Chrome**
   - 打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `dist` 文件夹

### 使用方法

1. **连接MCP服务器**
   - 在扩展面板中输入MCP服务器地址
   - 配置连接参数和认证信息

2. **配置LLM服务**（可选）
   - 选择LLM服务提供商
   - 输入API密钥和配置参数
   - 测试连接是否正常

3. **执行安全检测**
   - 选择检测模式（主动扫描 / 被动监控）
   - 配置检测参数和规则
   - 启动检测并查看实时进度

4. **查看检测结果**
   - 查看详细的安全报告
   - 分析风险等级和修复建议
   - 导出报告或历史记录

## 🛠️ 开发指南

### 项目结构
```
src/
├── components/          # React组件
│   ├── SecurityPanel.tsx
│   ├── MCPExplorer.tsx
│   └── ConfigPanel.tsx
├── services/           # 核心服务
│   ├── securityEngine.ts
│   ├── mcpClient.ts
│   └── llmClient.ts
├── types/              # TypeScript类型定义
├── i18n/               # 国际化资源
└── utils/              # 工具函数
```

### 核心API

#### 安全检测引擎
```typescript
import { SecurityEngine } from './services/securityEngine';

const engine = new SecurityEngine();

// 执行安全检测
const result = await engine.performSecurityAnalysis(
  'tool',           // 检测类型
  toolDefinition,   // 组件定义
  config,          // 检测配置
  parameters       // 测试参数
);
```

#### MCP客户端
```typescript
import { MCPClient } from './services/mcpClient';

const client = new MCPClient();

// 连接到MCP服务器
await client.connect(serverUrl, authConfig);

// 获取组件列表
const tools = await client.listTools();
const prompts = await client.listPrompts();
const resources = await client.listResources();
```

### 扩展开发

#### 添加新的检测规则
```typescript
// src/services/detectionRules.ts
export const customRule: DetectionRule = {
  id: 'custom-rule',
  name: 'Custom Security Rule',
  description: 'Description of the rule',
  pattern: /malicious-pattern/gi,
  severity: 'high',
  category: 'injection'
};
```

#### 集成新的LLM服务
```typescript
// src/services/llmClient.ts
class CustomLLMProvider implements LLMProvider {
  async analyze(prompt: string): Promise<LLMResponse> {
    // 实现自定义LLM服务的调用逻辑
  }
}
```

## 📊 更新日志

### v2.0.1 - 统一检测引擎
- ✅ 引入统一安全检测引擎
- ✅ 支持工具、提示、资源三种组件类型
- ✅ 新增被动监控模式
- ✅ 集成多种LLM服务
- ✅ 完善的中英双语支持

### v1.0.6 - 基础功能
- ✅ 基础MCP连接功能
- ✅ 简单的安全检测
- ✅ 报告生成功能

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 贡献方式
- 🐛 报告Bug
- 💡 提出新功能建议
- 🔧 提交代码修复
- 📚 改进文档
- 🌐 提供翻译

### 开发流程
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request


---

<a id="english"></a>
## 🌟 English

**The world's first AI-enhanced security detection Chrome extension specifically designed for Model Context Protocol (MCP) servers**

### 🚀 Project Overview

MCP Security Inspector is the world's first AI-enhanced security detection Chrome extension specifically designed for Model Context Protocol (MCP) servers. This project combines active scanning and passive monitoring modes, deeply integrates various LLM services (OpenAI GPT, Claude, Gemini, etc.), allowing AI to directly participate in test case generation and security analysis, ensuring comprehensive and real-time security detection.

### ✨ Core Features

- 🧠 **AI-Enhanced Detection**: Integrates multiple LLM services including OpenAI, Claude, Gemini
- 🔄 **Dual Detection Modes**: Active scanning + passive monitoring for comprehensive security coverage
- 🎯 **Unified Detection Engine**: Supports unified security detection for tools, prompts, and resources
- 🌐 **Multi-language Support**: Complete bilingual interface (English/Chinese)
- 📊 **Intelligent Reports**: Real-time generation of detailed security analysis reports
- 🛡️ **Privacy Protection**: Local detection with intelligent sensitive information masking

### 🔒 Security Detection Capabilities

#### Tool Security Detection
- **Input Validation Analysis**: Check tool parameter validation mechanisms
- **Permission Control Check**: Evaluate tool permission control mechanisms
- **Data Leakage Detection**: Identify sensitive information that tools might leak
- **Injection Attack Protection**: Detect SQL injection, XSS, command injection attacks
- **DoS Protection**: Evaluate protection against resource consumption attacks

#### Prompt Security Detection
- **Prompt Injection Detection**: Identify malicious prompts that might bypass AI model security boundaries
- **Role Manipulation Detection**: Detect role definitions that might change AI model behavior
- **Context Pollution Detection**: Identify prompt content that might cause context pollution
- **Privacy Leakage Detection**: Detect prompts that might leak sensitive information
- **Malicious Guidance Detection**: Identify prompts that might guide AI models to perform malicious actions

#### Resource Security Detection
- **Path Traversal Detection**: Identify path traversal attacks that might bypass access control
- **Access Control Detection**: Verify the effectiveness of resource access control mechanisms
- **Sensitive Data Detection**: Identify sensitive files and data that might be leaked
- **Content Injection Detection**: Detect malicious content that might be included in resources
- **Protocol Security Detection**: Verify the security of resource access protocols

### 🤖 LLM Enhanced Analysis

#### Supported LLM Services
- **OpenAI GPT Series**: GPT-3.5, GPT-4
- **Anthropic Claude Series**: Claude-3 Sonnet, Claude-3.5 Sonnet
- **Google Gemini Series**: Gemini Pro, Gemini Ultra
- **Custom Ollama Service**: Support for locally deployed open-source models
- **Generic HTTP API Interface**: Compatible with OpenAI API format services

### 🚀 Quick Start

#### Installation Steps

##### Option 1: Install from Chrome Web Store (Recommended)

1. **Direct Installation**
   - Visit [Chrome Web Store - MCP Security Inspector](https://chromewebstore.google.com/detail/mcp-security-inspector/opajbcoflmgkjmjafchlgehgllbekgeo)
   - Click "Add to Chrome" button
   - Confirm by clicking "Add extension" in the popup dialog

##### Option 2: Build from Source Code

1. **Download Source Code**
   ```bash
   git clone https://github.com/purpleroc/mcp-security-inspector.git
   cd mcp-security-inspector
   npm install
   npm run build:extension
   ```

2. **Load into Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

#### Usage

1. **Connect to MCP Server**
   - Enter MCP server address in the extension panel
   - Configure connection parameters and authentication information

2. **Configure LLM Service** (Optional)
   - Select LLM service provider
   - Enter API key and configuration parameters
   - Test connection

3. **Execute Security Detection**
   - Choose detection mode (Active Scan / Passive Monitor)
   - Configure detection parameters and rules
   - Start detection and view real-time progress

4. **View Detection Results**
   - View detailed security reports
   - Analyze risk levels and remediation recommendations
   - Export reports or history

### 🛠️ Development Guide

#### Project Structure
```
src/
├── components/          # React components
├── services/           # Core services
├── types/              # TypeScript type definitions
├── i18n/               # Internationalization resources
└── utils/              # Utility functions
```

### 🤝 Contributing

We welcome all forms of contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.
