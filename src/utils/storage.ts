/**
 * 本地存储工具
 * 使用localStorage保存用户配置和历史记录
 */

const STORAGE_KEYS = {
  SERVER_CONFIG: 'mcp_server_config',
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