import {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPToolResult,
  MCPResourceContent,
  MCPServerConfig,
  MCPConnectionStatus,
  InitializeResult,
  SecurityCheckResult,
  SecurityRiskLevel,
  SecurityCheckConfig,
  ComponentParameterAnalysis,
  EnhancedMCPTool,
  EnhancedMCPPrompt,
  EnhancedMCPResource,
  MCPTransportMode
} from '@/types/mcp';
import { i18n } from '../i18n';
import { securityEngine } from './securityEngine';

// 浏览器兼容的Streamable Transport实现
interface StreamableMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

class BrowserStreamableTransport {
  private url: URL;
  private _sessionId?: string;
  private protocolVersion?: string;
  private abortController?: AbortController;
  private requestInit?: RequestInit;

  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: StreamableMessage) => void;

  constructor(url: URL, options?: { requestInit?: RequestInit }) {
    this.url = url;
    this.requestInit = options?.requestInit;
  }

  async start(): Promise<void> {
    if (this.abortController) {
      throw new Error('Transport already started');
    }
    this.abortController = new AbortController();
  }

  async close(): Promise<void> {
    this.abortController?.abort();
    // 不要在主动关闭时触发onclose回调，避免无限递归
    // onclose回调应该只在非预期的连接中断时触发
  }

  private async getCommonHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };

    if (this._sessionId) {
      headers['mcp-session-id'] = this._sessionId;
    }

    if (this.protocolVersion) {
      headers['mcp-protocol-version'] = this.protocolVersion;
    }

    return headers;
  }

  async send(message: StreamableMessage | StreamableMessage[]): Promise<void> {
    try {
      const headers = await this.getCommonHeaders();
      console.log('Streamable发送请求到:', this.url.toString());
      console.log('请求头:', headers);
      console.log('请求体:', JSON.stringify(message, null, 2));
      
      const response = await fetch(this.url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: this.abortController?.signal,
        ...this.requestInit
      });

      console.log('收到响应状态:', response.status, response.statusText);

      // 处理session ID
      const sessionId = response.headers.get('mcp-session-id');
      if (sessionId) {
        console.log('设置session ID:', sessionId);
        this._sessionId = sessionId;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => null);
        const errorMessage = `HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`;
        console.error('HTTP请求失败:', errorMessage);
        throw new Error(errorMessage);
      }

      // 如果是202 Accepted，表示请求已接受，可能通过其他方式返回响应
      if (response.status === 202) {
        console.log('请求已接受 (202)');
        return;
      }

      // 处理响应
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        console.log('收到JSON响应:', data);
        const responseMessages = Array.isArray(data) ? data : [data];
        
        for (const msg of responseMessages) {
          this.onmessage?.(msg);
        }
      } else if (contentType?.includes('text/event-stream')) {
        console.log('收到SSE流响应，开始处理...');
        await this.handleEventStream(response);
      } else {
        console.log('收到非JSON响应，Content-Type:', contentType);
      }
    } catch (error) {
      console.error('Streamable send error:', error);
      this.onerror?.(error as Error);
      throw error;
    }
  }

  setProtocolVersion(version: string): void {
    this.protocolVersion = version;
  }

  get sessionId(): string | undefined {
    return this._sessionId;
  }

  /**
   * 处理SSE事件流
   */
  private async handleEventStream(response: Response): Promise<void> {
    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let hasReceivedData = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('SSE流结束，已接收数据:', hasReceivedData);
          // 处理最后的缓冲数据
          if (buffer.trim()) {
            this.processSSELine(buffer.trim());
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            this.processSSELine(trimmedLine);
            hasReceivedData = true;
          }
        }
      }
      
      console.log('SSE流处理完成，数据接收状态:', hasReceivedData);
    } catch (error) {
      console.error('处理SSE流失败:', error);
      this.onerror?.(error as Error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * 处理SSE的每一行数据
   */
  private processSSELine(line: string): void {
    if (!line) return;
    
    console.log('处理SSE行:', line);
    
    if (line.startsWith('event:')) {
      // 事件类型，暂时忽略
      return;
    }
    
    if (line.startsWith('data:')) {
      const data = line.substring(5).trim();
      if (!data) return;
      
      try {
        const message = JSON.parse(data);
        console.log('解析SSE消息:', message);
        this.onmessage?.(message);
      } catch (error) {
        console.error('解析SSE数据失败:', error, '原始数据:', data);
      }
    }
  }
}

class BrowserMCPClient {
  private transport: BrowserStreamableTransport | null = null;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  constructor(options: { name: string; version: string }) {
    // 客户端初始化
  }

  async connect(transport: BrowserStreamableTransport): Promise<any> {
    this.transport = transport;
    
    // 设置消息处理器
    this.transport.onmessage = (message) => {
      this.handleMessage(message);
    };

    this.transport.onerror = (error) => {
      console.error('Transport error:', error);
    };

    await this.transport.start();

    // 发送初始化请求
    const initMessage = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: 'MCP Security Inspector',
          version: '1.0.0'
        }
      }
    };

    return new Promise((resolve, reject) => {
      console.log('[BrowserMCPClient] 设置初始化请求Promise, ID=1');
      
      // 设置超时处理
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(1)) {
          console.error('[BrowserMCPClient] 初始化请求超时');
          this.pendingRequests.delete(1);
          reject(new Error('初始化请求超时'));
        }
      }, 10000); // 10秒超时
      
      // 创建包装的resolve和reject
      const wrappedResolve = (value: any) => {
        clearTimeout(timeout);
        console.log('[BrowserMCPClient] 初始化成功，清除超时器');
        
        // 检查响应是否是初始化响应
        if (value && (value.protocolVersion || value.serverInfo || value.capabilities)) {
          console.log('[BrowserMCPClient] 收到有效的初始化响应');
          resolve(value);
        } else {
          console.warn('[BrowserMCPClient] 收到的响应不是初始化响应:', value);
          // 创建一个默认的初始化响应
          const defaultResponse = {
            protocolVersion: '2024-11-05',
            capabilities: { tools: true, resources: true, prompts: true },
            serverInfo: { name: 'MCP Server', version: '1.0.0' }
          };
          resolve(defaultResponse);
        }
      };
      
      const wrappedReject = (error: any) => {
        clearTimeout(timeout);
        console.error('[BrowserMCPClient] 初始化失败，清除超时器');
        reject(error);
      };
      
      this.pendingRequests.set(1, { resolve: wrappedResolve, reject: wrappedReject });
      
      this.transport!.send(initMessage).catch(wrappedReject);
    });
  }

  private handleMessage(message: StreamableMessage): void {
    console.log('[BrowserMCPClient] 处理消息:', message);
    console.log('[BrowserMCPClient] 当前待处理请求数量:', this.pendingRequests.size);
    console.log('[BrowserMCPClient] 待处理请求IDs:', Array.from(this.pendingRequests.keys()));
    
    if (message.id !== undefined) {
      console.log('[BrowserMCPClient] 消息ID:', message.id, '类型:', typeof message.id);
      
      // 尝试同时匹配数字和字符串类型的ID
      let pending = this.pendingRequests.get(message.id);
      if (!pending && typeof message.id === 'string') {
        pending = this.pendingRequests.get(parseInt(message.id));
      } else if (!pending && typeof message.id === 'number') {
        pending = this.pendingRequests.get(message.id.toString());
      }
      
      if (pending) {
        const originalId = message.id;
        // 找到对应的键并删除
        for (const [key, value] of this.pendingRequests.entries()) {
          if (value === pending) {
            this.pendingRequests.delete(key);
            break;
          }
        }
        console.log('[BrowserMCPClient] 找到对应的待处理请求，原始ID:', originalId);
        
        if (message.error) {
          console.error('[BrowserMCPClient] 收到错误响应:', message.error);
          pending.reject(new Error(message.error.message || 'Unknown error'));
        } else {
          console.log('[BrowserMCPClient] 收到成功响应:', message.result);
          
          // 如果是初始化响应，设置协议版本
          if (message.result && message.result.protocolVersion && this.transport) {
            this.transport.setProtocolVersion(message.result.protocolVersion);
            console.log('[BrowserMCPClient] 设置协议版本:', message.result.protocolVersion);
          }
          
          console.log('[BrowserMCPClient] 准备resolve Promise, ID:', message.id);
          pending.resolve(message.result || message);
          console.log('[BrowserMCPClient] Promise已resolve, ID:', message.id);
        }
      } else {
        console.warn('[BrowserMCPClient] 收到未知ID的响应:', message.id);
        console.warn('[BrowserMCPClient] 可能的原因: 请求已超时或ID类型不匹配');
      }
    } else {
      console.log('[BrowserMCPClient] 收到通知消息:', message);
    }
  }

  async listTools(): Promise<any> {
    return this.sendRequest({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {}
    });
  }

  async listResources(): Promise<any> {
    return this.sendRequest({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'resources/list',
      params: {}
    });
  }

  async listPrompts(): Promise<any> {
    return this.sendRequest({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'prompts/list',
      params: {}
    });
  }

  async callTool(params: { name: string; arguments: any }): Promise<any> {
    return this.sendRequest({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params
    });
  }

  async readResource(params: { uri: string }): Promise<any> {
    return this.sendRequest({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'resources/read',
      params
    });
  }

  async getPrompt(params: { name: string; arguments?: any }): Promise<any> {
    return this.sendRequest({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'prompts/get',
      params
    });
  }

  private async sendRequest(message: StreamableMessage): Promise<any> {
    if (!this.transport) {
      throw new Error('Transport not connected');
    }

    return new Promise((resolve, reject) => {
      if (message.id !== undefined) {
        this.pendingRequests.set(message.id, { resolve, reject });
      }
      this.transport!.send(message).catch(reject);
    });
  }

  async close(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    
    // 清理待处理的请求
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }
}

// 导入被动检测相关类型
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
 * MCP 客户端服务
 * 负责与MCP服务器通信，实现协议规范
 */
export class MCPClient {
  private config: MCPServerConfig | null = null;
  private status: MCPConnectionStatus = 'disconnected';
  
  // SSE模式相关属性
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private sessionIdParamName: string = 'session_id'; // 动态保存参数名
  private messageEndpoint: string | null = null; // 从SSE获取的完整message端点
  
  // Streamable模式相关属性
  private mcpClient: BrowserMCPClient | null = null;
  private transport: BrowserStreamableTransport | null = null;
  private serverInfo: any = null; // 存储服务器初始化信息
  
  // 共用属性
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
  }>();

  // 被动检测相关属性
  private passiveDetectionEnabled = false;
  private securityConfig: SecurityCheckConfig | null = null;
  private passiveResults: PassiveDetectionResult[] = [];
  private passiveDetectionCallbacks: ((result: PassiveDetectionResult) => void)[] = [];

  // 增强组件缓存（连接时预处理）
  private enhancedTools: EnhancedMCPTool[] = [];
  private enhancedPrompts: EnhancedMCPPrompt[] = [];
  private enhancedResources: EnhancedMCPResource[] = [];
  private enhancedResourceTemplates: EnhancedMCPResource[] = [];
  private componentsInitialized = false;

  constructor() {}

  /**
   * 启用被动安全检测
   */
  public enablePassiveDetection(config: SecurityCheckConfig): void {
    console.log('[MCPClient] 启用被动检测:', config);
    this.passiveDetectionEnabled = true;
    this.securityConfig = config;
  }

  /**
   * 分析工具参数
   */
  private analyzeToolParameters(tool: MCPTool): ComponentParameterAnalysis {
    const inputSchema = tool.inputSchema;
    const properties = inputSchema?.properties || {};
    const required = inputSchema?.required || [];
    
    const parameters = Object.entries(properties).map(([name, schema]) => ({
      name,
      type: schema.type,
      description: schema.description,
      required: required.includes(name),
      isOptional: !required.includes(name)
    }));

    return {
      hasParameters: parameters.length > 0,
      parameterCount: parameters.length,
      parameters,
      requiresLLMGeneration: parameters.length > 0
    };
  }

  /**
   * 分析提示参数
   */
  private analyzePromptParameters(prompt: MCPPrompt): ComponentParameterAnalysis {
    const args = prompt.arguments || [];
    
    const parameters = args.map(arg => ({
      name: arg.name,
      description: arg.description,
      required: arg.required || false,
      isOptional: !arg.required
    }));

    return {
      hasParameters: parameters.length > 0,
      parameterCount: parameters.length,
      parameters,
      requiresLLMGeneration: parameters.length > 0
    };
  }

  /**
   * 分析资源参数
   */
  private analyzeResourceParameters(resource: MCPResource): ComponentParameterAnalysis {
    const uriTemplate = (resource as any).uriTemplate;
    
    if (!uriTemplate) {
      return {
        hasParameters: false,
        parameterCount: 0,
        parameters: [],
        requiresLLMGeneration: false
      };
    }

    // 提取模板中的参数
    const paramMatches = uriTemplate.match(/\{([^}]+)\}/g) || [];
    const parameters = paramMatches.map((match: string) => {
      const paramName = match.slice(1, -1);
      return {
        name: paramName,
        type: 'string',
        description: `URI模板参数: ${paramName}`,
        required: true,
        isOptional: false
      };
    });

    return {
      hasParameters: parameters.length > 0,
      parameterCount: parameters.length,
      parameters,
      requiresLLMGeneration: parameters.length > 0
    };
  }

  /**
   * 预处理工具组件
   */
  private preprocessTool(tool: MCPTool): EnhancedMCPTool {
    const parameterAnalysis = this.analyzeToolParameters(tool);
    
    return {
      ...tool,
      parameterAnalysis,
      componentType: 'tool'
    };
  }

  /**
   * 预处理提示组件
   */
  private preprocessPrompt(prompt: MCPPrompt): EnhancedMCPPrompt {
    const parameterAnalysis = this.analyzePromptParameters(prompt);
    
    return {
      ...prompt,
      parameterAnalysis,
      componentType: 'prompt'
    };
  }

  /**
   * 预处理资源组件
   */
  private preprocessResource(resource: MCPResource): EnhancedMCPResource {
    const parameterAnalysis = this.analyzeResourceParameters(resource);
    const uriTemplate = (resource as any).uriTemplate;
    
    return {
      ...resource,
      parameterAnalysis,
      componentType: 'resource',
      resourceType: uriTemplate ? '动态资源' : '静态资源'
    };
  }

  /**
   * 初始化组件（在连接时执行）
   */
  private async initializeComponents(): Promise<void> {
    if (this.componentsInitialized) {
      console.log('[MCPClient] 组件已初始化，跳过重复初始化');
      return;
    }

    try {
      console.log('[MCPClient] 开始初始化组件...');

      // 获取原始组件
      console.log('[MCPClient] 准备并行获取组件...');
      const [tools, prompts, resources, resourceTemplates] = await Promise.all([
        this.listTools().catch(error => {
          console.error('[MCPClient] 获取工具列表失败:', error);
          return [];
        }),
        this.listPrompts().catch(error => {
          console.error('[MCPClient] 获取提示列表失败:', error);
          return [];
        }),
        this.listResources().catch(error => {
          console.error('[MCPClient] 获取资源列表失败:', error);
          return [];
        }),
        this.listResourceTemplates().catch(error => {
          console.error('[MCPClient] 获取资源模板列表失败:', error);
          return [];
        })
      ]);
      console.log('[MCPClient] 组件获取完成');

      console.log(`[MCPClient] 获取到组件: ${tools.length}个工具, ${prompts.length}个提示, ${resources.length}个资源, ${resourceTemplates.length}个资源模板`);

      // 过滤和去重
      const validResourceTemplates = resourceTemplates.filter(template => template !== null);
      const processedResourceUris = new Set<string>();
      
      const filteredResources = resources.filter(resource => {
        // 检查资源的有效性
        if (!resource || (!resource.name && !resource.uri)) {
          console.warn('[MCPClient] 发现无效的资源对象，已过滤:', resource);
          return false;
        }
        
        const uri = resource.uri;
        if (!uri) {
          console.warn('[MCPClient] 资源缺少URI，已过滤:', resource);
          return false;
        }
        
        if (processedResourceUris.has(uri)) {
          return false;
        }
        processedResourceUris.add(uri);
        return true;
      });

      const filteredResourceTemplates = validResourceTemplates.filter(template => {
        // 检查资源模板的有效性
        if (!template || (!template.name && !template.uri && !(template as any).uriTemplate)) {
          console.warn('[MCPClient] 发现无效的资源模板对象，已过滤:', template);
          return false;
        }
        
        const uri = (template as any).uriTemplate || template.uri;
        if (!uri) {
          console.warn('[MCPClient] 资源模板缺少URI/uriTemplate，已过滤:', template);
          return false;
        }
        
        if (processedResourceUris.has(uri)) {
          return false;
        }
        processedResourceUris.add(uri);
        return true;
      });

      // 预处理组件
      this.enhancedTools = tools.map(tool => this.preprocessTool(tool));
      this.enhancedPrompts = prompts.map(prompt => this.preprocessPrompt(prompt));
      this.enhancedResources = filteredResources.map(resource => {
        const enhanced = this.preprocessResource(resource);
        console.log(`[MCPClient] 预处理静态资源:`, {
          name: resource.name,
          uri: resource.uri,
          enhanced_uri: enhanced.uri,
          hasParameters: enhanced.parameterAnalysis.hasParameters
        });
        return enhanced;
      });
      this.enhancedResourceTemplates = filteredResourceTemplates.map(template => {
        const enhanced = this.preprocessResource(template);
        console.log(`[MCPClient] 预处理资源模板:`, {
          name: template.name,
          uri: template.uri,
          uriTemplate: (template as any).uriTemplate,
          enhanced_uri: enhanced.uri,
          hasParameters: enhanced.parameterAnalysis.hasParameters
        });
        return enhanced;
      });

      // 统计信息
      const toolsWithParams = this.enhancedTools.filter(t => t.parameterAnalysis.hasParameters).length;
      const promptsWithParams = this.enhancedPrompts.filter(p => p.parameterAnalysis.hasParameters).length;
      const resourcesWithParams = this.enhancedResources.filter(r => r.parameterAnalysis.hasParameters).length;
      const templatesWithParams = this.enhancedResourceTemplates.filter(rt => rt.parameterAnalysis.hasParameters).length;

      console.log(`[MCPClient] 组件预处理完成: 工具 ${this.enhancedTools.length}个(${toolsWithParams}个有参数), 提示 ${this.enhancedPrompts.length}个(${promptsWithParams}个有参数), 资源 ${this.enhancedResources.length}个(${resourcesWithParams}个有参数), 资源模板 ${this.enhancedResourceTemplates.length}个(${templatesWithParams}个有参数)`);

      this.componentsInitialized = true;
    } catch (error) {
      console.error('[MCPClient] 组件初始化失败:', error);
      // 初始化失败时，设置为空数组
      this.enhancedTools = [];
      this.enhancedPrompts = [];
      this.enhancedResources = [];
      this.enhancedResourceTemplates = [];
      this.componentsInitialized = false;
    }
  }

  /**
   * 获取增强的工具列表
   */
  public getEnhancedTools(): EnhancedMCPTool[] {
    return [...this.enhancedTools];
  }

  /**
   * 获取增强的提示列表
   */
  public getEnhancedPrompts(): EnhancedMCPPrompt[] {
    return [...this.enhancedPrompts];
  }

  /**
   * 获取增强的资源列表
   */
  public getEnhancedResources(): EnhancedMCPResource[] {
    return [...this.enhancedResources];
  }

  /**
   * 获取增强的资源模板列表
   */
  public getEnhancedResourceTemplates(): EnhancedMCPResource[] {
    return [...this.enhancedResourceTemplates];
  }

  /**
   * 检查组件是否已初始化
   */
  public isComponentsInitialized(): boolean {
    return this.componentsInitialized;
  }

  /**
   * 禁用被动安全检测
   */
  public disablePassiveDetection(): void {
    console.log('[MCPClient] 禁用被动检测');
    this.passiveDetectionEnabled = false;
    this.securityConfig = null;
  }

  /**
   * 添加被动检测结果监听器
   */
  public addPassiveDetectionListener(callback: (result: PassiveDetectionResult) => void): void {
    this.passiveDetectionCallbacks.push(callback);
  }

  /**
   * 移除被动检测结果监听器
   */
  public removePassiveDetectionListener(callback: (result: PassiveDetectionResult) => void): void {
    this.passiveDetectionCallbacks = this.passiveDetectionCallbacks.filter(cb => cb !== callback);
  }

  /**
   * 获取被动检测结果
   */
  public getPassiveDetectionResults(): PassiveDetectionResult[] {
    return [...this.passiveResults];
  }

  /**
   * 清空被动检测结果
   */
  public clearPassiveDetectionResults(): void {
    this.passiveResults = [];
  }

  /**
   * 获取当前服务器配置
   */
  public getCurrentConfig(): MCPServerConfig | null {
    return this.config;
  }

  /**
   * 执行被动安全检测
   */
  private async performPassiveDetection(
    type: 'tool' | 'resource' | 'prompt',
    targetName: string,
    parameters: Record<string, unknown>,
    result: any,
    uri?: string
  ): Promise<void> {
    console.log(`[被动检测] 开始执行: type=${type}, targetName=${targetName}`);
    if (!this.passiveDetectionEnabled || !this.securityConfig) {
      console.log(`[被动检测] 跳过执行: passiveDetectionEnabled=${this.passiveDetectionEnabled}, securityConfig=${!!this.securityConfig}`);
      return;
    }

    try {
      console.log(`[被动检测] 开始检测引擎调用`);
      // 使用新的检测引擎
      const { DetectionEngine } = await import('./detectionEngine');
      const detectionEngine = DetectionEngine.getInstance();

      // 执行基于正则表达式的检测
      const ruleMatches = await detectionEngine.detectThreats(parameters, result);
      console.log(`[被动检测] 检测完成，找到 ${ruleMatches.length} 个规则匹配`);

      // 如果没有命中任何规则，直接丢弃结果
      if (ruleMatches.length === 0) {
        console.log(`[被动检测] 没有命中任何规则，丢弃结果`);
        return;
      }

      // 转换检测结果为被动检测结果格式
      const threats: Array<{
        type: string;
        severity: SecurityRiskLevel;
        description: string;
        evidence?: string;
      }> = [];
      
      const sensitiveDataLeaks: Array<{
        type: string;
        content: string;
        severity: SecurityRiskLevel;
      }> = [];

      // 处理规则匹配结果
      for (const match of ruleMatches) {
        const rule = match.rule;
        
        // 添加威胁信息
        for (const matchDetail of match.matches) {
          threats.push({
            type: rule.threatType,
            severity: rule.riskLevel,
            description: `${rule.name}: ${rule.description}`,
            evidence: `匹配内容: "${matchDetail.fullMatch.substring(0, 100)}${matchDetail.fullMatch.length > 100 ? '...' : ''}" (位置: ${matchDetail.startIndex}-${matchDetail.endIndex})`
          });
        }

        // 如果需要遮蔽敏感数据
        if (rule.maskSensitiveData && match.maskedContent) {
          sensitiveDataLeaks.push({
            type: rule.threatType,
            content: match.maskedContent,
            severity: rule.riskLevel
          });
        }
      }

      // 计算整体风险等级
      let maxRiskLevel: SecurityRiskLevel = 'low';
      const allRisks = [...threats, ...sensitiveDataLeaks];
      for (const risk of allRisks) {
        const riskPriority = { low: 1, medium: 2, high: 3, critical: 4 };
        if (riskPriority[risk.severity] > riskPriority[maxRiskLevel]) {
          maxRiskLevel = risk.severity;
        }
      }

      // 如果是低危告警，直接丢弃，不存储和通知
      if (maxRiskLevel === 'low') {
        console.log(`[被动检测] 低危告警，丢弃结果: ${type} ${targetName}`);
        return;
      }

      // 生成建议
      let recommendation = '继续监控，保持当前安全措施';
      if (maxRiskLevel === 'critical') {
        recommendation = '发现严重安全风险，建议立即停止使用并检查';
      } else if (maxRiskLevel === 'high') {
        recommendation = '发现高风险问题，建议立即处理';
      } else if (maxRiskLevel === 'medium') {
        recommendation = '发现中等风险，建议加强安全措施';
      } else if (threats.length > 0 || sensitiveDataLeaks.length > 0) {
        recommendation = '发现潜在风险，建议进一步检查';
      }

      // 创建检测结果
      const detectionResult: PassiveDetectionResult = {
        id: `passive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type,
        targetName,
        uri,
        parameters,
        result,
        riskLevel: maxRiskLevel,
        threats,
        sensitiveDataLeaks,
        recommendation
      };

      // 存储结果
      this.passiveResults.unshift(detectionResult); // 新结果放在前面
      
      // 限制结果数量，避免内存占用过大
      if (this.passiveResults.length > 100) {
        this.passiveResults = this.passiveResults.slice(0, 100);
      }

      // 通知监听器
      this.passiveDetectionCallbacks.forEach(callback => callback(detectionResult));

      console.log(`[被动检测] ${type} ${targetName} - 风险等级: ${maxRiskLevel}`, detectionResult);

    } catch (error) {
      console.error('被动安全检测失败:', error);
    }
  }

  /**
   * 生成Basic认证字符串
   */
  private generateBasicAuth(username: string, password: string): string {
    const credentials = btoa(`${username}:${password}`);
    return `Basic ${credentials}`;
  }

  /**
   * 应用认证配置到请求头
   */
  private applyAuthHeaders(headers: Record<string, string>): void {
    if (!this.config?.auth || this.config.auth.type === 'none') return;

    if (this.config.auth.type === 'combined') {
      // 应用API Key认证
      if (this.config.auth.apiKey && this.config.auth.apiKey.apiKey) {
        const headerName = this.config.auth.apiKey.headerName || 'Authorization';
        const prefix = this.config.auth.apiKey.prefix || 'Bearer ';
        headers[headerName] = `${prefix}${this.config.auth.apiKey.apiKey}`;
      }

      // 应用Basic Auth
      if (this.config.auth.basicAuth && this.config.auth.basicAuth.username && this.config.auth.basicAuth.password) {
        headers['Authorization'] = this.generateBasicAuth(
          this.config.auth.basicAuth.username,
          this.config.auth.basicAuth.password
        );
      }

      // 应用自定义请求头
      if (this.config.auth.customHeaders) {
        this.config.auth.customHeaders.forEach(header => {
          headers[header.name] = header.value;
        });
      }
    }
  }

  /**
   * 应用认证配置到URL
   */
  private applyAuthToUrl(url: string): string {
    if (!this.config?.auth || this.config.auth.type === 'none') {
      return url;
    }

    const urlObj = new URL(url);

    if (this.config.auth.type === 'combined' && this.config.auth.urlParams) {
      // 组合认证：应用URL参数
      console.log('应用URL参数认证，参数数量:', this.config.auth.urlParams.length);
      this.config.auth.urlParams.forEach(param => {
        if (param.name && param.value) {
          console.log(`添加URL参数: ${param.name}=${param.value}`);
          urlObj.searchParams.append(param.name, param.value);
        }
      });
    }
    
    const finalUrl = urlObj.toString();
    console.log('URL参数认证后的地址:', finalUrl);
    return finalUrl;
  }

  /**
   * 配置客户端
   */
  configure(config: MCPServerConfig): void {
    this.config = config;
    
    // 配置新服务器时清空相关状态
    this.clearPassiveDetectionResults();
    this.componentsInitialized = false;
    this.enhancedTools = [];
    this.enhancedPrompts = [];
    this.enhancedResources = [];
    this.enhancedResourceTemplates = [];
    
    // 同时清空SecurityEngine状态
    securityEngine.clearAllStates();
  }

  /**
   * 连接到MCP服务器
   */
  async connect(): Promise<InitializeResult> {
    if (!this.config) {
      throw new Error(i18n.t().config.messages.configNotSet);
    }

    console.log('开始连接MCP服务器:', this.config);
    this.status = 'connecting';

    try {
      if (this.config.transport === 'streamable') {
        // Streamable HTTP方式
        console.log('使用Streamable HTTP传输方式');
        await this.establishStreamableConnection();
        console.log('Streamable连接建立成功');
      } else {
        // SSE方式：先建立SSE连接获取session_id
        console.log('使用SSE传输方式');
        await this.establishSSEConnection();
        console.log('SSE连接建立成功，session_id:', this.sessionId);
      }
      
      // 初始化连接
      console.log('开始初始化MCP连接...');
      const initResult = await this.initialize();
      console.log('MCP初始化成功:', initResult);
      
      this.status = 'connected';

      // 连接成功后立即初始化组件
      console.log('开始预处理组件...');
      await this.initializeComponents();
      console.log('组件预处理完成');
      
      return initResult;
    } catch (error) {
      console.error('连接失败:', error);
      this.status = 'error';
      
      // 清理资源
      await this.cleanup();
      
      // 确保错误信息是字符串
      if (error instanceof Error) {
        throw new Error(`${i18n.t().config.messages.connectFailed}: ${error.message}`);
      } else if (typeof error === 'string') {
        throw new Error(`${i18n.t().config.messages.connectFailed}: ${error}`);
      } else {
        throw new Error(`${i18n.t().config.messages.connectFailed}: ${JSON.stringify(error)}`);
      }
    }
  }

  /**
   * 获取SSE端点URL
   */
  private getSSEEndpoint(): string {
    if (!this.config) {
      throw new Error('MCP客户端未配置');
    }

    let url = this.config.host.replace(/\/$/, '') + this.config.ssePath;
    
    // 如果配置了组合认证，处理其中的URL参数
    if (this.config.auth?.type === 'combined') {
      console.warn('警告：EventSource不支持自定义请求头，组合认证中的请求头部分无法用于SSE连接。');
      
      // 添加URL参数部分
      if (this.config.auth.urlParams) {
        const params = new URLSearchParams();
        this.config.auth.urlParams.forEach(param => {
          params.append(param.name, param.value);
        });
        const paramString = params.toString();
        if (paramString) {
          url += (url.includes('?') ? '&' : '?') + paramString;
          console.log('已将组合认证中的URL参数添加到SSE连接');
        }
      }

      // 尝试将API Key转换为URL参数
      if (this.config.auth.apiKey?.apiKey) {
        const params = new URLSearchParams();
        const headerName = this.config.auth.apiKey.headerName || 'Authorization';
        const prefix = this.config.auth.apiKey.prefix || 'Bearer ';
        const apiKeyValue = `${prefix}${this.config.auth.apiKey.apiKey}`;
        
        params.append(`header_${headerName.toLowerCase()}`, apiKeyValue);
        const paramString = params.toString();
        if (paramString) {
          url += (url.includes('?') ? '&' : '?') + paramString;
          console.log(`已将组合认证中的API Key转换为URL参数用于SSE连接：${headerName}`);
        }
      }

      // 尝试将Basic Auth转换为URL参数
      if (this.config.auth.basicAuth?.username && this.config.auth.basicAuth?.password) {
        const params = new URLSearchParams();
        const username = this.config.auth.basicAuth.username;
        const password = this.config.auth.basicAuth.password;
        params.append('auth_user', username);
        params.append('auth_pass', password);
        const paramString = params.toString();
        if (paramString) {
          url += (url.includes('?') ? '&' : '?') + paramString;
          console.log('已将组合认证中的Basic Auth转换为URL参数用于SSE连接');
        }
      }
      
      console.warn('注意：服务器需要支持这些URL参数格式的认证。如果服务器不支持，SSE连接可能失败。');
    }

    return url;
  }

  /**
   * 获取消息发送端点
   */
  private getMessageEndpoint(): string {
    if (!this.config) {
      throw new Error('MCP客户端未配置');
    }

    if (!this.messageEndpoint) {
      throw new Error('消息端点未从SSE获取到');
    }

    let endpoint: string;
    // 如果messageEndpoint是相对路径，需要加上host
    if (this.messageEndpoint.startsWith('/')) {
      const baseUrl = this.config.host.replace(/\/$/, '');
      endpoint = `${baseUrl}${this.messageEndpoint}`;
    } else {
      // 如果是完整URL，直接使用
      endpoint = this.messageEndpoint;
    }

    // 应用URL参数认证
    return this.applyAuthToUrl(endpoint);
  }

  /**
   * 使用fetch + ReadableStream实现SSE连接（支持自定义请求头）
   */
  private async establishFetchSSEConnection(): Promise<void> {
    if (!this.config) return;

    return new Promise(async (resolve, reject) => {
      // 构建SSE端点URL并应用URL参数认证
      const baseSSEEndpoint = this.config!.host.replace(/\/$/, '') + this.config!.ssePath;
      const sseEndpoint = this.applyAuthToUrl(baseSSEEndpoint);
      console.log('使用Fetch方式建立SSE连接到:', sseEndpoint);

      const headers: Record<string, string> = {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      };

      // 应用认证配置到请求头
      this.applyAuthHeaders(headers);

      // 应用自定义headers
      if (this.config!.headers) {
        Object.entries(this.config!.headers).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            headers[key] = String(value);
          }
        });
      }

      let resolved = false;

      try {
        const response = await fetch(sseEndpoint, {
          method: 'GET',
          headers,
          mode: 'cors'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('响应体为空');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processChunk = async () => {
          try {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('SSE流结束');
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后一个不完整的行

            for (const line of lines) {
              this.processFetchSSELine(line, resolve, resolved);
              if (resolved) break;
            }

            if (!resolved) {
              // 继续读取下一个chunk
              processChunk();
            }
          } catch (error) {
            console.error('读取SSE流失败:', error);
            if (!resolved) {
              resolved = true;
              reject(error);
            }
          }
        };

        processChunk();

        // 超时处理
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            reader.cancel();
            reject(new Error('等待服务器推送session_id超时'));
          }
        }, 10000);

      } catch (error) {
        console.error('Fetch SSE连接失败:', error);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      }
    });
  }

  /**
   * 处理Fetch SSE的每一行数据
   */
  private processFetchSSELine(line: string, resolve: () => void, resolved: boolean): void {
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      
      // 检查是否包含endpoint信息
      if (data.includes('session_id=') || data.includes('sessionId=')) {
        // 保存完整的message端点
        this.messageEndpoint = data.trim();
        
                 // 提取sessionId
         let match = data.match(/sessionId=([a-f0-9\-]+)/);
         if (match && match[1]) {
           this.sessionId = match[1];
           this.sessionIdParamName = 'sessionId';
           console.log('从Fetch SSE中获取到完整端点:', this.messageEndpoint);
           console.log('提取的sessionId:', this.sessionId, '参数名:', this.sessionIdParamName);
           if (!resolved) {
             resolve();
           }
           return;
         }
         
         match = data.match(/session_id=([a-f0-9\-]+)/);
         if (match && match[1]) {
           this.sessionId = match[1];
           this.sessionIdParamName = 'session_id';
           console.log('从Fetch SSE中获取到完整端点:', this.messageEndpoint);
           console.log('提取的sessionId:', this.sessionId, '参数名:', this.sessionIdParamName);
           if (!resolved) {
             resolve();
           }
           return;
         }
      }

      // 处理其他消息
      if (data === 'ping') {
        return;
      }

      // 尝试解析JSON-RPC响应
      try {
        const response: JSONRPCResponse = JSON.parse(data);
        this.handleResponse(response);
      } catch (e) {
        console.log('收到非JSON消息:', data);
      }
    }
  }

  /**
   * 建立Streamable HTTP连接
   */
  private async establishStreamableConnection(): Promise<void> {
    if (!this.config) {
      throw new Error('MCP客户端未配置');
    }

    try {
      console.log('开始建立Streamable连接...');
      
      // 初始化MCP客户端
      this.mcpClient = new BrowserMCPClient({ 
        name: 'mcp-security-inspector', 
        version: '1.0.0' 
      });
      console.log('MCP客户端实例已创建');

      // 初始化传输层
      const baseUrl = this.config.host.replace(/\/$/, '');
      const mcpPath = this.config.ssePath || '/mcp';
      const fullUrl = `${baseUrl}${mcpPath}`;
      const url = new URL(fullUrl);
      console.log('连接URL:', fullUrl);
      
      // 构建请求选项，包含认证信息
      const requestInit: RequestInit = {};
      
      // 应用认证配置
      if (this.config.auth && this.config.auth.type === 'combined') {
        const headers: Record<string, string> = {};
        this.applyAuthHeaders(headers);
        requestInit.headers = headers;
        console.log('应用认证配置:', Object.keys(headers));
      }
      
      this.transport = new BrowserStreamableTransport(url, { requestInit });
      console.log('传输层已创建');

      // 设置传输层事件处理
      this.setupStreamableTransport();
      console.log('传输层事件处理器已设置');

      // 连接到服务器并获取初始化结果
      const initResult = await this.mcpClient.connect(this.transport);
      console.log('收到初始化结果:', initResult);
      
      // 存储服务器信息供后续使用
      this.serverInfo = initResult;
      
      console.log('Streamable HTTP连接建立成功');
    } catch (error) {
      console.error('Streamable连接失败:', error);
      throw new Error(`建立Streamable连接失败: ${error}`);
    }
  }

  /**
   * 设置Streamable传输层事件处理
   */
  private setupStreamableTransport(): void {
    if (!this.transport) return;

    this.transport.onclose = () => {
      console.log('Streamable传输连接关闭');
      // 避免无限递归，只设置状态但不调用cleanup
      if (this.status === 'connected') {
        this.status = 'disconnected';
      }
    };

    this.transport.onerror = (error: Error) => {
      console.error('Streamable传输错误:', error);
      // 避免无限递归，只设置状态但不调用cleanup
      if (this.status !== 'error') {
        this.status = 'error';
      }
    };
  }

  /**
   * 建立SSE连接并获取session_id
   */
  private async establishSSEConnection(): Promise<void> {
    if (!this.config) return;

    // 如果配置了组合认证，优先使用Fetch方式（支持自定义请求头）
    if (this.config.auth?.type === 'combined') {
      console.log('检测到组合认证方式，使用Fetch方式建立SSE连接以支持自定义请求头');
      return this.establishFetchSSEConnection();
    }

    // 否则使用标准EventSource
    return this.establishEventSourceConnection();
  }

  /**
   * 使用标准EventSource建立连接
   */
  private async establishEventSourceConnection(): Promise<void> {
    if (!this.config) return;

    return new Promise((resolve, reject) => {
      // 使用新的SSE端点获取方法
      const sseEndpoint = this.getSSEEndpoint();
      console.log('建立EventSource连接到:', sseEndpoint);

      try {
        this.eventSource = new EventSource(sseEndpoint);
      } catch (error) {
        console.error('创建EventSource失败:', error);
        reject(new Error('无法创建SSE连接'));
        return;
      }
      
      let resolved = false;
      
      this.eventSource.onopen = () => {
        console.log('SSE连接已建立，等待服务器推送endpoint信息...');
      };

      // 监听特定的'endpoint'事件类型
      this.eventSource.addEventListener('endpoint', (event) => {
        try {
          console.log('收到endpoint事件:', {
            type: event.type,
            data: event.data
          });
          
          // 解析endpoint数据，直接保存完整的message端点
          // 格式：/messages/?session_id=xxx 或 /mcp/server/xxx/fla/message?sessionId=xxx
          if (event.data.includes('session_id=') || event.data.includes('sessionId=')) {
            // 保存完整的message端点
            this.messageEndpoint = event.data.trim();
            
            // 提取sessionId用于日志和其他用途
            let match = event.data.match(/sessionId=([a-f0-9\-]+)/);
            if (match) {
              this.sessionId = match[1];
              this.sessionIdParamName = 'sessionId';
              console.log('从endpoint事件中获取到完整端点:', this.messageEndpoint);
              console.log('提取的sessionId:', this.sessionId, '参数名:', this.sessionIdParamName);
              if (!resolved) {
                resolved = true;
                resolve();
              }
              return;
            }
            
            match = event.data.match(/session_id=([a-f0-9\-]+)/);
            if (match) {
              this.sessionId = match[1];
              this.sessionIdParamName = 'session_id';
              console.log('从endpoint事件中获取到完整端点:', this.messageEndpoint);
              console.log('提取的sessionId:', this.sessionId, '参数名:', this.sessionIdParamName);
              if (!resolved) {
                resolved = true;
                resolve();
              }
              return;
            }
          }
        } catch (error) {
          console.error('处理endpoint事件失败:', error);
        }
      });

      this.eventSource.onmessage = (event) => {
        try {
          console.log('收到普通消息事件:', {
            type: event.type,
            data: event.data,
            lastEventId: event.lastEventId
          });
          
          // 备用处理：检查普通消息中是否包含endpoint信息
          if (event.data.includes('session_id=') || event.data.includes('sessionId=')) {
            if (!this.messageEndpoint) {
              // 保存完整的message端点
              this.messageEndpoint = event.data.trim();
              
              // 提取sessionId
              let match = event.data.match(/sessionId=([a-f0-9\-]+)/);
              if (match) {
                this.sessionId = match[1];
                this.sessionIdParamName = 'sessionId';
                console.log('从普通消息中获取到完整端点:', this.messageEndpoint);
                console.log('提取的sessionId:', this.sessionId, '参数名:', this.sessionIdParamName);
                if (!resolved) {
                  resolved = true;
                  resolve();
                }
                return;
              }
              
              match = event.data.match(/session_id=([a-f0-9\-]+)/);
              if (match) {
                this.sessionId = match[1];
                this.sessionIdParamName = 'session_id';
                console.log('从普通消息中获取到完整端点:', this.messageEndpoint);
                console.log('提取的sessionId:', this.sessionId, '参数名:', this.sessionIdParamName);
                if (!resolved) {
                  resolved = true;
                  resolve();
                }
                return;
              }
            }
          }
          
          // 如果是ping消息，忽略
          if (event.data === 'ping') {
            return;
          }

          // 处理JSON-RPC响应
          try {
            const response: JSONRPCResponse = JSON.parse(event.data);
            this.handleResponse(response);
          } catch (e) {
            // 不是JSON格式，可能是其他消息
            console.log('收到非JSON消息:', event.data);
          }
        } catch (error) {
          console.error('处理SSE消息失败:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE连接错误:', error);
        if (!resolved) {
          // 初次连接失败 - 关闭EventSource防止重连
          resolved = true;
          reject(new Error('SSE连接失败'));
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
        }
        // 连接成功后的错误 - 让EventSource自己处理重连
      };

      // 超时处理 - 增加超时时间，因为需要等待服务器推送
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('等待服务器推送session_id超时，请检查服务器是否正确实现了MCP SSE协议'));
        }
      }, 10000); // 10秒超时
    });
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    await this.cleanup();
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    // 清理SSE连接
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // 清理Streamable连接
    if (this.transport) {
      // 先清除事件处理器，避免在关闭时触发回调
      this.transport.onclose = undefined;
      this.transport.onerror = undefined;
      this.transport.onmessage = undefined;
    }
    
    if (this.mcpClient) {
      try {
        await this.mcpClient.close();
      } catch (error) {
        console.warn('关闭MCP客户端时出错:', error);
      }
      this.mcpClient = null;
    }
    
    if (this.transport) {
      this.transport = null;
    }
    
    // 清理待处理的请求
    this.pendingRequests.forEach(({ reject, timestamp }) => {
      reject(new Error('连接已断开'));
    });
    this.pendingRequests.clear();
    
    // 重置状态
    this.sessionId = null;
    this.sessionIdParamName = 'session_id'; // 重置为默认值
    this.messageEndpoint = null;
    this.serverInfo = null;
    this.status = 'disconnected';
    
    // 清空所有状态
    this.clearPassiveDetectionResults();
    this.componentsInitialized = false;
    this.enhancedTools = [];
    this.enhancedPrompts = [];
    this.enhancedResources = [];
    this.enhancedResourceTemplates = [];
    
    // 清空SecurityEngine状态
    securityEngine.clearAllStates();
  }

  /**
   * 获取连接状态
   */
  getStatus(): MCPConnectionStatus {
    return this.status;
  }

  /**
   * 初始化MCP连接
   */
  private async initialize(): Promise<InitializeResult> {
    if (this.config?.transport === 'streamable' && this.mcpClient) {
      // Streamable模式 - 连接时已经自动初始化
      // 连接过程中已经通过transport自动完成了初始化
      try {
        // 发送initialized通知（通过transport）
        if (this.transport) {
          try {
            await this.transport.send({
              jsonrpc: '2.0',
              method: 'notifications/initialized'
            });
            console.log('已发送initialized通知');
          } catch (error) {
            console.warn('发送initialized通知失败，但继续执行:', error);
          }
        }
        
        // 如果有存储的服务器信息，直接返回
        if (this.serverInfo) {
          console.log('返回存储的服务器信息:', this.serverInfo);
          return this.serverInfo;
        }
        
        // 备用：返回一个标准的InitializeResult
        const serverInfo = {
          protocolVersion: '2024-11-05',
          capabilities: {
            resources: true,
            tools: true,
            prompts: true
          },
          serverInfo: {
            name: 'MCP Server',
            version: '1.0.0'
          }
        };
        return serverInfo as InitializeResult;
      } catch (error) {
        console.error('Streamable模式初始化失败:', error);
        throw error;
      }
    } else {
      // SSE模式
      const initParams: any = {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: {
            listChanged: true
          },
          sampling: {}
        },
        clientInfo: {
          name: 'MCP Security Inspector',
          version: '1.0.0'
        }
      };

      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'initialize',
        params: initParams
      };

      const response = await this.sendRequest(request);
      
      // 发送initialized通知
      try {
        await this.sendNotification({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        });
      } catch (error) {
        console.warn('发送initialized通知失败，但连接仍然有效:', error);
      }
      
      return response.result as InitializeResult;
    }
  }

  /**
   * 发送通知
   */
  private async sendNotification(notification: any): Promise<void> {
    if (!this.config) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // 应用认证配置
    this.applyAuthHeaders(headers);

    // 安全地添加自定义headers，过滤掉null/undefined值
    if (this.config.headers) {
      Object.entries(this.config.headers).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          headers[key] = String(value);
        }
      });
    }

    // 选择合适的端点发送通知
    let endpoint: string;
    if (this.messageEndpoint) {
      // 如果有从SSE获取的消息端点，优先使用
      const baseEndpoint = this.messageEndpoint.startsWith('/') 
        ? `${this.config.host.replace(/\/$/, '')}${this.messageEndpoint}`
        : this.messageEndpoint;
      endpoint = this.applyAuthToUrl(baseEndpoint);
    } else {
      // 否则使用SSE端点
      endpoint = this.getSSEEndpoint();
    }

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(notification)
      });
    } catch (error) {
      console.warn('Failed to send notification:', error);
    }
  }

  /**
   * 获取工具列表
   */
  async listTools(): Promise<MCPTool[]> {
    if (this.config?.transport === 'streamable' && this.mcpClient) {
      // Streamable模式
      try {
        console.log('[MCPClient] Streamable模式开始获取工具列表...');
        const response = await this.mcpClient.listTools();
        console.log('[MCPClient] Streamable模式工具列表原始响应:', response);
        
        // 处理不同的响应格式
        let tools: MCPTool[] = [];
        if (Array.isArray(response)) {
          tools = response;
        } else if (response && response.tools) {
          tools = response.tools;
        } else if (response && Array.isArray(response.result)) {
          tools = response.result;
        } else if (response && response.result && response.result.tools) {
          tools = response.result.tools;
        }
        
        console.log(`[MCPClient] Streamable模式获取到 ${tools.length} 个工具`);
        return tools;
      } catch (error) {
        console.error('Streamable模式获取工具列表失败:', error);
        throw error;
      }
    } else {
      // SSE模式
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'tools/list',
        params: {}
      };

      const response = await this.sendRequest(request);
      const result = response.result as { tools?: MCPTool[] };
      return result?.tools || [];
    }
  }

  /**
   * 获取资源列表
   */
  async listResources(): Promise<MCPResource[]> {
    if (this.config?.transport === 'streamable' && this.mcpClient) {
      // Streamable模式
      try {
        console.log('[MCPClient] Streamable模式开始获取资源列表...');
        const response = await this.mcpClient.listResources();
        console.log('[MCPClient] Streamable模式资源列表原始响应:', response);
        
        // 处理不同的响应格式
        let rawResources: MCPResource[] = [];
        if (Array.isArray(response)) {
          rawResources = response;
        } else if (response && response.resources) {
          rawResources = response.resources;
        } else if (response && Array.isArray(response.result)) {
          rawResources = response.result;
        } else if (response && response.result && response.result.resources) {
          rawResources = response.result.resources;
        }
        
        // 过滤掉null或无效的资源
        const resources = rawResources.filter((resource: any) => resource !== null && resource !== undefined);
        
        console.log(`[MCPClient] Streamable模式收到资源列表：${resources.length} 个有效资源（原始：${rawResources.length}个）`);
        return resources;
      } catch (error) {
        console.error('Streamable模式获取资源列表失败:', error);
        throw error;
      }
    } else {
      // SSE模式
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'resources/list',
        params: {}
      };

      console.log('[MCPClient] 发送获取资源列表请求...');
      const response = await this.sendRequest(request);
      const result = response.result as { resources?: MCPResource[] };
      const rawResources = result?.resources || [];
      
      // 过滤掉null或无效的资源
      const resources = rawResources.filter(resource => resource !== null && resource !== undefined);
      
      if (rawResources.length !== resources.length) {
        console.warn(`[MCPClient] 过滤掉 ${rawResources.length - resources.length} 个null/undefined资源`);
      }
      
      console.log(`[MCPClient] 收到资源列表响应：${resources.length} 个有效资源（原始：${rawResources.length}个）`);
      resources.forEach((resource, index) => {
        console.log(`[MCPClient] 资源 ${index + 1}:`, {
          name: resource?.name,
          uri: resource?.uri,
          description: resource?.description,
          mimeType: resource?.mimeType
        });
      });
      
      return resources;
    }
  }

  /**
   * 获取提示列表
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    if (this.config?.transport === 'streamable' && this.mcpClient) {
      // Streamable模式
      try {
        console.log('[MCPClient] Streamable模式开始获取提示列表...');
        const response = await this.mcpClient.listPrompts();
        console.log('[MCPClient] Streamable模式提示列表原始响应:', response);
        
        // 处理不同的响应格式
        let prompts: MCPPrompt[] = [];
        if (Array.isArray(response)) {
          prompts = response;
        } else if (response && response.prompts) {
          prompts = response.prompts;
        } else if (response && Array.isArray(response.result)) {
          prompts = response.result;
        } else if (response && response.result && response.result.prompts) {
          prompts = response.result.prompts;
        }
        
        console.log(`[MCPClient] Streamable模式获取到 ${prompts.length} 个提示`);
        return prompts;
      } catch (error) {
        console.error('Streamable模式获取提示列表失败:', error);
        throw error;
      }
    } else {
      // SSE模式
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'prompts/list',
        params: {}
      };

      const response = await this.sendRequest(request);
      const result = response.result as { prompts?: MCPPrompt[] };
      return result?.prompts || [];
    }
  }

  /**
   * 获取资源模板列表
   */
  async listResourceTemplates(): Promise<MCPResource[]> {
    if (this.config?.transport === 'streamable' && this.mcpClient) {
      // Streamable模式 - 目前不支持资源模板
      console.log('[MCPClient] Streamable模式不支持资源模板功能，返回空数组');
      return [];
    } else {
      // SSE模式
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'resources/templates/list',
        params: {}
      };

      try {
        console.log('[MCPClient] SSE模式开始获取资源模板...');
        const response = await this.sendRequest(request);
        console.log('[MCPClient] SSE模式资源模板服务器响应:', response);
        
        // 检查是否有错误
        if (response.error) {
          console.error('[MCPClient] 资源模板请求失败:', response.error);
          // 如果服务器不支持资源模板，返回空数组
          if (response.error.code === -32601) { // Method not found
            console.warn('[MCPClient] 服务器不支持资源模板功能');
            return [];
          }
          throw new Error(`资源模板请求失败: ${response.error.message}`);
        }
        
        const result = response.result as { resourceTemplates?: MCPResource[] };
        console.log('[MCPClient] 资源模板结果:', result);
        
        if (!result) {
          console.warn('[MCPClient] 服务器返回空结果');
          return [];
        }
        
        const templates = result?.resourceTemplates || [];
        console.log('[MCPClient] 原始资源模板数组:', templates);
        
        // 只过滤掉真正的null值，保留所有其他对象
        const validTemplates = templates.filter(template => template !== null);
        
        if (templates.length !== validTemplates.length) {
          console.warn(`[MCPClient] 过滤掉 ${templates.length - validTemplates.length} 个null资源模板`);
          console.warn('[MCPClient] 原始数组包含null值:', templates);
        }
        
        console.log(`[MCPClient] 获取资源模板成功: ${validTemplates.length} 个有效模板`);
        validTemplates.forEach((template, index) => {
          console.log(`[MCPClient] 资源模板 ${index + 1}:`, {
            name: template.name,
            uri: template.uri,
            uriTemplate: (template as any).uriTemplate,
            description: template.description,
            mimeType: template.mimeType
          });
        });
        return validTemplates;
      } catch (error) {
        console.error('[MCPClient] 获取资源模板失败:', error);
        // 如果是网络错误或服务器不支持，返回空数组而不是抛出错误
        return [];
      }
    }
  }

  /**
   * 调用工具
   */
  async callTool(name: string, arguments_: Record<string, unknown>): Promise<MCPToolResult> {
    let result: MCPToolResult;

    if (this.config?.transport === 'streamable' && this.mcpClient) {
      // Streamable模式
      try {
        const response = await this.mcpClient.callTool({
          name,
          arguments: arguments_
        });
        result = response as MCPToolResult;
      } catch (error) {
        console.error('Streamable模式工具调用失败:', error);
        throw error;
      }
    } else {
      // SSE模式
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'tools/call',
        params: {
          name,
          arguments: arguments_
        }
      };

      const response = await this.sendRequest(request);
      result = response.result as MCPToolResult;
    }

    // 触发被动安全检测
    console.log(`[被动检测] 检查状态: passiveDetectionEnabled=${this.passiveDetectionEnabled}, securityConfig=${!!this.securityConfig}`);
    if (this.passiveDetectionEnabled) {
      // 异步执行，不阻塞主流程
      this.performPassiveDetection('tool', name, arguments_, result).catch(error => {
        console.error('被动检测执行失败:', error);
      });
    } else {
      console.log('[被动检测] 被动检测未启用');
    }

    return result;
  }

  /**
   * 读取资源
   */
  async readResource(uri: string, name: string): Promise<MCPResourceContent> {
    let result: MCPResourceContent;

    if (this.config?.transport === 'streamable' && this.mcpClient) {
      // Streamable模式
      try {
        const response = await this.mcpClient.readResource({ uri });
        result = response as MCPResourceContent;
      } catch (error) {
        console.error('Streamable模式读取资源失败:', error);
        throw error;
      }
    } else {
      // SSE模式
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'resources/read',
        params: { uri }
      };

      const response = await this.sendRequest(request);
      result = response.result as MCPResourceContent;
    }

    // 触发被动安全检测
    if (this.passiveDetectionEnabled) {
      // 异步执行，不阻塞主流程
      this.performPassiveDetection('resource', name, { uri }, result, uri).catch(error => {
        console.error('被动检测执行失败:', error);
      });
    }

    return result;
  }

  /**
   * 获取提示
   */
  async getPrompt(name: string, arguments_?: Record<string, unknown>): Promise<any> {
    let result: any;

    if (this.config?.transport === 'streamable' && this.mcpClient) {
      // Streamable模式
      try {
        const response = await this.mcpClient.getPrompt({
          name,
          arguments: arguments_ || {}
        });
        result = response;
      } catch (error) {
        console.error('Streamable模式获取提示失败:', error);
        throw error;
      }
    } else {
      // SSE模式
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: this.getNextRequestId(),
        method: 'prompts/get',
        params: {
          name,
          arguments: arguments_ || {}
        }
      };

      const response = await this.sendRequest(request);
      result = response.result;
    }

    // 触发被动安全检测
    if (this.passiveDetectionEnabled) {
      // 异步执行，不阻塞主流程
      this.performPassiveDetection('prompt', name, arguments_ || {}, result).catch(error => {
        console.error('被动检测执行失败:', error);
      });
    }

    return result;
  }

  /**
   * 发送JSON-RPC请求
   */
  private async sendRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    if (!this.config) {
      throw new Error('MCP客户端未配置');
    }

    if (!this.messageEndpoint) {
      throw new Error('消息端点未从SSE获取到');
    }

    const timeout = 30000; // 30秒超时

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error('请求超时'));
      }, timeout);

      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        timestamp: timeoutHandle as any
      });

      // 发送HTTP请求到对应端点
      this.sendHTTPRequest(request);
    });
  }

  /**
   * 通过HTTP发送请求
   */
  private async sendHTTPRequest(request: JSONRPCRequest): Promise<void> {
    if (!this.config) return;

    // 检查是否有可用的端点
    if (!this.messageEndpoint) {
      throw new Error('消息端点未从SSE获取到，无法发送请求');
    }

    // 构建完整的端点URL
    const baseEndpoint = this.messageEndpoint.startsWith('/') 
      ? `${this.config.host.replace(/\/$/, '')}${this.messageEndpoint}`
      : this.messageEndpoint;
    const endpoint = this.applyAuthToUrl(baseEndpoint);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // 应用认证配置
    this.applyAuthHeaders(headers);

    // 安全地添加自定义headers，过滤掉null/undefined值
    if (this.config.headers) {
      Object.entries(this.config.headers).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          headers[key] = String(value);
        }
      });
    }

    try {
      console.log('发送MCP请求到:', endpoint, JSON.stringify(request, null, 2));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        mode: 'cors'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP响应错误:', response.status, response.statusText, errorText);
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        // 尝试解析错误详情
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage += ` - ${errorData.error.message || errorData.error}`;
          }
        } catch (e) {
          if (errorText.trim()) {
            errorMessage += ` - ${errorText}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      let jsonResponse: JSONRPCResponse;
      
      if (contentType && contentType.includes('application/json')) {
        jsonResponse = await response.json();
        console.log('收到MCP响应:', JSON.stringify(jsonResponse, null, 2));
        this.handleResponse(jsonResponse);
      } else {
        // 如果不是JSON响应，可能是SSE模式下的异步处理
        const textResponse = await response.text();
        // console.log('收到非JSON响应:', textResponse);
        
        // 对于SSE模式，响应可能是"Accepted"，表示请求已被接受，将通过SSE推送结果
        if (textResponse === 'Accepted' || response.status === 202) {
          // console.log('请求已被服务器接受，等待SSE推送响应...');
          // 不需要立即处理，响应将通过SSE连接推送
          return;
        } else {
          throw new Error(`意外的响应格式: ${textResponse}`);
        }
      }
    } catch (error) {
      console.error('发送HTTP请求失败:', error);
      const pending = this.pendingRequests.get(request.id);
      if (pending) {
        clearTimeout(pending.timestamp);
        this.pendingRequests.delete(request.id);
        pending.reject(error);
      }
    }
  }

  /**
   * 处理响应
   */
  private handleResponse(response: JSONRPCResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn('收到未知请求ID的响应:', response.id);
      return;
    }

    clearTimeout(pending.timestamp);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(`MCP错误 ${response.error.code}: ${response.error.message}`));
    } else {
      pending.resolve(response);
    }
  }

  /**
   * 获取下一个请求ID
   */
  private getNextRequestId(): number {
    return ++this.requestId;
  }

  /**
   * 执行安全检查
   */
  performSecurityCheck(tool: MCPTool, parameters: Record<string, unknown>): SecurityCheckResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let level: SecurityRiskLevel = 'low';

    // 检查工具名称中的潜在风险
    const dangerousNames = ['exec', 'eval', 'shell', 'command', 'system', 'delete', 'remove', 'kill'];
    if (dangerousNames.some(name => tool.name.toLowerCase().includes(name))) {
      warnings.push(`工具名称包含潜在危险操作: ${tool.name}`);
      level = 'high';
    }

    // 检查参数中的敏感信息
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];
    Object.keys(parameters).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        warnings.push(`参数包含敏感信息: ${key}`);
        if (level === 'low') {
          level = 'medium';
        }
      }
    });

    // 检查参数值中的潜在脚本注入
    Object.values(parameters).forEach(value => {
      if (typeof value === 'string') {
        if (value.includes('<script>') || value.includes('javascript:') || value.includes('eval(')) {
          warnings.push('参数值可能包含恶意脚本');
          level = 'critical';
        }
      }
    });

    // 生成建议 - 使用数组来避免类型推断问题
    const dangerousLevels: SecurityRiskLevel[] = ['high', 'critical'];
    if (dangerousLevels.includes(level)) {
      recommendations.push('建议在受控环境中测试此工具');
      recommendations.push('确认工具的预期行为与实际行为一致');
    }

    if (warnings.length === 0) {
      recommendations.push('当前工具调用看起来相对安全');
    }

    return { level, warnings, recommendations };
  }
}

// 导出单例实例
export const mcpClient = new MCPClient(); 