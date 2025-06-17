// MCP协议类型定义

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
 * MCP 服务器配置
 */
export interface MCPServerConfig {
  name: string;
  host: string; // 主机地址，如 http://127.0.0.1:8020
  ssePath: string; // SSE路径，如 /sse
  messagePath?: string; // 消息路径，现在从SSE自动获取，可选
  transport: 'sse';
  apiKey?: string;
  sessionId?: string;
  headers?: Record<string, string>;
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