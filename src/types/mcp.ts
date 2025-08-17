// MCP协议类型定义

/**
 * 被动检测结果
 */
export interface PassiveDetectionResult {
  id: string;
  timestamp: number;
  type: 'tool' | 'resource' | 'prompt';
  targetName: string;
  uri?: string;
  parameters: Record<string, unknown>;
  result: any;
  riskLevel: SecurityRiskLevel;
  threats: Array<{
    type: string;
    severity: SecurityRiskLevel;
    description: string;
    evidence?: string;
  }>;
  sensitiveDataLeaks: Array<{
    type: string;
    content: string;
    severity: SecurityRiskLevel;
  }>;
  recommendation: string;
}

/**
 * JSON-RPC 2.0 消息基础接口
 */
export interface JSONRPCMessage {
  jsonrpc: '2.0';
  id?: string | number;
}

/**
 * JSON-RPC 请求
 */
export interface JSONRPCRequest extends JSONRPCMessage {
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
}

/**
 * JSON-RPC 响应
 */
export interface JSONRPCResponse extends JSONRPCMessage {
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number;
}

/**
 * JSON-RPC 通知
 */
export interface JSONRPCNotification extends JSONRPCMessage {
  method: string;
  params?: Record<string, unknown>;
}

/**
 * 认证类型
 */
export type AuthType = 'none' | 'combined';

/**
 * 组合认证配置
 */
export interface CombinedAuth {
  type: 'combined';
  apiKey?: {
    apiKey: string;
    headerName?: string; // 默认为 'Authorization'
    prefix?: string; // 默认为 'Bearer '
  };
  urlParams?: Array<{
    name: string;
    value: string;
  }>;
  customHeaders?: Array<{
    name: string;
    value: string;
  }>;
  basicAuth?: {
    username: string;
    password: string;
  };
}

/**
 * 认证配置联合类型
 */
export type AuthConfig = 
  | { type: 'none' }
  | CombinedAuth;

/**
 * MCP 工具参数 Schema
 */
export interface MCPToolInputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    default?: unknown;
  }>;
  required?: string[];
}

/**
 * MCP 工具定义
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: MCPToolInputSchema;
}

/**
 * MCP 资源定义
 */
export interface MCPResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
  uriTemplate?: string; // 资源模板的URI模板
}

/**
 * MCP 提示定义
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * MCP 工具调用结果
 */
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP 资源内容
 */
export interface MCPResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

/**
 * MCP 传输模式
 */
export type MCPTransportMode = 'sse' | 'streamable';

/**
 * MCP 服务器配置
 */
export interface MCPServerConfig {
  name: string;
  host: string; // 主机地址，如 http://127.0.0.1:8020
  ssePath?: string; // MCP路径，如 /sse (SSE模式) 或 /mcp (Streamable模式)
  messagePath?: string; // 消息路径，现在从SSE自动获取，可选
  transport: MCPTransportMode; // 传输模式：'sse' | 'streamable'
  sessionId?: string;
  headers?: Record<string, string>;
  auth?: AuthConfig; // 认证配置
}

/**
 * MCP 连接状态
 */
export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * MCP 调用历史记录
 */
export interface MCPCallHistory {
  id: string;
  timestamp: number;
  type: 'tool' | 'resource' | 'prompt';
  name: string;
  parameters?: Record<string, unknown>;
  result?: MCPToolResult | MCPResourceContent;
  error?: string;
  duration?: number;
  securityWarnings?: string[];
}

/**
 * 安全风险级别
 */
export type SecurityRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 安全检查结果
 */
export interface SecurityCheckResult {
  level: SecurityRiskLevel;
  warnings: string[];
  recommendations: string[];
}

/**
 * MCP 服务器能力
 */
export interface MCPServerCapabilities {
  resources?: boolean;
  tools?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

/**
 * 初始化响应
 */
export interface InitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

/**
 * LLM模型类型
 */
export type LLMType = 'openai' | 'claude' | 'gemini' | 'custom' | 'ollama';

/**
 * LLM配置
 */
export interface LLMConfig {
  id: string;
  name: string;
  type: LLMType;
  endpoint: string;
  apiKey?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  customHeaders?: Record<string, string>;
  enabled: boolean;
  description?: string;
}

/**
 * LLM请求参数
 */
export interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * LLM响应
 */
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
}

/**
 * 安全检测类型
 */
export type SecurityCheckType = 'tool' | 'prompt' | 'resource';

/**
 * 安全检测配置
 */
export interface SecurityCheckConfig {
  enabled: boolean;
  llmConfigId: string;
  autoGenerate: boolean;
  maxTestCases: number;
  timeout: number;
  enableLLMAnalysis?: boolean;
}

/**
 * LLM分析结果结构
 */
export interface LLMAnalysisResult {
  summary: string;
  riskLevel: SecurityRiskLevel;
  analysis: {
    description?: string;
    potentialImpact?: string;
    mitigation?: string;
    sideEffects?: string;
    [key: string]: any;
  };
  raw?: string; // 原始分析文本
}

/**
 * 工具安全检测结果
 */
export interface SecurityTestResult {
  name: string;  // toolName, promptName, resourceName
  scanType: string;  // active, passive
  uri?: string;
  riskLevel: SecurityRiskLevel;
  vulnerabilities: Array<{
    type: string;
    severity: SecurityRiskLevel;
    description: string;
    uri?: string;
    testCase?: string;
    source?: string;
    evidence?: string;
    recommendation: string;
  }>;
  testResults: Array<{
    testCase: string;
    parameters: Record<string, unknown>;
    result: any;
    riskAssessment: string;
    passed: boolean;
  }>;
  llmAnalysis: string | LLMAnalysisResult;
  timestamp: number;
}

/**
 * 综合安全报告 
 * const accessTest = {
          testType: 'direct_access',
          success: !error,
          duration: duration,
          result: testResult,
          riskAssessment: 'low'
        };
 */
export interface SecurityReport {
  id: string;
  serverName: string;
  timestamp: number;
  overallRisk: SecurityRiskLevel;
  toolResults: SecurityTestResult[];
  promptResults: SecurityTestResult[];
  resourceResults: SecurityTestResult[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  recommendations: string[];
  comprehensiveRiskAnalysis?: string; // LLM生成的综合风险分析报告
}

/**
 * 安全检测历史记录
 */
export interface SecurityHistoryRecord {
  id: string;
  serverName: string;
  serverConfig: MCPServerConfig;
  timestamp: number;
  scanType: 'active' | 'passive';
  report: SecurityReport | null;
  passiveResults?: PassiveDetectionResult[];
  status: 'completed' | 'failed' | 'cancelled';
  errorMessage?: string;
  duration?: number; // 扫描持续时间（毫秒）
  config: SecurityCheckConfig;
} 

/**
 * 被动检测规则类型定义
 */

// 检测规则分类
export type DetectionRuleCategory = 
  | 'security'        // 安全威胁
  | 'privacy'         // 隐私泄漏
  | 'compliance'      // 合规检查
  | 'data_quality'    // 数据质量
  | 'performance'     // 性能问题
  | 'custom';         // 自定义规则

// 检测范围
export type DetectionScope = 
  | 'parameters'      // 仅检测输入参数
  | 'output'          // 仅检测输出结果
  | 'both';           // 检测输入和输出

// 检测规则接口
export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  category: DetectionRuleCategory;
  enabled: boolean;
  
  // 正则表达式规则
  pattern: string;                    // 正则表达式模式
  flags?: string;                     // 正则标志 (g, i, m, s, u, y)
  scope: DetectionScope;              // 检测范围
  
  // 风险评估
  riskLevel: SecurityRiskLevel;       // 风险等级
  threatType: string;                 // 威胁类型
  
  // 匹配处理
  captureGroups?: string[];           // 捕获组名称
  maskSensitiveData?: boolean;        // 是否遮蔽敏感数据
  maxMatches?: number;                // 最大匹配数量
  
  // 元数据
  isBuiltin: boolean;                 // 是否为内置规则
  createdAt: number;                  // 创建时间
  updatedAt: number;                  // 更新时间
  tags?: string[];                    // 标签
  
  // 自定义处理
  customProcessor?: string;           // 自定义处理函数名
  
  // 建议和修复
  recommendation?: string;            // 安全建议
  remediation?: string;               // 修复建议
  references?: string[];              // 参考链接
}

// 检测规则匹配结果
export interface DetectionRuleMatch {
  rule: DetectionRule;
  matches: Array<{
    fullMatch: string;              // 完整匹配
    capturedGroups?: string[];      // 捕获组
    startIndex: number;             // 开始位置
    endIndex: number;               // 结束位置
    context?: string;               // 上下文
  }>;
  maskedContent?: string;             // 遮蔽后的内容
  severity: SecurityRiskLevel;        // 实际严重程度
}

// 规则集合接口
export interface DetectionRuleSet {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: DetectionRule[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// 规则验证结果
export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  testResults?: Array<{
    input: string;
    matches: boolean;
    captured?: string[];
  }>;
}

// 规则统计信息

/**
 * 组件参数分析结果
 */
export interface ComponentParameterAnalysis {
  hasParameters: boolean;
  parameterCount: number;
  parameters: Array<{
    name: string;
    type?: string;
    description?: string;
    required?: boolean;
    isOptional?: boolean;
  }>;
  requiresLLMGeneration: boolean; // 是否需要LLM生成参数
}

/**
 * 增强的工具定义（包含参数分析）
 */
export interface EnhancedMCPTool extends MCPTool {
  parameterAnalysis: ComponentParameterAnalysis;
  componentType: 'tool';
}

/**
 * 增强的提示定义（包含参数分析）
 */
export interface EnhancedMCPPrompt extends MCPPrompt {
  parameterAnalysis: ComponentParameterAnalysis;
  componentType: 'prompt';
}

/**
 * 增强的资源定义（包含参数分析）
 */
export interface EnhancedMCPResource extends MCPResource {
  parameterAnalysis: ComponentParameterAnalysis;
  componentType: 'resource';
  resourceType: '静态资源' | '动态资源';
}

/**
 * 统一的增强组件类型
 */
export type EnhancedMCPComponent = EnhancedMCPTool | EnhancedMCPPrompt | EnhancedMCPResource;

/**
 * 统一的风险条目
 */
export interface UnifiedRiskItem {
  id: string; // 唯一标识
  source: string; // 来源（工具名/提示名/资源URI）
  sourceType: 'tool' | 'prompt' | 'resource'; // 来源类型
  scanType: 'active' | 'passive'; // 扫描类型
  riskType: 'vulnerability' | 'threat' | 'risk' | 'test_failure' | 'llm_analysis'; // 风险类型
  severity: SecurityRiskLevel; // 严重程度
  title: string; // 标题
  description: string; // 描述
  evidence?: string; // 证据
  recommendation?: string; // 建议
  timestamp: number; // 时间戳
  testCase?: string; // 测试用例名称（如果是测试失败）
  rawData?: any; // 原始数据
}

/**
 * 统一的安全概览数据
 */
export interface UnifiedSecurityOverview {
  totalRisks: number;
  risksBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  risksBySource: {
    tool: number;
    prompt: number;
    resource: number;
  };
  risksByScanType: {
    active: number;
    passive: number;
  };
  risksByType: {
    vulnerability: number;
    threat: number;
    risk: number;
    test_failure: number;
    llm_analysis: number;
  };
  risks: UnifiedRiskItem[];
}
 