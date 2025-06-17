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
  SecurityRiskLevel
} from '@/types/mcp';

/**
 * MCP 客户端服务
 * 负责与MCP服务器通信，实现协议规范
 */
export class MCPClient {
  private config: MCPServerConfig | null = null;
  private status: MCPConnectionStatus = 'disconnected';
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private sessionIdParamName: string = 'session_id'; // 动态保存参数名
  private messageEndpoint: string | null = null; // 从SSE获取的完整message端点
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: number;
  }>();

  constructor() {}

  /**
   * 配置MCP服务器连接
   */
  configure(config: MCPServerConfig): void {
    this.config = config;
  }

  /**
   * 连接到MCP服务器
   */
  async connect(): Promise<InitializeResult> {
    if (!this.config) {
      throw new Error('MCP服务器配置未设置');
    }

    console.log('开始连接MCP服务器:', this.config);
    this.status = 'connecting';

    try {
      if (this.config.transport === 'sse') {
        // SSE方式：先建立SSE连接获取session_id
        console.log('使用SSE传输方式');
        await this.establishSSEConnection();
        console.log('SSE连接建立成功，session_id:', this.sessionId);
      } else {
        // HTTP方式：使用配置中的session_id或生成默认值
        console.log('使用HTTP传输方式');
        this.sessionId = this.config.sessionId || 'default-session';
        console.log('使用session_id:', this.sessionId);
      }
      
      // 初始化连接
      console.log('开始初始化MCP连接...');
      const initResult = await this.initialize();
      console.log('MCP初始化成功:', initResult);
      
      this.status = 'connected';
      return initResult;
    } catch (error) {
      console.error('连接失败:', error);
      this.status = 'error';
      
      // 确保错误信息是字符串
      if (error instanceof Error) {
        throw new Error(`连接失败: ${error.message}`);
      } else if (typeof error === 'string') {
        throw new Error(`连接失败: ${error}`);
      } else {
        throw new Error(`连接失败: ${JSON.stringify(error)}`);
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

    return this.config.host.replace(/\/$/, '') + this.config.ssePath;
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

    // 如果messageEndpoint是相对路径，需要加上host
    if (this.messageEndpoint.startsWith('/')) {
      const baseUrl = this.config.host.replace(/\/$/, '');
      return `${baseUrl}${this.messageEndpoint}`;
    }

    // 如果是完整URL，直接返回
    return this.messageEndpoint;
  }

  /**
   * 建立SSE连接并获取session_id
   */
  private async establishSSEConnection(): Promise<void> {
    if (!this.config) return;

    return new Promise((resolve, reject) => {
      // 使用新的SSE端点获取方法
      const sseEndpoint = this.getSSEEndpoint();
      console.log('建立SSE连接到:', sseEndpoint);

      this.eventSource = new EventSource(sseEndpoint);
      
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
          resolved = true;
          reject(new Error('SSE连接失败'));
        }
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
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // 清理待处理的请求
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('连接已断开'));
    });
    this.pendingRequests.clear();
    
    this.sessionId = null;
    this.sessionIdParamName = 'session_id'; // 重置为默认值
    this.messageEndpoint = null; // 清理message端点
    this.status = 'disconnected';
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

  /**
   * 发送通知
   */
  private async sendNotification(notification: any): Promise<void> {
    if (!this.config) return;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // 安全地添加自定义headers，过滤掉null/undefined值
    if (this.config.headers) {
      Object.entries(this.config.headers).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          headers[key] = String(value);
        }
      });
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // 选择合适的端点发送通知
    let endpoint: string;
    if (this.messageEndpoint) {
      // 如果有从SSE获取的消息端点，优先使用
      endpoint = this.messageEndpoint.startsWith('/') 
        ? `${this.config.host.replace(/\/$/, '')}${this.messageEndpoint}`
        : this.messageEndpoint;
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

  /**
   * 获取资源列表
   */
  async listResources(): Promise<MCPResource[]> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'resources/list',
      params: {}
    };

    const response = await this.sendRequest(request);
    const result = response.result as { resources?: MCPResource[] };
    return result?.resources || [];
  }

  /**
   * 获取提示列表
   */
  async listPrompts(): Promise<MCPPrompt[]> {
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

  /**
   * 获取资源模板列表
   */
  async listResourceTemplates(): Promise<MCPResource[]> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'resources/templates/list',
      params: {}
    };

    const response = await this.sendRequest(request);
    const result = response.result as { resourceTemplates?: MCPResource[] };
    return result?.resourceTemplates || [];
  }

  /**
   * 调用工具
   */
  async callTool(name: string, arguments_: Record<string, unknown>): Promise<MCPToolResult> {
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
    return response.result as MCPToolResult;
  }

  /**
   * 读取资源
   */
  async readResource(uri: string): Promise<MCPResourceContent> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: this.getNextRequestId(),
      method: 'resources/read',
      params: { uri }
    };

    const response = await this.sendRequest(request);
    return response.result as MCPResourceContent;
  }

  /**
   * 获取提示
   */
  async getPrompt(name: string, arguments_?: Record<string, unknown>): Promise<any> {
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
    return response.result;
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
        timeout: timeoutHandle
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
    const endpoint = this.messageEndpoint.startsWith('/') 
      ? `${this.config.host.replace(/\/$/, '')}${this.messageEndpoint}`
      : this.messageEndpoint;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // 安全地添加自定义headers，过滤掉null/undefined值
    if (this.config.headers) {
      Object.entries(this.config.headers).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          headers[key] = String(value);
        }
      });
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      console.log('发送MCP请求到:', endpoint);
      console.log('请求内容:', JSON.stringify(request, null, 2));
      
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
        console.log('收到非JSON响应:', textResponse);
        
        // 对于SSE模式，响应可能是"Accepted"，表示请求已被接受，将通过SSE推送结果
        if (textResponse === 'Accepted' || response.status === 202) {
          console.log('请求已被服务器接受，等待SSE推送响应...');
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
        clearTimeout(pending.timeout);
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

    clearTimeout(pending.timeout);
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

    // 生成建议
    if (level === 'high' || level === 'critical') {
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