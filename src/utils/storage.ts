/**
 * 本地存储工具
 * 使用localStorage保存用户配置和历史记录
 */

import { MCPServerConfig, LLMConfig, LLMRequest, LLMResponse } from '../types/mcp';

const STORAGE_KEYS = {
  SERVER_CONFIG: 'mcp_server_config',
  SAVED_CONFIGS: 'mcp_saved_configs',
  HISTORY: 'mcp_call_history',
  SETTINGS: 'mcp_settings',
  LLM_CONFIGS: 'mcp_llm_configs',
  DETECTION_RULES: 'mcp_detection_rules',
  SECURITY_HISTORY: 'mcp_security_history'
} as const;

export const storage = {
  /**
   * 保存服务器配置
   */
  saveServerConfig: (config: any) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SERVER_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('保存服务器配置失败:', error);
    }
  },

  /**
   * 获取服务器配置
   */
  getServerConfig: () => {
    try {
      const config = localStorage.getItem(STORAGE_KEYS.SERVER_CONFIG);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('获取服务器配置失败:', error);
      return null;
    }
  },

  /**
   * 保存MCP配置到列表
   */
  saveMCPConfig: (config: MCPServerConfig) => {
    try {
      const configs = storage.getSavedConfigs();
      
      // 检查是否已存在相同名称的配置，如果存在则更新
      const existingIndex = configs.findIndex(c => c.name === config.name);
      if (existingIndex >= 0) {
        configs[existingIndex] = { ...config, updatedAt: Date.now() };
      } else {
        configs.push({ ...config, createdAt: Date.now(), updatedAt: Date.now() });
      }
      
      localStorage.setItem(STORAGE_KEYS.SAVED_CONFIGS, JSON.stringify(configs));
      return true;
    } catch (error) {
      console.error('保存MCP配置失败:', error);
      return false;
    }
  },

  /**
   * 获取已保存的MCP配置列表
   */
  getSavedConfigs: (): (MCPServerConfig & { createdAt?: number; updatedAt?: number })[] => {
    try {
      const configs = localStorage.getItem(STORAGE_KEYS.SAVED_CONFIGS);
      return configs ? JSON.parse(configs) : [];
    } catch (error) {
      console.error('获取保存的配置失败:', error);
      return [];
    }
  },

  /**
   * 删除指定的MCP配置
   */
  deleteMCPConfig: (name: string) => {
    try {
      const configs = storage.getSavedConfigs();
      const filteredConfigs = configs.filter(c => c.name !== name);
      localStorage.setItem(STORAGE_KEYS.SAVED_CONFIGS, JSON.stringify(filteredConfigs));
      return true;
    } catch (error) {
      console.error('删除MCP配置失败:', error);
      return false;
    }
  },

  /**
   * 导出所有配置
   */
  exportAllConfigs: () => {
    try {
      const configs = storage.getSavedConfigs();
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        configs: configs.map(config => ({
          ...config,
          // 出于安全考虑，可以选择是否导出认证信息
          auth: config.auth?.type === 'none' ? config.auth : {
            type: config.auth?.type,
            // 不导出敏感信息，只导出结构
          }
        }))
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `mcp-configs-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      return true;
    } catch (error) {
      console.error('导出配置失败:', error);
      return false;
    }
  },

  /**
   * 导入配置
   */
  importConfigs: (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importData = JSON.parse(e.target?.result as string);
            
            if (!importData.configs || !Array.isArray(importData.configs)) {
              console.error('无效的配置文件格式');
              resolve(false);
              return;
            }
            
            const currentConfigs = storage.getSavedConfigs();
            
            // 合并配置，相同名称的配置会被覆盖
            importData.configs.forEach((config: MCPServerConfig) => {
              const existingIndex = currentConfigs.findIndex(c => c.name === config.name);
              if (existingIndex >= 0) {
                currentConfigs[existingIndex] = { ...config, updatedAt: Date.now() };
              } else {
                currentConfigs.push({ ...config, createdAt: Date.now(), updatedAt: Date.now() });
              }
            });
            
            localStorage.setItem(STORAGE_KEYS.SAVED_CONFIGS, JSON.stringify(currentConfigs));
            resolve(true);
          } catch (error) {
            console.error('解析配置文件失败:', error);
            resolve(false);
          }
        };
        
        reader.onerror = () => {
          console.error('读取文件失败');
          resolve(false);
        };
        
        reader.readAsText(file);
      } catch (error) {
        console.error('导入配置失败:', error);
        resolve(false);
      }
    });
  },

  /**
   * 保存调用历史
   */
  saveHistory: (history: any[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  },

  /**
   * 获取调用历史
   */
  getHistory: () => {
    try {
      const history = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return [];
    }
  },

  /**
   * 清除所有数据
   */
  clear: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('清除数据失败:', error);
    }
  }
};

/**
 * LLM配置相关函数
 */

/**
 * 获取所有LLM配置
 */
export const getLLMConfigs = (): LLMConfig[] => {
  try {
    const configs = localStorage.getItem(STORAGE_KEYS.LLM_CONFIGS);
    return configs ? JSON.parse(configs) : [];
  } catch (error) {
    console.error('获取LLM配置失败:', error);
    return [];
  }
};

/**
 * 保存LLM配置
 */
export const saveLLMConfig = (config: LLMConfig): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const configs = getLLMConfigs();
      
      // 检查是否已存在相同ID的配置
      const existingIndex = configs.findIndex(c => c.id === config.id);
      if (existingIndex >= 0) {
        configs[existingIndex] = config;
      } else {
        configs.push(config);
      }
      
      localStorage.setItem(STORAGE_KEYS.LLM_CONFIGS, JSON.stringify(configs));
      
      // 触发自定义事件通知配置更新
      window.dispatchEvent(new CustomEvent('llmConfigUpdated'));
      
      resolve();
    } catch (error) {
      console.error('保存LLM配置失败:', error);
      reject(error);
    }
  });
};

/**
 * 删除LLM配置
 */
export const deleteLLMConfig = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const configs = getLLMConfigs();
      const filteredConfigs = configs.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.LLM_CONFIGS, JSON.stringify(filteredConfigs));
      
      // 触发自定义事件通知配置更新
      window.dispatchEvent(new CustomEvent('llmConfigUpdated'));
      
      resolve();
    } catch (error) {
      console.error('删除LLM配置失败:', error);
      reject(error);
    }
  });
};

/**
 * 测试LLM连接
 */
export const testLLMConnection = async (config: LLMConfig): Promise<void> => {
  const testRequest: LLMRequest = {
    messages: [
      {
        role: 'user',
        content: '请回答：1+1等于几？'
      }
    ],
    model: config.model,
    maxTokens: 10,
    temperature: 0
  };

  const response = await callLLM(config, testRequest);
  
  if (!response.content) {
    throw new Error('LLM返回空响应');
  }
};

/**
 * 清理大模型返回的内容，移除可能的markdown格式
 * 处理类似 ```json {...} ``` 的情况
 */
const cleanLLMContent = (content: string): string => {
  if (!content || typeof content !== 'string') {
    return content;
  }

  // 移除前后空白字符
  let cleaned = content.trim();

  // 检查是否是markdown代码块格式
  const codeBlockPattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i;
  const match = cleaned.match(codeBlockPattern);
  
  if (match) {
    // 提取代码块内容
    cleaned = match[1].trim();
  }

  // 处理其他可能的格式，如单独的```包围
  if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(3, -3).trim();
  }

  // 如果以json:开头，移除这个前缀
  if (cleaned.toLowerCase().startsWith('json:')) {
    cleaned = cleaned.slice(5).trim();
  }

  return cleaned;
};

/**
 * 调用LLM API
 */
export const callLLM = async (config: LLMConfig, request: LLMRequest, abortSignal?: AbortSignal): Promise<LLMResponse> => {
  if (!config.enabled) {
    throw new Error('LLM配置已被禁用');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // 根据不同的LLM类型设置认证头
  if (config.apiKey) {
    switch (config.type) {
      case 'openai':
      case 'custom':
        headers['Authorization'] = `Bearer ${config.apiKey}`;
        break;
      case 'claude':
        headers['x-api-key'] = config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'gemini':
        // Gemini API 通常使用URL参数传递API key
        break;
      case 'ollama':
        // Ollama 通常不需要API key
        break;
    }
  }

  // 添加自定义头部
  if (config.customHeaders) {
    Object.entries(config.customHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  // 构建请求体和完整端点
  let requestBody: any;
  let endpoint = config.endpoint;

  switch (config.type) {
    case 'openai':
    case 'custom':
      requestBody = {
        model: request.model || config.model,
        messages: request.messages,
        max_tokens: request.maxTokens || config.maxTokens,
        temperature: request.temperature ?? config.temperature,
        stream: false
      };
      break;
      
    case 'claude':
      requestBody = {
        model: request.model || config.model,
        max_tokens: request.maxTokens || config.maxTokens || 1024,
        messages: request.messages,
        temperature: request.temperature ?? config.temperature
      };
      break;
      
    case 'gemini':
      // 添加API key参数到Gemini端点（如果提供且未包含）
      if (config.apiKey && !endpoint.includes('key=')) {
        endpoint = `${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${config.apiKey}`;
      }
      
      requestBody = {
        contents: request.messages.map(msg => ({
          parts: [{ text: msg.content }],
          role: msg.role === 'assistant' ? 'model' : 'user'
        })),
        generationConfig: {
          temperature: request.temperature ?? config.temperature,
          maxOutputTokens: request.maxTokens || config.maxTokens
        }
      };
      break;
      
    case 'ollama':
      requestBody = {
        model: request.model || config.model,
        messages: request.messages,
        options: {
          temperature: request.temperature ?? config.temperature,
          num_predict: request.maxTokens || config.maxTokens
        },
        stream: false
      };
      break;
  }

  try {
    console.log(`LLM API调用 (${config.type}):`, {
      configuredEndpoint: config.endpoint,
      headers: { ...headers, Authorization: headers.Authorization ? '[HIDDEN]' : undefined },
      requestBody: config.type === 'gemini' ? { ...requestBody, contents: '[CONTENTS]' } : { ...requestBody, messages: '[MESSAGES]' }
    });
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: abortSignal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // 根据不同的LLM类型解析响应
    return parseLLMResponse(config.type, data);
  } catch (error) {
    console.error('LLM API调用失败:', error);
    throw error;
  }
};

/**
 * 解析不同LLM的响应格式
 */
const parseLLMResponse = (type: string, data: any): LLMResponse => {
  switch (type) {
    case 'openai':
    case 'custom':
      return {
        content: cleanLLMContent(data.choices?.[0]?.message?.content || ''),
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined,
        model: data.model
      };
      
    case 'claude':
      return {
        content: cleanLLMContent(data.content?.[0]?.text || ''),
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        } : undefined,
        model: data.model
      };
      
    case 'gemini':
      return {
        content: cleanLLMContent(data.candidates?.[0]?.content?.parts?.[0]?.text || ''),
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount
        } : undefined
      };
      
    case 'ollama':
      return {
        content: cleanLLMContent(data.message?.content || ''),
        usage: data.prompt_eval_count ? {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: data.prompt_eval_count + data.eval_count
        } : undefined,
        model: data.model
      };
      
    default:
      throw new Error(`不支持的LLM类型: ${type}`);
  }
}; 

// 检测规则存储函数
export const detectionRuleStorage = {
  /**
   * 保存检测规则
   */
  saveDetectionRules: (rules: any[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.DETECTION_RULES, JSON.stringify(rules));
    } catch (error) {
      console.error('保存检测规则失败:', error);
    }
  },

  /**
   * 获取检测规则
   */
  getDetectionRules: (): any[] => {
    try {
      const rules = localStorage.getItem(STORAGE_KEYS.DETECTION_RULES);
      return rules ? JSON.parse(rules) : [];
    } catch (error) {
      console.error('获取检测规则失败:', error);
      return [];
    }
  },

  /**
   * 清除检测规则
   */
  clearDetectionRules: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.DETECTION_RULES);
    } catch (error) {
      console.error('清除检测规则失败:', error);
    }
  }
};

// 安全检测历史存储函数
export const securityHistoryStorage = {
  /**
   * 保存安全检测历史
   */
  saveSecurityHistory: (history: any[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SECURITY_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('保存安全检测历史失败:', error);
    }
  },

  /**
   * 获取安全检测历史
   */
  getSecurityHistory: (): any[] => {
    try {
      const history = localStorage.getItem(STORAGE_KEYS.SECURITY_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('获取安全检测历史失败:', error);
      return [];
    }
  },

  /**
   * 添加安全检测记录
   */
  addSecurityRecord: (record: any) => {
    try {
      const history = securityHistoryStorage.getSecurityHistory();
      history.unshift(record);
      // 限制历史记录数量，保留最新的100条
      if (history.length > 100) {
        history.splice(100);
      }
      securityHistoryStorage.saveSecurityHistory(history);
    } catch (error) {
      console.error('添加安全检测记录失败:', error);
    }
  },

  /**
   * 删除安全检测记录
   */
  deleteSecurityRecord: (id: string) => {
    try {
      const history = securityHistoryStorage.getSecurityHistory();
      const filteredHistory = history.filter(record => record.id !== id);
      securityHistoryStorage.saveSecurityHistory(filteredHistory);
    } catch (error) {
      console.error('删除安全检测记录失败:', error);
    }
  },

  /**
   * 清除所有安全检测历史
   */
  clearSecurityHistory: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.SECURITY_HISTORY);
    } catch (error) {
      console.error('清除安全检测历史失败:', error);
    }
  }
}; 