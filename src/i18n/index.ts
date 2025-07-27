/**
 * 国际化管理器
 */

export type Language = 'zh-CN' | 'en-US';

export interface TranslationKey {
  // 通用
  common: {
    ok: string;
    cancel: string;
    confirm: string;
    delete: string;
    edit: string;
    save: string;
    close: string;
    loading: string;
    error: string;
    warning: string;
    success: string;
    clear: string;
    export: string;
    import: string;
    refresh: string;
    connect: string;
    disconnect: string;
    retry: string;
    copy: string;
    back: string;
    next: string;
    submit: string;
    reset: string;
  };
  
  // 标签页
  tabs: {
    config: string;
    explorer: string;
    history: string;
    tools: string;
    resources: string;
    prompts: string;
  };
  
  // 配置面板
  config: {
    title: string;
    serverName: string;
    serverNamePlaceholder: string;
    serverHost: string;
    serverHostPlaceholder: string;
    ssePath: string;
    ssePathPlaceholder: string;
    messagePath: string;
    messagePathPlaceholder: string;
    authentication: string;
    authType: string;
    testConnection: string;
    saveConfig: string;
    savedConfigs: string;
    loadConfig: string;
    deleteConfig: string;
    exportConfigs: string;
    importConfigs: string;
    autoSave: string;
    autoSaveTooltip: string;
    noSavedConfigs: string;
    connectionStatus: {
      connected: string;
      connecting: string;
      disconnected: string;
      error: string;
    };
    messages: {
      serverNameRequired: string;
      serverHostRequired: string;
      serverHostFormat: string;
      ssePathRequired: string;
      connectSuccess: string;
      connectFailed: string;
      disconnectSuccess: string;
      disconnectFailed: string;
      configSavedAuto: string;
      configNotSet: string;
      pleaseCheckConfig: string;
    };
  };
  
  // 认证配置
  auth: {
    none: string;
    apiKey: string;
    basic: string;
    custom: string;
    combined: string;
    apiKeyLabel: string;
    apiKeyPlaceholder: string;
    username: string;
    usernamePlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    headerName: string;
    headerNamePlaceholder: string;
    headerValue: string;
    headerValuePlaceholder: string;
    prefix: string;
    prefixPlaceholder: string;
    urlParams: string;
    paramName: string;
    paramValue: string;
    addParam: string;
    removeParam: string;
    combinedMode: string;
    combinedModeDesc: string;
    enableApiKey: string;
    enableUrlParams: string;
    enableCustomHeaders: string;
  };
  
  // MCP浏览器
  explorer: {
    title: string;
    noConnection: string;
    connectFirst: string;
    serverInfo: string;
    protocolVersion: string;
    capabilities: string;
    instructions: string;
  };
  
  // 工具面板
  tools: {
    title: string;
    noTools: string;
    selectTool: string;
    toolName: string;
    description: string;
    parameters: string;
    callTool: string;
    result: string;
    securityCheck: string;
    pleaseInput: string;
    riskLevel: {
      low: string;
      medium: string;
      high: string;
      critical: string;
    };
  };
  
  // 资源面板
  resources: {
    title: string;
    noResources: string;
    selectResource: string;
    resourceName: string;
    resourceUri: string;
    mimeType: string;
    readResource: string;
    content: string;
    templates: string;
    staticResources: string;
  };
  
  // 提示面板
  prompts: {
    title: string;
    noPrompts: string;
    selectPrompt: string;
    promptName: string;
    arguments: string;
    getPrompt: string;
    messages: string;
    pleaseInput: string;
  };
  
  // 历史面板
  history: {
    title: string;
    noHistory: string;
    totalRecords: string;
    clearAll: string;
    deleteItem: string;
    confirmClear: string;
    confirmDelete: string;
    timestamp: string;
    duration: string;
    type: string;
    name: string;
    parameters: string;
    result: string;
    securityWarnings: string;
    exportHistory: string;
  };
  
  // 安全警告
  security: {
    warning: string;
    riskAssessment: string;
    recommendations: string;
    noRisks: string;
    potentialRisks: string;
  };
  
  // 错误消息
  errors: {
    connectionFailed: string;
    invalidConfig: string;
    toolCallFailed: string;
    resourceReadFailed: string;
    promptGetFailed: string;
    saveConfigFailed: string;
    loadConfigFailed: string;
    importFailed: string;
    exportFailed: string;
    networkError: string;
    timeout: string;
    unauthorized: string;
    serverError: string;
  };
  
  // 成功消息
  success: {
    connected: string;
    disconnected: string;
    configSaved: string;
    configLoaded: string;
    configDeleted: string;
    historyCleared: string;
    itemDeleted: string;
    exportSuccess: string;
    importSuccess: string;
  };
  
  // 应用信息
  app: {
    title: string;
    description: string;
    version: string;
    language: string;
    changeLanguage: string;
  };
}

// 导入翻译文件
import { zhCN } from './zh-CN';
import { enUS } from './en-US';

// 翻译资源映射
const translations: Record<Language, TranslationKey> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

// 语言列表
export const LANGUAGE_OPTIONS = [
  { value: 'zh-CN' as Language, label: '中文' },
  { value: 'en-US' as Language, label: 'English' },
];

// 存储键
const LANGUAGE_STORAGE_KEY = 'mcp_inspector_language';

class I18nManager {
  private currentLanguage: Language = 'zh-CN';
  private listeners: ((language: Language) => void)[] = [];

  constructor() {
    // 从localStorage加载语言设置
    this.loadLanguageFromStorage();
    
    // 监听浏览器语言变化
    this.detectBrowserLanguage();
  }

  /**
   * 从localStorage加载语言设置
   */
  private loadLanguageFromStorage(): void {
    try {
      const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (savedLanguage && translations[savedLanguage]) {
        this.currentLanguage = savedLanguage;
      }
    } catch (error) {
      console.warn('Failed to load language from storage:', error);
    }
  }

  /**
   * 检测浏览器语言
   */
  private detectBrowserLanguage(): void {
    if (!localStorage.getItem(LANGUAGE_STORAGE_KEY)) {
      const browserLanguage = navigator.language;
      if (browserLanguage.startsWith('zh')) {
        this.currentLanguage = 'zh-CN';
      } else {
        this.currentLanguage = 'en-US';
      }
    }
  }

  /**
   * 获取当前语言
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * 设置语言
   */
  setLanguage(language: Language): void {
    if (this.currentLanguage !== language && translations[language]) {
      this.currentLanguage = language;
      
      // 保存到localStorage
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch (error) {
        console.warn('Failed to save language to storage:', error);
      }
      
      // 通知监听器
      this.listeners.forEach(listener => listener(language));
    }
  }

  /**
   * 获取翻译文本
   */
  t(): TranslationKey {
    return translations[this.currentLanguage] || translations['zh-CN'];
  }

  /**
   * 添加语言变化监听器
   */
  addLanguageChangeListener(listener: (language: Language) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除语言变化监听器
   */
  removeLanguageChangeListener(listener: (language: Language) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 获取Antd语言包
   */
  getAntdLocale() {
    switch (this.currentLanguage) {
      case 'zh-CN':
        return import('antd/locale/zh_CN');
      case 'en-US':
        return import('antd/locale/en_US');
      default:
        return import('antd/locale/zh_CN');
    }
  }
}

// 导出单例实例
export const i18n = new I18nManager();

// 导出便捷函数
export const t = () => i18n.t();
export const getCurrentLanguage = () => i18n.getCurrentLanguage();
export const setLanguage = (language: Language) => i18n.setLanguage(language); 