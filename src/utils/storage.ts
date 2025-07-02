/**
 * 本地存储工具
 * 使用localStorage保存用户配置和历史记录
 */

import { MCPServerConfig } from '../types/mcp';

const STORAGE_KEYS = {
  SERVER_CONFIG: 'mcp_server_config',
  SAVED_CONFIGS: 'mcp_saved_configs',
  HISTORY: 'mcp_call_history',
  SETTINGS: 'mcp_settings'
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