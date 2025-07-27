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
  AuthConfig
} from '@/types/mcp';
import { i18n } from '../i18n';

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
    reject: (error: any) => void;
    timestamp: number;
  }>();

  constructor() {}

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
      
      // 清理资源
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      
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
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // 清理待处理的请求
    this.pendingRequests.forEach(({ reject, timestamp }) => {
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
      console.log('发送MCP请求到:', endpoint);
      // console.log('请求内容:', JSON.stringify(request, null, 2));
      
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