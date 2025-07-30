# MCP Security Inspector

一个用于检测MCP（Model Context Protocol）服务器安全性的Chrome扩展。

## 功能特性

### 🔍 统一安全检测引擎

最新版本引入了统一的安全检测引擎，支持对MCP组件进行一致的安全分析：

#### 支持的检测类型
- **工具（Tool）检测**: 分析MCP工具的安全性，包括权限风险、输入验证、数据泄露等
- **提示（Prompt）检测**: 检测提示注入、恶意引导、信息泄露等风险
- **资源（Resource）检测**: 分析资源访问控制、路径遍历、内容注入等安全问题

#### 检测流程
1. **静态分析**: 对组件定义进行敏感信息检测和关键词风险分析
2. **LLM增强分析**: 使用大语言模型进行深度安全分析
3. **动态测试**: 使用提供的参数执行实际测试（可选）
4. **智能测试生成**: 自动生成并执行安全测试用例

#### 新增功能
- **参数支持**: 所有检测类型现在都支持传入参数进行动态测试
- **统一接口**: 使用 `performSecurityAnalysis()` 函数进行统一检测
- **类型安全**: 根据组件类型自动选择相应的检测逻辑

#### 使用示例

```typescript
// 检测工具（带参数）
const toolResult = await securityEngine.performSecurityAnalysis(
  'tool',
  toolObject,
  config,
  { input: 'test parameter' }
);

// 检测提示（带参数）
const promptResult = await securityEngine.performSecurityAnalysis(
  'prompt',
  promptObject,
  config,
  { message: 'test message' }
);

// 检测资源（带参数）
const resourceResult = await securityEngine.performSecurityAnalysis(
  'resource',
  resourceObject,
  config,
  { path: '/test/path' }
);
```

### 🛡️ 安全检测功能

#### 主动扫描
- 全面的安全漏洞扫描
- 智能测试用例生成
- LLM增强的安全分析
- 实时进度监控

#### 被动检测
- 实时监控MCP调用
- 自动威胁检测
- 风险等级评估
- 安全日志记录

#### 检测规则
- 敏感信息泄露检测
- 注入攻击检测
- 权限提升检测
- 恶意代码检测

### 📊 报告和分析

#### 综合安全报告
- 风险等级评估
- 漏洞详情分析
- 修复建议
- 历史记录管理

#### 可视化界面
- 实时检测状态
- 风险分布图表
- 详细检测日志
- 导出功能

## 安装和使用

### 安装步骤

1. 下载扩展文件
2. 在Chrome中打开 `chrome://extensions/`
3. 启用开发者模式
4. 点击"加载已解压的扩展程序"
5. 选择扩展文件夹

### 使用方法

1. 连接到MCP服务器
2. 配置LLM服务（可选，用于增强分析）
3. 启动安全扫描
4. 查看检测结果和报告

## 配置说明

### LLM配置
- 支持多种LLM服务（OpenAI、Claude等）
- 用于生成智能测试用例和深度安全分析
- 可选的增强功能

### 检测配置
- 自动生成测试用例数量
- 超时设置
- 风险等级阈值
- 检测规则启用/禁用

## 开发说明

### 统一检测引擎

新的统一检测引擎位于 `src/services/securityEngine.ts`，主要特点：

1. **统一接口**: `performSecurityAnalysis()` 函数支持所有检测类型
2. **参数支持**: 所有检测类型都支持传入参数进行动态测试
3. **类型安全**: 根据组件类型自动选择相应的检测逻辑
4. **模块化设计**: 易于扩展和维护

### 核心函数

```typescript
// 统一安全检测函数
public async performSecurityAnalysis(
  type: 'tool' | 'prompt' | 'resource',
  target: MCPTool | MCPPrompt | MCPResource,
  config: SecurityCheckConfig,
  parameters?: Record<string, unknown>
): Promise<any>
```

### 检测流程

1. **静态分析阶段**
   - 敏感信息检测
   - 关键词风险检测
   - 类型特定的检测逻辑

2. **LLM分析阶段**
   - 使用大语言模型进行深度分析
   - 生成详细的安全评估报告

3. **动态测试阶段**
   - 使用提供的参数执行实际测试
   - 评估实际运行时的安全风险

4. **智能测试阶段**
   - 自动生成安全测试用例
   - 执行智能测试并评估结果

## 更新日志

### v2.0.0 - 统一检测引擎
- ✅ 新增统一安全检测函数 `performSecurityAnalysis()`
- ✅ 所有检测类型支持参数传入
- ✅ 改进的检测流程和错误处理
- ✅ 更好的类型安全和代码组织

### v1.x.x - 基础功能
- ✅ 基础安全检测功能
- ✅ 被动检测和主动扫描
- ✅ 报告生成和导出
- ✅ 多语言支持

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License 