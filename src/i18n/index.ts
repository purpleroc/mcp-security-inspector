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
    pageInfo: string;
    of: string;
    records: string;
  };
  
  // 标签页
  tabs: {
    config: string;
    explorer: string;
    history: string;
    tools: string;
    resources: string;
    prompts: string;
    llm: string;
    security: string;
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
    protocolVersion: string;
    serverVersion: string;
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
  
  // LLM配置
  llm: {
    title: string;
    addConfig: string;
    editLLMConfig: string;
    addLLMConfig: string;
    configName: string;
    configNamePlaceholder: string;
    configNameRequired: string;
    modelType: string;
    modelTypeRequired: string;
    endpoint: string;
    endpointRequired: string;
    endpointPlaceholder: string;
    endpointHelpDefault: string;
    endpointHelpOpenAI: string;
    endpointHelpCustom: string;
    endpointHelpClaude: string;
    endpointHelpGemini: string;
    endpointHelpOllama: string;
    modelName: string;
    modelNamePlaceholder: string;
    modelNameRequired: string;
    apiKey: string;
    apiKeyPlaceholder: string;
    maxTokens: string;
    temperature: string;
    enabled: string;
    disabled: string;
    description: string;
    descriptionPlaceholder: string;
    customHeaders: string;
    addCustomHeader: string;
    headerName: string;
    headerNameRequired: string;
    headerValue: string;
    headerValueRequired: string;
    deleteHeader: string;
    testConnection: string;
    saveConfig: string;
    editConfig: string;
    deleteConfig: string;
    confirmDelete: string;
    connectionTestSuccess: string;
    connectionTestFailed: string;
    configSaved: string;
    configUpdated: string;
    configDeleted: string;
    configEnabled: string;
    configDisabled: string;
    saveConfigFailed: string;
    noConfigs: string;
    name: string;
    type: string;
    endpointUrl: string;
    model: string;
    status: string;
    actions: string;
    types: {
      openai: string;
      claude: string;
      gemini: string;
      ollama: string;
      custom: string;
    };
  };

  // 安全检测
  security: {
    title: string;
    warning: string;
    riskAssessment: string;
    noRisks: string;
    potentialRisks: string;
    overview: string;
    scanning: string;
    scanComplete: string;
    riskLevel: string;
    allLevels: string;
    scanType: string;
    allTypes: string;
    totalIssues: string;
    criticalIssues: string;
    highIssues: string;
    mediumIssues: string;
    lowIssues: string;
    toolSecurity: string;
    promptSecurity: string;
    resourceSecurity: string;
    resourceSecurityAnalysis: string;
    promptSecurityAnalysis: string;
    startScan: string;
    stopScan: string;
    scanSettings: string;
    settings: string;
    
    selectLLM: string;
    selectLLMPlaceholder: string;
    refreshLLMConfigs: string;
    autoGenerateTests: string;
  enableLLMAnalysis: string;
    maxTestCases: string;
    timeout: string;
    vulnerabilities: string;
    threats: string;
    risks: string;
    testResults: string;
    llmAnalysis: string;
    recommendations: string;
    recommendation: string;
    securityReport: string;
    exportReport: string;
    reportGenerated: string;
    overallRisk: string;
    noIssuesFound: string;
    scanInProgress: string;
    scanFailed: string;
    noLLMConfigured: string;
    connectFirst: string;
    scanCancelled: string;
    preparingScan: string;
    scanSettingsSaved: string;
    reportExported: string;
    toolName: string;
    promptName: string;
    resourceUri: string;
    vulnerabilityCount: string;
    testCaseCount: string;
    threatCount: string;
    riskCount: string;
    viewDetails: string;
    toolSecurityAnalysis: string;
    foundVulnerabilities: string;
    securityTestResults: string;
    testCase: string;
    totalTestCases: string;
    testFailed: string;
    passed: string;
    failed: string;
    passStatus: string;
    riskAssessmentTitle: string;
    llmAnalysisTitle: string;
    llmStaticAnalysis: string;
    comprehensiveRiskAnalysis: string;
    analysisSummary: string;
    detailedAnalysis: string;
    specificDescription: string;
    potentialImpact: string;
    mitigationSuggestion: string;
    sideEffects: string;
    noData: string;
    issueDist: string;
    criticalRisk: string;
    highRisk: string;
    mediumRisk: string;
    lowRisk: string;
    riskLevels: {
      low: string;
      medium: string;
      high: string;
      critical: string;
    };
    riskLevelTags: {
      low: string;
      medium: string;
      high: string;
      critical: string;
    };
    // 访问测试结果相关翻译
    testCaseNumber: string;
    resourceName: string;
    successStatus: string;
    testURI: string;
    returnResult: string;
    testRiskLevel: string;
    testDescription: string;
    testEvidence: string;
    improvementMeasures: string;
    checkTypes: {
      tool: string;
      prompt: string;
      resource: string;
    };
    vulnerabilityTypes: {
      injection: string;
      privilege: string;
      leak: string;
      traversal: string;
      manipulation: string;
      malicious: string;
    };
    testCategory: string;
    securityLevel: string;
    description: string;
    threatType: string;
    evidence: string;
    // SecurityPanel additional fields
    logs: string;
    logCount: string;
    riskGuide: string;
    exportLogs: string;
    clearLogs: string;
    logsExported: string;
    logsCleared: string;
    riskAnalysisGuide: string;
    // 检测历史相关
    history: {
      title: string;
      noHistory: string;
      serverName: string;
      scanType: string;
      overallRisk: string;
      issueCount: string;
      status: string;
      scanTime: string;
      actions: string;
      viewDetail: string;
      restoreRecord: string;
      deleteRecord: string;
      clearAll: string;
      exportHistory: string;
      refreshHistory: string;
      confirmClear: string;
      confirmClearDesc: string;
      confirmDelete: string;
      confirmDeleteDesc: string;
      scanDetail: string;
      scanConfig: string;
      activeScan: string;
      passiveDetection: string;
      completed: string;
      failed: string;
      cancelled: string;
      unknown: string;
      duration: string;
      errorMessage: string;
      detectionResults: string;
      toolDetection: string;
      promptDetection: string;
      resourceDetection: string;
      totalIssues: string;
      riskDistribution: string;
      criticalIssues: string;
      highIssues: string;
      mediumIssues: string;
      lowIssues: string;
      passiveResults: string;
      potentialThreats: string;
      loadHistoryFailed: string;
      deleteRecordFailed: string;
      clearHistoryFailed: string;
      restoreRecordSuccess: string;
      exportHistoryFailed: string;
      saveHistorySuccess: string;
      saveHistoryFailed: string;
      noResultsToSave: string;
      saveCombinedResultsSuccess: string;
      and: string;
      restoreActiveScanSuccess: string;
      restoreCombinedResultsSuccess: string;
      onlySupportActiveOrCombined: string;
      seconds: string;
    };
    toolRisks: string;
    promptRisks: string;
    resourceRisks: string;
    injectionRisk: string;
    injectionDesc: string;
    privilegeRisk: string;
    privilegeDesc: string;
    infoLeakRisk: string;
    infoLeakDesc: string;
    dosRisk: string;
    dosDesc: string;
    promptInjectionRisk: string;
    promptInjectionDesc: string;
    maliciousGuidanceRisk: string;
    maliciousGuidanceDesc: string;
    contextPollutionRisk: string;
    contextPollutionDesc: string;
    privacyLeakRisk: string;
    privacyLeakDesc: string;
    pathTraversalRisk: string;
    pathTraversalDesc: string;
    accessControlBypassRisk: string;
    accessControlBypassDesc: string;
    sensitiveDataExposureRisk: string;
    sensitiveDataExposureDesc: string;
    contentInjectionRisk: string;
    contentInjectionDesc: string;
    testParameters: string;
    executionResult: string;
    errorPrefix: string;
    securityAssessment: string;
    criticalIssuesDetail: string;
    highRiskIssuesDetail: string;
    source: string;
    sourceTypes: {
      tool: string;
      prompt: string;
      resource: string;
    };
    riskType: string;
    suggestion: string;
    // SecurityLogViewer fields
    detectionLogs: string;
    autoScroll: string;
    manualScroll: string;
    noLogsRecord: string;
    scanningInProgress: string;
    detailsLabel: string;
    closeModal: string;
    phase: string;
    time: string;
    duration: string;
    message: string;
    metadata: string;
    viewDetailInfo: string;
    detailData: string;
    viewDetailData: string;
    phases: {
      init: string;
      tool_analysis: string;
      prompt_analysis: string;
      resource_analysis: string;
      test_generation: string;
      test_execution: string;
      evaluation: string;
      summary: string;
    };
    securityStatuses: {
      SAFE: string;
      WARNING: string;
      VULNERABLE: string;
      CRITICAL: string;
         };
     toolLabel: string;
     // Security engine log messages
     logMessages: {
       scanStarted: string;
       scanId: string;
   
       fetchingComponents: string;
       fetchingFromServer: string;
       componentsFetched: string;
       toolsCount: string;
       promptsCount: string;
       resourcesCount: string;
       componentsComplete: string;
       toolAnalysisStart: string;
       analyzingTools: string;
       toolsSecurityAnalysis: string;
       analyzingTool: string;
       toolAnalysisComplete: string;
       riskLevel: string;
       toolAnalysisFailed: string;
       checkingTool: string;
       failed: string;
       unknownError: string;
       promptAnalysisStart: string;
       analyzingPrompts: string;
       promptsSecurityAnalysis: string;
       analyzingPrompt: string;
       promptAnalysisComplete: string;
       promptAnalysisFailed: string;
       checkingPrompt: string;
       resourceAnalysisStart: string;
       analyzingResources: string;
       resourcesSecurityAnalysis: string;
       analyzingResource: string;
       resourceAnalysisComplete: string;
       resourceAnalysisFailed: string;
       checkingResource: string;
       generatingReport: string;
       summarizingResults: string;
       reportGenerated: string;
       scanComplete: string;
       overallRisk: string;
       issuesFound: string;
       count: string;
       llmStaticAnalysis: string;
       usingLLMForTool: string;
       staticSecurityAnalysis: string;
       llmAnalysisComplete: string;
       staticAnalysisComplete: string;
       toolAnalysisError: string;
       analysisError: string;
       whenError: string;
       enhancedPromptAnalysis: string;
       usingLLMForPrompt: string;
       promptSecurityRisk: string;
       promptSecurityComplete: string;
       promptSecurityAnalysisComplete: string;
       promptAnalysisError: string;
       analysisPromptError: string;
       enhancedResourceAnalysis: string;
       usingLLMForResource: string;
       resourceSecurityRisk: string;
       resourceSecurityComplete: string;
       resourceSecurityAnalysisComplete: string;
       resourceAnalysisError: string;
       analysisResourceError: string;
       generatingSmartTests: string;
       forTool: string;
       generateTargetedTests: string;
       testGenerationComplete: string;
       generatedTests: string;
       smartSecurityTests: string;
       startExecutingTests: string;
       executingTests: string;
       executingTestCase: string;
       testType: string;
       purpose: string;
       testExecutionSuccess: string;
       executionSuccess: string;
       parameters: string;
       duration: string;
       testExecutionError: string;
       executionError: string;
       error: string;
       testGenerationFailed: string;
       generateTestsFailed: string;
       generateTestCase: string;
       testCasesFailed: string;
       generatingPromptTests: string;
       forPrompt: string;
       generateSecurityTests: string;
       promptTestGenerationComplete: string;
       generatedPromptTests: string;
       executingPromptTests: string;
       executingPromptSecurityTests: string;
       foundPromptSecurityRisk: string;
       testFoundRisk: string;
       promptTestFailed: string;
       promptTestExecutionFailed: string;
       promptTestGenerationFailed: string;
       generatePromptTestsFailed: string;
       executingResourceTests: string;
       testingResourceAccess: string;
       basicAccessSecurity: string;
       generatingResourceTests: string;
       forResource: string;
       smartResourceTests: string;
       executingResourceSecurityTests: string;
       resourceTestFailed: string;
       resourceTestExecutionFailed: string;
       basicResourceTestComplete: string;
       basicAccessTestPassed: string;
       resourceAccessTestFailed: string;
       cannotAccessResource: string;
       testFoundSecurityIssue: string;
       foundSecurityIssue: string;
       issue: string;
       testPassedSecurityAssessment: string;
       passedSecurityAssessment: string;
       securityStatus: string;
       securityAssessmentFailed: string;
       assessmentFailed: string;
       executingResourceTestCase: string;
       executingTest: string;
       foundPathTraversalVuln: string;
       resourceHasPathTraversalRisk: string;
       securityTestPassed: string;
       securityTestPassed2: string;
       resourceTestCaseFailed: string;
       testCaseExecutionFailed: string;
       scanAlreadyInProgress: string;
       initializingScan: string;
       startingDetection: string;
       tools: string;
       prompts: string;
       resources: string;
       checkingTool2: string;
       checkingPrompt2: string;
       checkingResource2: string;
     };
     
     // 被动检测相关翻译
     passive: {
       title: string;
       subtitle: string;
       description: string;
       monitoring: string;
       stopped: string;
       enabled: string;
       disabled: string;
       realtimeNotification: string;
       disableRealtimeNotification: string;
       enableRealtimeNotification: string;
       exportResults: string;
       clearRecords: string;
       realtimeMonitoring: string;
       detectionRules: string;
       totalDetections: string;
       criticalRisks: string;
       todayDetections: string;
       currentHour: string;
       searchTargetName: string;
       searchTargetNamePlaceholder: string;
       riskLevelFilter: string;
       callTypeFilter: string;
       allLevels: string;
       allTypes: string;
       toolCall: string;
       resourceAccess: string;
       promptProcessing: string;
       showRecords: string;
       searchResults: string;
       refresh: string;
       notEnabled: string;
       notEnabledDesc: string;
       waitingResults: string;
       waitingResultsDesc: string;
       detectionTime: string;
       callType: string;
       targetName: string;
       threatCount: string;
       sensitiveData: string;
       details: string;
       threatDetails: string;
       evidence: string;
       threatLevel: string;
       sensitiveDataLeaks: string;
       content: string;
       recommendations: string;
       callParameters: string;
       callResult: string;
       rulesManagement: {
         title: string;
         totalRules: string;
         enabledRules: string;
         builtinRules: string;
         customRules: string;
         searchRules: string;
         searchRulesPlaceholder: string;
         allCategories: string;
         security: string;
         privacy: string;
         compliance: string;
         dataQuality: string;
         performance: string;
         custom: string;
         newRule: string;
         exportRules: string;
         importRules: string;
         showRules: string;
         ruleName: string;
         ruleDescription: string;
         category: string;
         riskLevel: string;
         scope: string;
         status: string;
         actions: string;
         edit: string;
         delete: string;
         builtin: string;
         input: string;
         output: string;
         both: string;
         regularExpression: string;
         regularExpressionTooltip: string;
         regularExpressionPlaceholder: string;
         threatType: string;
         threatTypePlaceholder: string;
         maxMatches: string;
         enableRule: string;
         maskSensitiveData: string;
         captureGroups: string;
         captureGroupsExtra: string;
         captureGroupsPlaceholder: string;
         tags: string;
         tagsExtra: string;
         tagsPlaceholder: string;
         securityAdvice: string;
         securityAdvicePlaceholder: string;
         remediationAdvice: string;
         remediationAdvicePlaceholder: string;
         references: string;
         referencesExtra: string;
         referencesPlaceholder: string;
         ruleTest: string;
         testInput: string;
         testInputExtra: string;
         testInputPlaceholder: string;
         testRule: string;
         matched: string;
         notMatched: string;
         ruleSyntaxError: string;
         ruleValidationFailed: string;
         ruleValidationFailedDesc: string;
         notes: string;
         notesDesc: string;
         selectExportType: string;
         exportTypeDesc: string;
         allRules: string;
         customRulesOnly: string;
         enabledRulesOnly: string;
         export: string;
         cancel: string;
         exportSuccess: string;
         noRulesToExport: string;
         importRulesDesc: string;
         importRulesFormat: string;
         importRulesExample: string;
         requiredFields: string;
         categories: string;
         riskLevels: string;
         detectionScopes: string;
         clickToSelectFile: string;
         selectFile: string;
         importSuccess: string;
         importFailed: string;
         jsonFormatError: string;
         mustBeArray: string;
         noRulesFound: string;
         confirmDelete: string;
         confirmDeleteDesc: string;
         ruleUpdated: string;
         ruleCreated: string;
         ruleDeleted: string;
         ruleEnabled: string;
         ruleDisabled: string;
         toggleRuleFailed: string;
         loadRulesFailed: string;
         saveRuleFailed: string;
         deleteRuleFailed: string;
         cannotEditBuiltinRule: string;
         view: string;
         testRuleWarning: string;
         testSuccess: string;
         testComplete: string;
         testFailed: string;
         testRuleFailed: string;
         regexExecutionFailed: string;
         ruleSyntaxErrorDesc: string;
         securityRecommendation: string;
         remediationSuggestion: string;
         updateTime: string;
         flags: string;
         flagsPlaceholder: string;
         flagsHelp: string;
         resetRules: string;
         resetRulesDesc: string;
         resetRulesSuccess: string;
         resetRulesFailed: string;
       };
     };
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
    deleteFailed: string;
    clearFailed: string;
    loadDataFailed: string;
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