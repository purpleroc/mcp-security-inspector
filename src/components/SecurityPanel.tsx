import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Card,
  Button,
  Form,
  Select,
  InputNumber,
  Switch,
  Progress,
  Statistic,
  Row,
  Col,
  Alert,
  Tabs,
  Table,
  Tag,
  Modal,
  Spin,
  Empty,
  Typography,
  Space,
  Divider,
  message
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DownloadOutlined,
  SettingOutlined,
  AlertOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  ScanOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  SecurityCheckConfig, 
  SecurityReport, 
  SecurityRiskLevel,
  LLMConfig 
} from '../types/mcp';
import { useI18n } from '../hooks/useI18n';
import { securityEngine, SecurityLogEntry } from '../services/securityEngine';
import { llmClient } from '../services/llmClient';
import { getLLMConfigs, securityHistoryStorage } from '../utils/storage';
import { PassiveSecurityTester } from './PassiveSecurityTester';
import SecurityLogViewer from './SecurityLogViewer';
import SecurityHistoryPanel from './SecurityHistoryPanel';
import { mcpClient, PassiveDetectionResult } from '../services/mcpClient';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const SecurityPanel: React.FC = () => {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const connectionStatus = useSelector((state: RootState) => state.mcp.connectionStatus);
  const serverConfig = useSelector((state: RootState) => state.mcp.serverConfig);
  
  // 状态管理
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const [currentReport, setCurrentReport] = useState<SecurityReport | null>(null);
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [securityLogs, setSecurityLogs] = useState<SecurityLogEntry[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // 被动检测结果状态
  const [passiveResults, setPassiveResults] = useState<PassiveDetectionResult[]>([]);
  
  // 检测历史相关状态
  const [securityHistory, setSecurityHistory] = useState<any[]>([]);
  
  // 被动扫描开关状态
  const [passiveMonitoringEnabled, setPassiveMonitoringEnabled] = useState(false);
  
  // 过滤状态
  const [toolRiskFilter, setToolRiskFilter] = useState<SecurityRiskLevel | 'all'>('all');
  const [toolScanTypeFilter, setToolScanTypeFilter] = useState<'all' | 'active' | 'passive'>('all');
  const [promptRiskFilter, setPromptRiskFilter] = useState<SecurityRiskLevel | 'all'>('all');
  const [promptScanTypeFilter, setPromptScanTypeFilter] = useState<'all' | 'active' | 'passive'>('all');
  const [resourceRiskFilter, setResourceRiskFilter] = useState<SecurityRiskLevel | 'all'>('all');
  const [resourceScanTypeFilter, setResourceScanTypeFilter] = useState<'all' | 'active' | 'passive'>('all');

  // 默认配置
  const defaultConfig: SecurityCheckConfig = {
    enabled: true,
    llmConfigId: '',
    autoGenerate: true,
    enableLLMAnalysis: true,
    maxTestCases: 5,
    timeout: 30
  };

  const [scanConfig, setScanConfig] = useState<SecurityCheckConfig>(defaultConfig);

  // 同步被动监控状态到MCPClient
  useEffect(() => {
    if (passiveMonitoringEnabled) {
      mcpClient.enablePassiveDetection(scanConfig);
    } else {
      mcpClient.disablePassiveDetection();
    }
  }, [passiveMonitoringEnabled, scanConfig]);

  useEffect(() => {
    loadLLMConfigs();
    
    // 监听LLM配置更新事件
    const handleLLMConfigUpdate = () => {
      loadLLMConfigs();
    };
    
    window.addEventListener('llmConfigUpdated', handleLLMConfigUpdate);
    
    return () => {
      window.removeEventListener('llmConfigUpdated', handleLLMConfigUpdate);
    };
  }, []);

  // 监听连接状态变化，连接新MCP时清空安全测试结果
  useEffect(() => {
    if (connectionStatus === 'connecting') {
      // 清空当前的安全测试结果
      setCurrentReport(null);
      setPassiveResults([]);
      setSecurityLogs([]);
      setActiveTab('overview');
    }
  }, [connectionStatus]);

  // 添加日志监听器
  useEffect(() => {
    const handleNewLog = (log: SecurityLogEntry) => {
      setSecurityLogs(prev => [...prev, log]);
    };

    securityEngine.addLogListener(handleNewLog);
    
    // 初始化时获取现有日志
    setSecurityLogs(securityEngine.getLogs());

    return () => {
      securityEngine.removeLogListener(handleNewLog);
    };
  }, []);

  // 添加被动检测结果监听器
  useEffect(() => {
    const handleNewPassiveResult = (result: PassiveDetectionResult) => {
      setPassiveResults(prev => [result, ...prev.slice(0, 499)]); // 保持最新500条
    };

    mcpClient.addPassiveDetectionListener(handleNewPassiveResult);
    
    // 初始化时获取现有被动检测结果
    setPassiveResults(mcpClient.getPassiveDetectionResults());

    return () => {
      mcpClient.removePassiveDetectionListener(handleNewPassiveResult);
    };
  }, []);

  // 将被动检测结果转换为主动扫描结果格式的适配器
  const convertPassiveToActiveFormat = () => {
    const toolResults: any[] = [];
    const promptResults: any[] = [];
    const resourceResults: any[] = [];

    passiveResults.forEach(result => {
      const threats = result.threats || [];
      const convertedResult = {
        toolName: result.targetName,
        promptName: result.targetName,
        resourceUri: result.targetName,
        riskLevel: result.riskLevel,
        timestamp: result.timestamp,
        threats: threats.map(threat => ({
          type: threat.type,
          severity: threat.severity,
          description: threat.description,
          evidence: threat.evidence || '',
          recommendation: result.recommendation
        })),
        vulnerabilities: threats.map(threat => ({
          type: threat.type,
          severity: threat.severity,
          description: threat.description,
          recommendation: result.recommendation
        })),
        risks: threats.map(threat => ({
          type: threat.type,
          severity: threat.severity,
          description: threat.description,
          evidence: threat.evidence || '',
          recommendation: result.recommendation
        })),
        testResults: [], // 被动检测没有测试结果
        accessTests: [], // 被动检测没有访问测试
        llmAnalysis: '', // 被动检测没有LLM分析
        isPassive: true,
        passiveData: result
      };

      if (result.type === 'tool') {
        toolResults.push(convertedResult);
      } else if (result.type === 'prompt') {
        promptResults.push(convertedResult);
      } else if (result.type === 'resource') {
        resourceResults.push(convertedResult);
      }
    });

    return { toolResults, promptResults, resourceResults };
  };

  // 获取合并后的结果（主动扫描 + 被动检测）
  const getMergedResults = () => {
    const passiveFormatted = convertPassiveToActiveFormat();
    
    const mergedResults = {
      toolResults: [
        ...(currentReport?.toolResults || []).map(item => ({ ...item, isPassive: false })),
        ...passiveFormatted.toolResults
      ],
      promptResults: [
        ...(currentReport?.promptResults || []).map(item => ({ ...item, isPassive: false })),
        ...passiveFormatted.promptResults
      ],
      resourceResults: [
        ...(currentReport?.resourceResults || []).map(item => ({ ...item, isPassive: false })),
        ...passiveFormatted.resourceResults
      ]
    };

    return mergedResults;
  };

  // 过滤结果函数
  const filterResults = (results: any[], riskLevelFilter: SecurityRiskLevel | 'all', scanTypeFilter: 'all' | 'active' | 'passive') => {
    return results.filter(item => {
      // 风险等级过滤
      const riskMatch = riskLevelFilter === 'all' || item.riskLevel === riskLevelFilter;
      
      // 扫描类型过滤
      const scanMatch = scanTypeFilter === 'all' || 
        (scanTypeFilter === 'active' && !item.isPassive) ||
        (scanTypeFilter === 'passive' && item.isPassive);
      
      return riskMatch && scanMatch;
    });
  };

  // 渲染过滤组件
  const renderFilterPanel = (
    riskFilter: SecurityRiskLevel | 'all',
    setRiskFilter: (value: SecurityRiskLevel | 'all') => void,
    scanTypeFilter: 'all' | 'active' | 'passive',
    setScanTypeFilter: (value: 'all' | 'active' | 'passive') => void
  ) => (
    <Card style={{ marginBottom: 16 }} size="small">
      <Row gutter={16} align="middle">
        <Col>
          <Space>
            <Text>{t.security.riskLevel}:</Text>
            <Select
              value={riskFilter}
              onChange={setRiskFilter}
              style={{ width: 120 }}
              size="small"
            >
              <Select.Option value="all">{t.security.allLevels}</Select.Option>
              <Select.Option value="critical">{t.security.riskLevels.critical}</Select.Option>
              <Select.Option value="high">{t.security.riskLevels.high}</Select.Option>
              <Select.Option value="medium">{t.security.riskLevels.medium}</Select.Option>
              <Select.Option value="low">{t.security.riskLevels.low}</Select.Option>
            </Select>
          </Space>
        </Col>
        <Col>
          <Space>
            <Text>{t.security.scanType}:</Text>
            <Select
              value={scanTypeFilter}
              onChange={setScanTypeFilter}
              style={{ width: 120 }}
              size="small"
            >
              <Select.Option value="all">{t.security.allTypes}</Select.Option>
              <Select.Option value="active">{t.security.history.activeScan}</Select.Option>
              <Select.Option value="passive">{t.security.history.passiveDetection}</Select.Option>
            </Select>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const loadLLMConfigs = () => {
    try {
      const configs = getLLMConfigs();
      setLLMConfigs(configs.filter(c => c.enabled));
      
      // 设置默认的LLM配置
      const enabledConfigs = configs.filter(c => c.enabled);
      if (enabledConfigs.length > 0 && !scanConfig.llmConfigId) {
        setScanConfig(prev => ({
          ...prev,
          llmConfigId: enabledConfigs[0].id
        }));
      }
    } catch (error) {
      console.error('加载LLM配置失败:', error);
    }
  };

  const handleStartScan = async () => {
    if (connectionStatus !== 'connected') {
      message.error(t.security.connectFirst);
      return;
    }

    if (!scanConfig.llmConfigId) {
      message.error(t.security.noLLMConfigured);
      setShowSettings(true);
      return;
    }

    try {
      setIsScanning(true);
      setScanProgress(0);
      setScanMessage(t.security.preparingScan);
      
      // 只清空主动扫描结果，保留被动检测结果
      setCurrentReport(null);
      // 不清空被动检测结果：setPassiveResults([]);
      setSecurityLogs([]); // 清空之前的日志
      setActiveTab('logs'); // 切换到日志标签页

      const report = await securityEngine.startComprehensiveScan(
        scanConfig,
        (progress, message) => {
          setScanProgress(progress);
          setScanMessage(message);
        }
      );

      setCurrentReport(report);
      setActiveTab('overview'); // 扫描完成后切换回概览
      
      // 保存检测历史记录
      const historyRecord = {
        id: report.id,
        serverName: serverConfig?.name || 'MCP Server',
        serverConfig: serverConfig,
        timestamp: Date.now(),
        scanType: 'active' as const,
        report: report,
        status: 'completed' as const,
        duration: Date.now() - (report.timestamp || Date.now()),
        config: scanConfig
      };
      saveSecurityHistory(historyRecord);
      
      // 显示完成消息，如果有被动检测结果也提示
      const completionMessage = passiveResults.length > 0 
        ? `${t.security.scanComplete}，当前还有 ${passiveResults.length} 条被动检测结果`
        : t.security.scanComplete;
      message.success(completionMessage);
    } catch (error) {
      console.error('安全扫描失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 保存失败的检测历史记录
      const historyRecord = {
        id: `failed_${Date.now()}`,
        serverName: serverConfig?.name || 'MCP Server',
        serverConfig: serverConfig,
        timestamp: Date.now(),
        scanType: 'active' as const,
        report: null,
        status: errorMessage.includes('取消') || errorMessage.includes('cancel') ? 'cancelled' as const : 'failed' as const,
        errorMessage: errorMessage,
        duration: Date.now() - (Date.now() - 1000), // 估算持续时间
        config: scanConfig
      };
      saveSecurityHistory(historyRecord);
      
      // 如果是用户取消的扫描，显示不同的消息
      if (errorMessage.includes('取消') || errorMessage.includes('cancel')) {
        message.info(t.security.scanCancelled);
      } else {
        message.error(`${t.security.scanFailed}: ${errorMessage}`);
      }
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setScanMessage('');
    }
  };

  const handleStopScan = () => {
    try {
      securityEngine.cancelCurrentScan();
      setIsScanning(false);
      setScanProgress(0);
      setScanMessage('');
      message.info(t.security.scanCancelled);
    } catch (error) {
      console.error('取消扫描时出错:', error);
      message.error('取消扫描失败');
    }
  };

  const handleExportReport = () => {
    if (!currentReport) return;

    const dataStr = JSON.stringify(currentReport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    message.success(t.security.reportExported);
  };

  const handleExportLogs = () => {
    const dataStr = JSON.stringify(securityLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `security-logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    message.success(t.security.logsExported);
  };

  const handleClearLogs = () => {
    setSecurityLogs([]);
    securityEngine.clearLogs();
    message.success(t.security.logsCleared);
  };

  // 保存检测历史记录
  const saveSecurityHistory = (record: any) => {
    try {
      securityHistoryStorage.addSecurityRecord(record);
      message.success(t.security.history.saveHistorySuccess);
    } catch (error) {
      console.error(t.security.history.saveHistoryFailed, error);
      message.error(t.security.history.saveHistoryFailed);
    }
  };

  // 手动保存当前检测结果（支持主动扫描和被动检测的合并结果）
  const handleSaveCurrentResults = () => {
    // 检查是否有任何检测结果
    const hasActiveResults = currentReport !== null;
    const hasPassiveResults = passiveResults.length > 0;
    
    if (!hasActiveResults && !hasPassiveResults) {
      message.warning(t.security.history.noResultsToSave);
      return;
    }

    // 创建合并的检测记录
    const mergedResults = getMergedResults();
    const combinedReport = {
      id: `combined_${Date.now()}`,
      serverName: serverConfig?.name || 'MCP Server',
      timestamp: Date.now(),
      overallRisk: currentReport?.overallRisk || 'low',
      toolResults: mergedResults.toolResults,
      promptResults: mergedResults.promptResults,
      resourceResults: mergedResults.resourceResults,
      summary: {
        totalIssues: (currentReport?.summary.totalIssues || 0) + passiveResults.length,
        criticalIssues: (currentReport?.summary.criticalIssues || 0) + passiveResults.filter(r => r.riskLevel === 'critical').length,
        highIssues: (currentReport?.summary.highIssues || 0) + passiveResults.filter(r => r.riskLevel === 'high').length,
        mediumIssues: (currentReport?.summary.mediumIssues || 0) + passiveResults.filter(r => r.riskLevel === 'medium').length,
        lowIssues: (currentReport?.summary.lowIssues || 0) + 0
      },
      recommendations: currentReport?.recommendations || [],
      comprehensiveRiskAnalysis: currentReport?.comprehensiveRiskAnalysis,
      // 添加检测类型信息
      scanTypes: {
        hasActiveScan: hasActiveResults,
        hasPassiveDetection: hasPassiveResults,
        activeScanTimestamp: currentReport?.timestamp,
        passiveDetectionCount: passiveResults.length
      }
    };

    const historyRecord = {
      id: `combined_${Date.now()}`,
      serverName: serverConfig?.name || 'MCP Server',
      serverConfig: serverConfig,
      timestamp: Date.now(),
      scanType: 'combined' as const,
      report: combinedReport,
      status: 'completed' as const,
      duration: 0, // 手动保存无法确定持续时间
      config: scanConfig,
      // 添加详细信息
      details: {
        activeScanReport: currentReport,
        passiveDetectionResults: passiveResults,
        totalPassiveResults: passiveResults.length
      }
    };

    saveSecurityHistory(historyRecord);
    
    // 显示保存成功的详细信息
    const resultTypes = [];
    if (hasActiveResults) resultTypes.push(t.security.history.activeScan);
    if (hasPassiveResults) resultTypes.push(t.security.history.passiveDetection);
    
    message.success(t.security.history.saveCombinedResultsSuccess.replace('{types}', resultTypes.join(t.security.history.and)));
  };

  // 恢复检测历史记录（支持主动扫描和合并结果）
  const handleRestoreHistoryRecord = (record: any) => {
    if (record.scanType === 'active' && record.report) {
      // 恢复主动扫描结果
      setCurrentReport(record.report);
      setActiveTab('overview');
      message.success(t.security.history.restoreActiveScanSuccess);
    } else if (record.scanType === 'combined' && record.report) {
      // 恢复合并的检测结果
      setCurrentReport(record.report);
      
      // 如果有被动检测结果，也恢复它们
      if (record.details?.passiveDetectionResults) {
        setPassiveResults(record.details.passiveDetectionResults);
      }
      
      setActiveTab('overview');
      message.success(t.security.history.restoreCombinedResultsSuccess);
    } else {
      message.warning(t.security.history.onlySupportActiveOrCombined);
    }
  };

  // 处理新的被动检测结果
  const handleNewPassiveResult = (result: PassiveDetectionResult) => {
    // 被动检测结果不再自动保存到历史记录
    // 只有主动扫描结果才会保存到历史记录
  };

  const showRiskAnalysisGuide = () => {
    Modal.info({
      title: t.security.riskAnalysisGuide,
      width: 900,
      content: (
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <Tabs>
            <Tabs.TabPane tab={t.security.toolSecurity} key="tools">
              <div>
                <Title level={4}>{t.security.toolRisks}</Title>
                <Alert 
                  type="error" 
                  showIcon 
                  message={t.security.injectionRisk} 
                  description={t.security.injectionDesc}
                  style={{ marginBottom: 16 }}
                />
                <Alert 
                  type="warning" 
                  showIcon 
                  message={t.security.privilegeRisk} 
                  description={t.security.privilegeDesc}
                  style={{ marginBottom: 16 }}
                />
                <Alert 
                  type="info" 
                  showIcon 
                  message={t.security.infoLeakRisk} 
                  description={t.security.infoLeakDesc}
                  style={{ marginBottom: 16 }}
                />
                <Alert 
                  type="warning" 
                  showIcon 
                  message={t.security.dosRisk} 
                  description={t.security.dosDesc}
                />
              </div>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab={t.security.promptSecurity} key="prompts">
              <div>
                <Title level={4}>{t.security.promptRisks}</Title>
                <Alert 
                  type="error" 
                  showIcon 
                  message={t.security.promptInjectionRisk} 
                  description={t.security.promptInjectionDesc}
                  style={{ marginBottom: 16 }}
                />
                <Alert 
                  type="warning" 
                  showIcon 
                  message={t.security.maliciousGuidanceRisk} 
                  description={t.security.maliciousGuidanceDesc}
                  style={{ marginBottom: 16 }}
                />
                <Alert 
                  type="info" 
                  showIcon 
                  message={t.security.contextPollutionRisk} 
                  description={t.security.contextPollutionDesc}
                  style={{ marginBottom: 16 }}
                />
                <Alert 
                  type="warning" 
                  showIcon 
                  message={t.security.privacyLeakRisk} 
                  description={t.security.privacyLeakDesc}
                />
              </div>
            </Tabs.TabPane>
            
            <Tabs.TabPane tab={t.security.resourceSecurity} key="resources">
              <div>
                <Title level={4}>{t.security.resourceRisks}</Title>
                <Alert 
                  type="error" 
                  showIcon 
                  message={t.security.pathTraversalRisk} 
                  description={t.security.pathTraversalDesc}
                  style={{ marginBottom: 16 }}
                />
                <Alert 
                  type="warning" 
                  showIcon 
                  message={t.security.accessControlBypassRisk} 
                  description={t.security.accessControlBypassDesc}
                  style={{ marginBottom: 16 }}
                />
                <Alert 
                  type="info" 
                  showIcon 
                  message={t.security.sensitiveDataExposureRisk} 
                  description={t.security.sensitiveDataExposureDesc}
                  style={{ marginBottom: 16 }}
                />
                <Alert 
                  type="warning" 
                  showIcon 
                  message={t.security.contentInjectionRisk} 
                  description={t.security.contentInjectionDesc}
                />
              </div>
            </Tabs.TabPane>
          </Tabs>
        </div>
      ),
    });
  };

  const getRiskLevelColor = (level: SecurityRiskLevel): string => {
    switch (level) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#ff7a45';
      case 'medium': return '#ffa940';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  // 新增：从安全评估文本中提取风险等级
  const extractRiskLevelFromAssessment = (assessment: string): SecurityRiskLevel | null => {
    // 首先尝试解析JSON格式（新格式）
    try {
      const parsed = JSON.parse(assessment);
      if (parsed.riskLevel && ['low', 'medium', 'high', 'critical'].includes(parsed.riskLevel)) {
        return parsed.riskLevel as SecurityRiskLevel;
      }
    } catch (e) {
      // JSON解析失败，继续使用文本解析
    }
    
    // 回退到文本解析（旧格式）
    const lowerAssessment = assessment.toLowerCase();
    
    // 优先检查明确的无风险表述 - 更严格的判断
    if (lowerAssessment.includes('无风险') || lowerAssessment.includes('no risk') || 
        lowerAssessment.includes('无安全问题') || lowerAssessment.includes('no security issue') ||
        (lowerAssessment.includes('安全') && lowerAssessment.includes('测试结果安全') && 
         !lowerAssessment.includes('风险') && !lowerAssessment.includes('risk')) ||
        (lowerAssessment.includes('安全') && lowerAssessment.includes('不存在安全风险') &&
         !lowerAssessment.includes('风险') && !lowerAssessment.includes('risk'))) {
      return 'low';
    }
    
    // 明确的风险等级词汇
    if (lowerAssessment.includes('严重风险') || lowerAssessment.includes('critical')) {
      return 'critical';
    }
    if (lowerAssessment.includes('高风险') || lowerAssessment.includes('high')) {
      return 'high';
    }
    if (lowerAssessment.includes('中风险') || lowerAssessment.includes('medium')) {
      return 'medium';
    }
    if (lowerAssessment.includes('低风险') || lowerAssessment.includes('low')) {
      return 'low';
    }
    
    // 检查风险指示词
    if (lowerAssessment.includes('存在风险') || lowerAssessment.includes('有风险') || 
        lowerAssessment.includes('风险') || lowerAssessment.includes('risk')) {
      // 如果提到风险，进一步判断风险等级
      if (lowerAssessment.includes('严重') || lowerAssessment.includes('critical')) {
        return 'critical';
      }
      if (lowerAssessment.includes('高') || lowerAssessment.includes('high')) {
        return 'high';
      }
      if (lowerAssessment.includes('中') || lowerAssessment.includes('medium')) {
        return 'medium';
      }
      // 如果只是提到风险但没有明确等级，默认为中风险
      return 'medium';
    }
    
    return null;
  };

  // 新增：获取风险等级的显示文本
  const getRiskLevelText = (level: SecurityRiskLevel | null): string => {
    if (!level) return '';
    return t.security.riskLevelTags[level as keyof typeof t.security.riskLevelTags] || '';
  };

  // 新增：获取测试结果的状态颜色
  const getTestResultBorderColor = (test: any): string => {
    if (test.result?.error) {
      return '#ff4d4f'; // 错误：红色
    }
    const riskLevel = extractRiskLevelFromAssessment(test.riskAssessment || '');
    if (riskLevel) {
      return getRiskLevelColor(riskLevel);
    }
    return '#d9d9d9'; // 默认：灰色
  };

  const toolColumns = [
    {
      title: t.security.toolName,
      dataIndex: 'toolName',
      key: 'toolName',
      render: (name: string, record: any) => (
        <Space>
          <span>{name}</span>
          {record.isPassive ? (
            <Tag color="blue">被动检测</Tag>
          ) : (
            <Tag color="green">主动扫描</Tag>
          )}
        </Space>
      ),
    },
    {
      title: t.security.riskLevel,
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      align: 'center' as const,
      render: (level: SecurityRiskLevel) => (
        <Tag color={getRiskLevelColor(level)}>
          {t.security.riskLevels[level as keyof typeof t.security.riskLevels] || level}
        </Tag>
      ),
    },
    {
      title: t.security.vulnerabilityCount,
      dataIndex: 'vulnerabilities',
      key: 'vulnerabilityCount',
      align: 'center' as const,
      render: (vulnerabilities: any[], record: any) => {
        if (record.isPassive) {
          return record.threats?.length || 0;
        }
        
        let totalVulnerabilities = vulnerabilities?.length || 0;
        
        // 如果有LLM静态分析，也计算其中的漏洞数量
        if (record.llmAnalysis) {
          try {
            const analysis = typeof record.llmAnalysis === 'string' 
              ? JSON.parse(record.llmAnalysis) 
              : record.llmAnalysis;
            if (analysis.vulnerabilities && Array.isArray(analysis.vulnerabilities)) {
              totalVulnerabilities += analysis.vulnerabilities.length;
            }
          } catch (error) {
            // 解析失败时忽略
          }
        }
        
        return totalVulnerabilities;
      },
    },
    {
      title: t.security.testCaseCount,
      dataIndex: 'testResults',
      key: 'testCount',
      align: 'center' as const,
      render: (testResults: any[], record: any) => {
        if (record.isPassive) {
          return 0; // 被动检测没有测试用例
        }
        return testResults?.length || 0;
      },
    },
    {
      title: t.llm.actions,
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button type="link" onClick={() => showToolDetail(record)}>
          {t.security.viewDetails}
        </Button>
      ),
    },
  ];

  // 渲染综合风险分析报告内容
  const renderComprehensiveRiskAnalysisContent = (comprehensiveAnalysis: string | undefined) => {
    if (!comprehensiveAnalysis) return null;

    try {
      // 尝试解析JSON格式的分析数据
      const parsed = JSON.parse(comprehensiveAnalysis);
      if (parsed.analysis) {
        return (
          <div style={{ marginBottom: 16 }}>
            <Title level={5}>{t.security.comprehensiveRiskAnalysis || '综合风险分析报告'}</Title>
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '13px',
              lineHeight: '1.5'
            }}>
              <ReactMarkdown
                components={{
                  h1: ({children}) => <h1 style={{fontSize: '16px', fontWeight: 'bold', margin: '8px 0'}}>{children}</h1>,
                  h2: ({children}) => <h2 style={{fontSize: '15px', fontWeight: 'bold', margin: '8px 0'}}>{children}</h2>,
                  h3: ({children}) => <h3 style={{fontSize: '14px', fontWeight: 'bold', margin: '6px 0'}}>{children}</h3>,
                  h4: ({children}) => <h4 style={{fontSize: '13px', fontWeight: 'bold', margin: '6px 0'}}>{children}</h4>,
                  h5: ({children}) => <h5 style={{fontSize: '12px', fontWeight: 'bold', margin: '4px 0'}}>{children}</h5>,
                  h6: ({children}) => <h6 style={{fontSize: '12px', fontWeight: 'bold', margin: '4px 0'}}>{children}</h6>,
                  p: ({children}) => <p style={{margin: '4px 0', fontSize: '13px'}}>{children}</p>,
                  ul: ({children}) => <ul style={{margin: '4px 0', paddingLeft: '20px'}}>{children}</ul>,
                  ol: ({children}) => <ol style={{margin: '4px 0', paddingLeft: '20px'}}>{children}</ol>,
                  li: ({children}) => <li style={{margin: '2px 0', fontSize: '13px'}}>{children}</li>,
                  strong: ({children}) => <strong style={{fontWeight: 'bold'}}>{children}</strong>,
                  em: ({children}) => <em style={{fontStyle: 'italic'}}>{children}</em>,
                  code: ({children}) => <code style={{
                    backgroundColor: '#e6f7ff',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}>{children}</code>,
                  pre: ({children}) => <pre style={{
                    backgroundColor: '#f0f0f0',
                    padding: '8px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}>{children}</pre>,
                  blockquote: ({children}) => <blockquote style={{
                    borderLeft: '3px solid #1890ff',
                    paddingLeft: '8px',
                    margin: '4px 0',
                    color: '#666'
                  }}>{children}</blockquote>
                }}
              >
                {parsed.analysis}
              </ReactMarkdown>
            </div>
          </div>
        );
      }
    } catch (e) {
      // 如果不是JSON格式，直接作为Markdown渲染
      return (
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>{t.security.comprehensiveRiskAnalysis || '综合风险分析报告'}</Title>
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px',
            lineHeight: '1.5'
          }}>
            <ReactMarkdown
              components={{
                h1: ({children}) => <h1 style={{fontSize: '16px', fontWeight: 'bold', margin: '8px 0'}}>{children}</h1>,
                h2: ({children}) => <h2 style={{fontSize: '15px', fontWeight: 'bold', margin: '8px 0'}}>{children}</h2>,
                h3: ({children}) => <h3 style={{fontSize: '14px', fontWeight: 'bold', margin: '6px 0'}}>{children}</h3>,
                h4: ({children}) => <h4 style={{fontSize: '13px', fontWeight: 'bold', margin: '6px 0'}}>{children}</h4>,
                h5: ({children}) => <h5 style={{fontSize: '12px', fontWeight: 'bold', margin: '4px 0'}}>{children}</h5>,
                h6: ({children}) => <h6 style={{fontSize: '12px', fontWeight: 'bold', margin: '4px 0'}}>{children}</h6>,
                p: ({children}) => <p style={{margin: '4px 0', fontSize: '13px'}}>{children}</p>,
                ul: ({children}) => <ul style={{margin: '4px 0', paddingLeft: '20px'}}>{children}</ul>,
                ol: ({children}) => <ol style={{margin: '4px 0', paddingLeft: '20px'}}>{children}</ol>,
                li: ({children}) => <li style={{margin: '2px 0', fontSize: '13px'}}>{children}</li>,
                strong: ({children}) => <strong style={{fontWeight: 'bold'}}>{children}</strong>,
                em: ({children}) => <em style={{fontStyle: 'italic'}}>{children}</em>,
                code: ({children}) => <code style={{
                  backgroundColor: '#e6f7ff',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}>{children}</code>,
                pre: ({children}) => <pre style={{
                  backgroundColor: '#f0f0f0',
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>{children}</pre>,
                blockquote: ({children}) => <blockquote style={{
                  borderLeft: '3px solid #1890ff',
                  paddingLeft: '8px',
                  margin: '4px 0',
                  color: '#666'
                }}>{children}</blockquote>
              }}
            >
              {comprehensiveAnalysis}
            </ReactMarkdown>
          </div>
        </div>
      );
    }

    return null;
  };

  const showToolDetail = (tool: any) => {
    Modal.info({
      title: `${t.security.toolSecurityAnalysis}: ${tool.toolName}`,
      width: 900,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text strong>{t.security.riskLevel}: </Text>
              <Tag color={getRiskLevelColor(tool.riskLevel)}>
                {t.security.riskLevels[tool.riskLevel as keyof typeof t.security.riskLevels] || tool.riskLevel}
              </Tag>
              {tool.isPassive ? (
                <Tag color="blue">被动检测</Tag>
              ) : (
                <Tag color="green">主动扫描</Tag>
              )}
            </Space>
            {tool.isPassive && tool.timestamp && (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                <Text>检测时间: {new Date(tool.timestamp).toLocaleString()}</Text>
              </div>
            )}
            
            {/* 显示调用参数 */}
            {(tool.isPassive && tool.passiveData && tool.passiveData.parameters) || 
             (!tool.isPassive && tool.testResults && tool.testResults.length > 0 && tool.testResults[0].parameters) ? (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>调用参数</Title>
                <div style={{
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px solid #e8e8e8',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {tool.isPassive 
                      ? JSON.stringify(tool.passiveData.parameters, null, 2)
                      : JSON.stringify(tool.testResults[0].parameters, null, 2)
                    }
                  </pre>
                </div>
              </div>
            ) : null}

            {/* 显示返回结果 */}
            {(tool.isPassive && tool.passiveData && tool.passiveData.result) || 
             (!tool.isPassive && tool.testResults && tool.testResults.length > 0 && tool.testResults[0].result) ? (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>返回结果</Title>
                <div style={{
                  backgroundColor: '#f0f8ff',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px solid #bae7ff',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {tool.isPassive 
                      ? JSON.stringify(tool.passiveData.result, null, 2)
                      : JSON.stringify(tool.testResults[0].result, null, 2)
                    }
                  </pre>
                </div>
              </div>
            ) : null}
          </div>

          {/* 显示被动检测威胁详情 */}
          {tool.isPassive && tool.threats && tool.threats.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>被动检测威胁详情</Title>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  检测到的威胁数量: {tool.threats.length}
                </Text>
              </div>
              {tool.threats.map((threat: any, index: number) => (
                <Card 
                  key={index} 
                  size="small" 
                  style={{ 
                    marginBottom: 12,
                    border: `2px solid ${getRiskLevelColor(threat.severity)}`,
                    borderRadius: '8px',
                    backgroundColor: '#fafafa'
                  }}
                  title={
                    <Space>
                      <Tag color="blue" style={{ fontSize: '12px' }}>
                        #{index + 1}
                      </Tag>
                      <Text strong style={{ fontSize: '14px' }}>
                        {threat.type}
                      </Text>
                      <Tag color={getRiskLevelColor(threat.severity)}>
                        {t.security.riskLevels[threat.severity as keyof typeof t.security.riskLevels] || threat.severity}
                      </Tag>
                    </Space>
                  }
                >
                  <div style={{ fontSize: '13px', marginBottom: 12 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>威胁描述:</Text>
                      <div style={{ 
                        marginTop: 4,
                        color: '#666',
                        fontSize: '12px',
                        lineHeight: '1.4'
                      }}>
                        {threat.description}
                      </div>
                    </div>
                    
                    {threat.evidence && (
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>威胁证据:</Text>
                        <div style={{ 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px 12px', 
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          border: '1px solid #e8e8e8',
                          maxHeight: '120px',
                          overflow: 'auto',
                          marginTop: 4
                        }}>
                          {threat.evidence}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Text strong>安全建议:</Text>
                      <div style={{ 
                        marginTop: 4,
                        color: '#666',
                        fontSize: '12px',
                        lineHeight: '1.4'
                      }}>
                        {threat.recommendation}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* 输出llm静态评测结果 */}
          {tool.llmAnalysis && (
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>{t.security.llmStaticAnalysis}</Title>
              <div style={{
                backgroundColor: '#f0f8ff',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #bae7ff'
              }}>
                {(() => {
                  try {
                    const analysis = typeof tool.llmAnalysis === 'string' 
                      ? JSON.parse(tool.llmAnalysis) 
                      : tool.llmAnalysis;
                    
                    return (
                      <div>
                        {/* 风险等级 */}
                        <div style={{ marginBottom: 16 }}>
                          <Space>
                            <Text strong>{t.security.riskLevel}:</Text>
                            <Tag color={getRiskLevelColor(analysis.riskLevel)}>
                              {t.security.riskLevels[analysis.riskLevel as keyof typeof t.security.riskLevels] || analysis.riskLevel}
                            </Tag>
                          </Space>
                        </div>
                        
                        {/* 漏洞列表 */}
                        {analysis.vulnerabilities && analysis.vulnerabilities.length > 0 && (
                          <div>
                            <Text strong style={{ display: 'block', marginBottom: 12 }}>
                              {t.security.vulnerabilities} ({analysis.vulnerabilities.length}):
                            </Text>
                            {analysis.vulnerabilities.map((vuln: any, index: number) => (
                              <Card 
                                key={index}
                                size="small" 
                                style={{ 
                                  marginBottom: 8,
                                  border: `2px solid ${getRiskLevelColor(vuln.severity)}`,
                                  borderRadius: '6px'
                                }}
                              >
                                <div style={{ fontSize: '13px' }}>
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.testCategory}:</Text>
                                      <Tag color="blue">{vuln.type}</Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.securityLevel}:</Text>
                                      <Tag color={getRiskLevelColor(vuln.severity)}>
                                        {t.security.riskLevels[vuln.severity as keyof typeof t.security.riskLevels] || vuln.severity}
                                      </Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Text strong>{t.security.description}:</Text>
                                    <div style={{ 
                                      marginTop: 4,
                                      color: '#666',
                                      fontSize: '12px',
                                      lineHeight: '1.4'
                                    }}>
                                      {vuln.description}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Text strong>{t.security.recommendation}:</Text>
                                    <div style={{ 
                                      marginTop: 4,
                                      color: '#666',
                                      fontSize: '12px',
                                      lineHeight: '1.4'
                                    }}>
                                      {vuln.recommendation}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  } catch (error) {
                    // 如果解析失败，显示原始内容
                    return (
                      <div style={{ 
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {typeof tool.llmAnalysis === 'string' 
                          ? tool.llmAnalysis 
                          : JSON.stringify(tool.llmAnalysis, null, 2)
                        }
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}          
          
          {tool.testResults.length > 0 && (
            <div>
              <Title level={5}>{t.security.securityTestResults}</Title>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  {t.security.totalTestCases}: {tool.testResults.length}
                </Text>
              </div>
              {tool.testResults.map((test: any, index: number) => {
                const riskLevel = extractRiskLevelFromAssessment(test.riskAssessment || '');
                const borderColor = getTestResultBorderColor(test);
                
                return (
                  <Card 
                    key={index} 
                    size="small" 
                    style={{ 
                      marginBottom: 12,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '8px',
                      backgroundColor: test.result?.error ? '#fff2f0' : '#fafafa'
                    }}
                                         title={
                       <Space>
                         <Tag color="blue" style={{ fontSize: '12px' }}>
                           #{index + 1}
                         </Tag>
                         <Text strong style={{ fontSize: '14px' }}>
                           {test.testCase}
                         </Text>
                         {/* LLM智能测评标识 */}
                         {test.source === 'llm_generated' && (
                           <Tag color="orange" style={{ fontSize: '11px' }}>
                             LLM智能测评
                           </Tag>
                         )}
                         {test.result?.error && (
                           <Tag color="red" icon={<CloseCircleOutlined />}>
                             {t.security.testFailed}
                           </Tag>
                         )}
                       </Space>
                     }
                  >
                    <div style={{ fontSize: '13px', marginBottom: 12 }}>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>{t.security.testParameters}:</Text>
                      </div>
                      <div style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '8px 12px', 
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        border: '1px solid #e8e8e8',
                        maxHeight: '120px',
                        overflow: 'auto'
                      }}>
                        {JSON.stringify(test.parameters, null, 2)}
                      </div>
                    </div>

                    {/* 输出结果展示 */}
                    {test.result && (
                      <div style={{ fontSize: '13px', marginBottom: 12 }}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>{t.security.executionResult}:</Text>
                        </div>
                        <div style={{ 
                          backgroundColor: test.result.error ? '#fff2f0' : '#f5f5f5', 
                          padding: '8px 12px', 
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          maxHeight: '150px',
                          overflow: 'auto',
                          border: test.result.error ? '1px solid #ffccc7' : '1px solid #e8e8e8'
                        }}>
                          {test.result.error 
                            ? `${t.security.errorPrefix}${test.result.error}`
                            : JSON.stringify(test.result, null, 2)
                          }
                        </div>
                      </div>
                    )}

                    <div style={{ 
                       fontSize: '13px',
                       padding: '10px 12px',
                       backgroundColor: riskLevel ? `${getRiskLevelColor(riskLevel)}25` : '#f0f0f0',
                       borderRadius: '8px',
                       border: `2px solid ${riskLevel ? getRiskLevelColor(riskLevel) : '#d9d9d9'}`,
                       marginTop: '4px'
                     }}>

                       <div style={{ fontSize: '13px' }}>
                         {(() => {
                           try {
                             const parsed = JSON.parse(test.riskAssessment);
                             return (
                               <div>
                                 {/* 测试类别 */}
                                 <div style={{ marginBottom: 8 }}>
                                   <Space>
                                     <Text strong>{t.security.testCategory}:</Text>
                                     <Tag color="blue">{test.testCase || 'unknown'}</Tag>
                                   </Space>
                                 </div>
                                 
                                 {/* 安全等级 */}
                                 <div style={{ marginBottom: 8 }}>
                                   <Space>
                                     <Text strong>{t.security.securityLevel}:</Text>
                                     <Tag color={getRiskLevelColor(parsed.riskLevel)}>
                                       {t.security.riskLevels[parsed.riskLevel as keyof typeof t.security.riskLevels] || parsed.riskLevel}
                                     </Tag>
                                   </Space>
                                 </div>
                                 
                                 {/* 风险描述 */}
                                 {parsed.description && (
                                   <div style={{ marginBottom: 8 }}>
                                     <Text strong>风险描述:</Text>
                                     <div style={{ 
                                       marginTop: 4,
                                       color: '#666',
                                       fontSize: '12px',
                                       lineHeight: '1.4'
                                     }}>
                                       {parsed.description}
                                     </div>
                                   </div>
                                 )}
                                 
                                 {/* 风险证据 */}
                                 {parsed.evidence && (
                                   <div style={{ marginBottom: 8 }}>
                                     <Text strong>风险证据:</Text>
                                     <div style={{ 
                                       marginTop: 4,
                                       color: '#666',
                                       fontSize: '12px',
                                       lineHeight: '1.4'
                                     }}>
                                       {parsed.evidence}
                                     </div>
                                   </div>
                                 )}
                                 
                                 {/* 改进建议 */}
                                 {parsed.recommendation && (
                                   <div>
                                     <Text strong>{t.security.recommendation}:</Text>
                                     <div style={{ 
                                       marginTop: 4,
                                       color: '#666',
                                       fontSize: '12px',
                                       lineHeight: '1.4'
                                     }}>
                                       {parsed.recommendation}
                                     </div>
                                   </div>
                                 )}
                               </div>
                             );
                           } catch (e) {
                             // JSON解析失败，回退到原始文本显示
                             return (
                               <div style={{ 
                                 color: riskLevel ? getRiskLevelColor(riskLevel) : '#666',
                                 fontWeight: 600,
                                 fontSize: '13px',
                                 lineHeight: '1.4'
                               }}>
                                 {test.riskAssessment}
                               </div>
                             );
                           }
                         })()}
                       </div>
                       

                     </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ),
    });
  };

  const showPromptDetail = (prompt: any) => {
    Modal.info({
      title: `${t.security.promptSecurityAnalysis}: ${prompt.promptName}`,
      width: 900,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text strong>{t.security.riskLevel}: </Text>
              <Tag color={getRiskLevelColor(prompt.riskLevel)}>
                {t.security.riskLevels[prompt.riskLevel as keyof typeof t.security.riskLevels] || prompt.riskLevel}
              </Tag>
              {prompt.isPassive ? (
                <Tag color="blue">被动检测</Tag>
              ) : (
                <Tag color="green">主动扫描</Tag>
              )}
            </Space>
            {prompt.isPassive && prompt.timestamp && (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                <Text>检测时间: {new Date(prompt.timestamp).toLocaleString()}</Text>
              </div>
            )}
            
            {/* 显示调用参数 */}
            {(prompt.isPassive && prompt.passiveData && prompt.passiveData.parameters) || 
             (!prompt.isPassive && prompt.threats && prompt.threats.length > 0 && prompt.threats[0].evidence) ? (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>调用参数</Title>
                <div style={{
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px solid #e8e8e8',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {prompt.isPassive 
                      ? JSON.stringify(prompt.passiveData.parameters, null, 2)
                      : prompt.threats[0].evidence
                    }
                  </pre>
                </div>
              </div>
            ) : null}

            {/* 显示返回结果 */}
            {(prompt.isPassive && prompt.passiveData && prompt.passiveData.result) || 
             (!prompt.isPassive && prompt.threats && prompt.threats.length > 0 && prompt.threats[0].evidence) ? (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>返回结果</Title>
                <div style={{
                  backgroundColor: '#f0f8ff',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px solid #bae7ff',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {prompt.isPassive 
                      ? JSON.stringify(prompt.passiveData.result, null, 2)
                      : prompt.threats[0].evidence
                    }
                  </pre>
                </div>
              </div>
            ) : null}
          </div>

          {/* 显示威胁信息 */}
          {prompt.threats && prompt.threats.length > 0 && (
            <div>
              <Title level={5}>{t.security.threats}</Title>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  {t.security.totalTestCases}: {prompt.threats.length}
                </Text>
              </div>
              {prompt.threats.map((threat: any, index: number) => (
                <Card 
                  key={index} 
                  size="small" 
                  style={{ 
                    marginBottom: 12,
                    border: `2px solid ${getRiskLevelColor(threat.severity)}`,
                    borderRadius: '8px',
                    backgroundColor: '#fafafa'
                  }}
                  title={
                    <Space>
                      <Tag color="blue" style={{ fontSize: '12px' }}>
                        #{index + 1}
                      </Tag>
                      <Text strong style={{ fontSize: '14px' }}>
                        {threat.type}
                      </Text>
                      <Tag color={getRiskLevelColor(threat.severity)}>
                        {t.security.riskLevels[threat.severity as keyof typeof t.security.riskLevels] || threat.severity}
                      </Tag>
                    </Space>
                  }
                >
                  <div style={{ fontSize: '13px', marginBottom: 12 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>{t.security.description}:</Text>
                      <div style={{ 
                        marginTop: 4,
                        color: '#666',
                        fontSize: '12px',
                        lineHeight: '1.4'
                      }}>
                        {threat.description}
                      </div>
                    </div>
                    
                    {threat.evidence && (
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>{t.security.passive.evidence}</Text>
                        <div style={{ 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px 12px', 
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          border: '1px solid #e8e8e8',
                          maxHeight: '120px',
                          overflow: 'auto',
                          marginTop: 4
                        }}>
                          {threat.evidence}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Text strong>{t.security.recommendation}:</Text>
                      <div style={{ 
                        marginTop: 4,
                        color: '#666',
                        fontSize: '12px',
                        lineHeight: '1.4'
                      }}>
                        {threat.recommendation}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}


          {/* 输出llm静态评测结果 */}
          {prompt.llmAnalysis && (
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>{t.security.llmStaticAnalysis}</Title>
              <div style={{
                backgroundColor: '#f0f8ff',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #bae7ff'
              }}>
                {(() => {
                  try {
                    const analysis = typeof prompt.llmAnalysis === 'string' 
                      ? JSON.parse(prompt.llmAnalysis) 
                      : prompt.llmAnalysis;
                    
                    return (
                      <div>
                        {/* 风险等级 */}
                        <div style={{ marginBottom: 16 }}>
                          <Space>
                            <Text strong>{t.security.riskLevel}:</Text>
                            <Tag color={getRiskLevelColor(analysis.riskLevel)}>
                              {t.security.riskLevels[analysis.riskLevel as keyof typeof t.security.riskLevels] || analysis.riskLevel}
                            </Tag>
                          </Space>
                        </div>
                        
                        {/* 威胁列表 */}
                        {analysis.threats && analysis.threats.length > 0 && (
                          <div>
                            <Text strong style={{ display: 'block', marginBottom: 12 }}>
                              {t.security.threats} ({analysis.threats.length}):
                            </Text>
                            {analysis.threats.map((threat: any, index: number) => (
                              <Card 
                                key={index}
                                size="small" 
                                style={{ 
                                  marginBottom: 8,
                                  border: `2px solid ${getRiskLevelColor(threat.severity)}`,
                                  borderRadius: '6px'
                                }}
                              >
                                <div style={{ fontSize: '13px' }}>
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.testCategory}:</Text>
                                      <Tag color="blue">{threat.type}</Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.securityLevel}:</Text>
                                      <Tag color={getRiskLevelColor(threat.severity)}>
                                        {t.security.riskLevels[threat.severity as keyof typeof t.security.riskLevels] || threat.severity}
                                      </Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Text strong>{t.security.description}:</Text>
                                    <div style={{ 
                                      marginTop: 4,
                                      color: '#666',
                                      fontSize: '12px',
                                      lineHeight: '1.4'
                                    }}>
                                      {threat.description}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Text strong>{t.security.recommendation}:</Text>
                                    <div style={{ 
                                      marginTop: 4,
                                      color: '#666',
                                      fontSize: '12px',
                                      lineHeight: '1.4'
                                    }}>
                                      {threat.recommendation}
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  } catch (error) {
                    // 如果解析失败，显示原始内容
                    return (
                      <div style={{ 
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {typeof prompt.llmAnalysis === 'string' 
                          ? prompt.llmAnalysis 
                          : JSON.stringify(prompt.llmAnalysis, null, 2)
                        }
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}          
          
        </div>
      ),
    });
  };

  const showResourceDetail = (resource: any) => {
    Modal.info({
      title: `${t.security.resourceSecurityAnalysis}: ${resource.resourceUri}`,
      width: 900,
      content: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text strong>{t.security.riskLevel}: </Text>
              <Tag color={getRiskLevelColor(resource.riskLevel)}>
                {t.security.riskLevels[resource.riskLevel as keyof typeof t.security.riskLevels] || resource.riskLevel}
              </Tag>
              {resource.isPassive ? (
                <Tag color="blue">被动检测</Tag>
              ) : (
                <Tag color="green">主动扫描</Tag>
              )}
            </Space>
            {resource.isPassive && resource.timestamp && (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                <Text>检测时间: {new Date(resource.timestamp).toLocaleString()}</Text>
              </div>
            )}
            
            {/* 显示调用参数 */}
            {(resource.isPassive && resource.passiveData && resource.passiveData.parameters) || 
             (!resource.isPassive && resource.risks && resource.risks.length > 0 && resource.risks[0].evidence) ? (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>调用参数</Title>
                <div style={{
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px solid #e8e8e8',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {resource.isPassive 
                      ? JSON.stringify(resource.passiveData.parameters, null, 2)
                      : resource.risks[0].evidence
                    }
                  </pre>
                </div>
              </div>
            ) : null}

            {/* 显示返回结果 */}
            {(resource.isPassive && resource.passiveData && resource.passiveData.result) || 
             (!resource.isPassive && resource.risks && resource.risks.length > 0 && resource.risks[0].evidence) ? (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>返回结果</Title>
                <div style={{
                  backgroundColor: '#f0f8ff',
                  padding: '12px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px solid #bae7ff',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {resource.isPassive 
                      ? JSON.stringify(resource.passiveData.result, null, 2)
                      : resource.risks[0].evidence
                    }
                  </pre>
                </div>
              </div>
            ) : null}
          </div>

          {/* 显示主要风险列表 */}
          {resource.risks && resource.risks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>主要风险列表</Title>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  总风险数: {resource.risks.length}
                </Text>
              </div>
              {resource.risks.map((risk: any, index: number) => (
                <Card 
                  key={index} 
                  size="small" 
                  style={{ 
                    marginBottom: 12,
                    border: `2px solid ${getRiskLevelColor(risk.severity)}`,
                    borderRadius: '8px',
                    backgroundColor: '#fafafa'
                  }}
                  title={
                    <Space>
                      <Tag color="blue" style={{ fontSize: '12px' }}>
                        #{index + 1}
                      </Tag>
                      <Text strong style={{ fontSize: '14px' }}>
                        {risk.type}
                      </Text>
                      <Tag color={getRiskLevelColor(risk.severity)}>
                        {t.security.riskLevels[risk.severity as keyof typeof t.security.riskLevels] || risk.severity}
                      </Tag>
                    </Space>
                  }
                >
                  <div style={{ fontSize: '13px', marginBottom: 12 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>{t.security.description}:</Text>
                      <div style={{ 
                        marginTop: 4,
                        color: '#666',
                        fontSize: '12px',
                        lineHeight: '1.4'
                      }}>
                        {risk.description}
                      </div>
                    </div>
                    
                    {risk.evidence && (
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>风险证据:</Text>
                        <div style={{ 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px 12px', 
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          border: '1px solid #e8e8e8',
                          maxHeight: '120px',
                          overflow: 'auto',
                          marginTop: 4
                        }}>
                          {risk.evidence}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Text strong>{t.security.recommendation}:</Text>
                      <div style={{ 
                        marginTop: 4,
                        color: '#666',
                        fontSize: '12px',
                        lineHeight: '1.4'
                      }}>
                        {risk.recommendation}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* 输出llm静态评测结果 */}
          {resource.llmAnalysis && (
            <div style={{ marginBottom: 16 }}>
              <Title level={5}>{t.security.llmStaticAnalysis}</Title>
              <div style={{
                backgroundColor: '#f0f8ff',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #bae7ff'
              }}>
                {(() => {
                  try {
                    const analysis = typeof resource.llmAnalysis === 'string' 
                      ? JSON.parse(resource.llmAnalysis) 
                      : resource.llmAnalysis;
                    
                    return (
                      <div>
                        {/* 风险等级 */}
                        {analysis.riskLevel && (
                          <div style={{ marginBottom: 16 }}>
                            <Space>
                              <Text strong>{t.security.riskLevel}:</Text>
                              <Tag color={getRiskLevelColor(analysis.riskLevel)}>
                                {t.security.riskLevels[analysis.riskLevel as keyof typeof t.security.riskLevels] || analysis.riskLevel}
                              </Tag>
                            </Space>
                          </div>
                        )}
                        
                        {/* 摘要信息 */}
                        {analysis.summary && (
                          <div style={{ marginBottom: 16 }}>
                            <Text strong>{t.security.analysisSummary}:</Text>
                            <div style={{ 
                              marginTop: 4,
                              color: '#666',
                              fontSize: '12px',
                              lineHeight: '1.4'
                            }}>
                              {analysis.summary}
                            </div>
                          </div>
                        )}
                        
                        {/* 分析详情 */}
                        {analysis.analysis && (
                          <div style={{ marginBottom: 16 }}>
                            <Text strong>{t.security.detailedAnalysis}:</Text>
                            <div style={{ 
                              marginTop: 4,
                              color: '#666',
                              fontSize: '12px',
                              lineHeight: '1.4'
                            }}>
                              {analysis.analysis.description && (
                                <div style={{ marginBottom: 8 }}>
                                  <Text strong>{t.security.description}:</Text>
                                  <div style={{ marginTop: 2, color: '#666' }}>
                                    {analysis.analysis.description}
                                  </div>
                                </div>
                              )}
                              {analysis.analysis.potentialImpact && (
                                <div style={{ marginBottom: 8 }}>
                                  <Text strong>{t.security.potentialImpact}:</Text>
                                  <div style={{ marginTop: 2, color: '#666' }}>
                                    {analysis.analysis.potentialImpact}
                                  </div>
                                </div>
                              )}
                              {analysis.analysis.mitigation && (
                                <div style={{ marginBottom: 8 }}>
                                  <Text strong>{t.security.mitigationSuggestion}:</Text>
                                  <div style={{ marginTop: 2, color: '#666' }}>
                                    {analysis.analysis.mitigation}
                                  </div>
                                </div>
                              )}
                              {analysis.analysis.sideEffects && (
                                <div style={{ marginBottom: 8 }}>
                                  <Text strong>{t.security.sideEffects}:</Text>
                                  <div style={{ marginTop: 2, color: '#666' }}>
                                    {analysis.analysis.sideEffects}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 风险列表 */}
                        {analysis.risks && analysis.risks.length > 0 && (
                          <div>
                            <Text strong style={{ display: 'block', marginBottom: 12 }}>
                              {t.security.risks} ({analysis.risks.length}):
                            </Text>
                            {analysis.risks.map((risk: any, index: number) => (
                              <Card 
                                key={index}
                                size="small" 
                                style={{ 
                                  marginBottom: 8,
                                  border: `2px solid ${getRiskLevelColor(risk.severity)}`,
                                  borderRadius: '6px'
                                }}
                              >
                                <div style={{ fontSize: '13px' }}>
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.testCategory}:</Text>
                                      <Tag color="blue">{risk.type}</Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.securityLevel}:</Text>
                                      <Tag color={getRiskLevelColor(risk.severity)}>
                                        {t.security.riskLevels[risk.severity as keyof typeof t.security.riskLevels] || risk.severity}
                                      </Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Text strong>{t.security.description}:</Text>
                                    <div style={{ 
                                      marginTop: 4,
                                      color: '#666',
                                      fontSize: '12px',
                                      lineHeight: '1.4'
                                    }}>
                                      {risk.description}
                                    </div>
                                  </div>
                                  
                                  {risk.recommendation && (
                                    <div>
                                      <Text strong>{t.security.recommendation}:</Text>
                                      <div style={{ 
                                        marginTop: 4,
                                        color: '#666',
                                        fontSize: '12px',
                                        lineHeight: '1.4'
                                      }}>
                                        {risk.recommendation}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                        
                        {/* 威胁列表 */}
                        {analysis.threats && analysis.threats.length > 0 && (
                          <div>
                            <Text strong style={{ display: 'block', marginBottom: 12 }}>
                              {t.security.threats} ({analysis.threats.length}):
                            </Text>
                            {analysis.threats.map((threat: any, index: number) => (
                              <Card 
                                key={index}
                                size="small" 
                                style={{ 
                                  marginBottom: 8,
                                  border: `2px solid ${getRiskLevelColor(threat.severity)}`,
                                  borderRadius: '6px'
                                }}
                              >
                                <div style={{ fontSize: '13px' }}>
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.threatType}:</Text>
                                      <Tag color="orange">{threat.type}</Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.securityLevel}:</Text>
                                      <Tag color={getRiskLevelColor(threat.severity)}>
                                        {t.security.riskLevels[threat.severity as keyof typeof t.security.riskLevels] || threat.severity}
                                      </Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Text strong>{t.security.description}:</Text>
                                    <div style={{ 
                                      marginTop: 4,
                                      color: '#666',
                                      fontSize: '12px',
                                      lineHeight: '1.4'
                                    }}>
                                      {threat.description}
                                    </div>
                                  </div>
                                  
                                  {threat.evidence && (
                                    <div style={{ marginBottom: 8 }}>
                                      <Text strong>{t.security.evidence}:</Text>
                                      <div style={{ 
                                        marginTop: 4,
                                        color: '#666',
                                        fontSize: '12px',
                                        lineHeight: '1.4'
                                      }}>
                                        {threat.evidence}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {threat.recommendation && (
                                    <div>
                                      <Text strong>{t.security.recommendation}:</Text>
                                      <div style={{ 
                                        marginTop: 4,
                                        color: '#666',
                                        fontSize: '12px',
                                        lineHeight: '1.4'
                                      }}>
                                        {threat.recommendation}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                        
                        {/* 漏洞列表 */}
                        {analysis.vulnerabilities && analysis.vulnerabilities.length > 0 && (
                          <div>
                            <Text strong style={{ display: 'block', marginBottom: 12 }}>
                              {t.security.vulnerabilities} ({analysis.vulnerabilities.length}):
                            </Text>
                            {analysis.vulnerabilities.map((vuln: any, index: number) => (
                              <Card 
                                key={index}
                                size="small" 
                                style={{ 
                                  marginBottom: 8,
                                  border: `2px solid ${getRiskLevelColor(vuln.severity)}`,
                                  borderRadius: '6px'
                                }}
                              >
                                <div style={{ fontSize: '13px' }}>
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.testCategory}:</Text>
                                      <Tag color="red">{vuln.type}</Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Space>
                                      <Text strong>{t.security.securityLevel}:</Text>
                                      <Tag color={getRiskLevelColor(vuln.severity)}>
                                        {t.security.riskLevels[vuln.severity as keyof typeof t.security.riskLevels] || vuln.severity}
                                      </Tag>
                                    </Space>
                                  </div>
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Text strong>{t.security.description}:</Text>
                                    <div style={{ 
                                      marginTop: 4,
                                      color: '#666',
                                      fontSize: '12px',
                                      lineHeight: '1.4'
                                    }}>
                                      {vuln.description}
                                    </div>
                                  </div>
                                  
                                  {vuln.testCase && (
                                    <div style={{ marginBottom: 8 }}>
                                      <Text strong>{t.security.testCase}:</Text>
                                      <div style={{ 
                                        marginTop: 4,
                                        color: '#666',
                                        fontSize: '12px',
                                        lineHeight: '1.4',
                                        fontFamily: 'monospace'
                                      }}>
                                        {vuln.testCase}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {vuln.recommendation && (
                                    <div>
                                      <Text strong>{t.security.recommendation}:</Text>
                                      <div style={{ 
                                        marginTop: 4,
                                        color: '#666',
                                        fontSize: '12px',
                                        lineHeight: '1.4'
                                      }}>
                                        {vuln.recommendation}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                        
                        {/* 如果没有结构化数据，显示原始内容 */}
                        {!analysis.riskLevel && !analysis.summary && !analysis.analysis && 
                         !analysis.risks && !analysis.threats && !analysis.vulnerabilities && (
                          <div style={{ 
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                            color: '#666'
                          }}>
                            {typeof resource.llmAnalysis === 'string' 
                              ? resource.llmAnalysis 
                              : JSON.stringify(resource.llmAnalysis, null, 2)
                            }
                          </div>
                        )}
                      </div>
                    );
                  } catch (error) {
                    // 如果解析失败，显示原始内容
                    return (
                      <div style={{ 
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {typeof resource.llmAnalysis === 'string' 
                          ? resource.llmAnalysis 
                          : JSON.stringify(resource.llmAnalysis, null, 2)
                        }
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}          

          {/* 显示访问测试结果 */}
          {resource.accessTests && resource.accessTests.length > 0 && (
            <div>
              <Title level={5}>访问测试结果</Title>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  总测试数: {resource.accessTests.length}
                </Text>
              </div>
              {resource.accessTests.map((test: any, index: number) => {
                // 解析风险评估，提取风险等级
                const riskLevel = extractRiskLevelFromAssessment(test.riskAssessment || '');
                const borderColor = getRiskLevelColor(riskLevel || 'low');
                const backgroundColor = riskLevel === 'critical' ? '#fff2f0' : 
                                     riskLevel === 'high' ? '#fff7e6' : 
                                     riskLevel === 'medium' ? '#fffbe6' : '#f6ffed';
                
                // 解析风险评估JSON
                let assessmentData: any = {};
                try {
                  if (test.riskAssessment) {
                    assessmentData = JSON.parse(test.riskAssessment);
                  }
                } catch (e) {
                  // 如果不是JSON格式，保持原样
                }
                
                return (
                  <Card 
                    key={index} 
                    size="small" 
                    style={{ 
                      marginBottom: 12,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '8px',
                      backgroundColor: backgroundColor
                    }}
                    title={
                      <Space>
                        <Tag color="blue" style={{ fontSize: '12px' }}>
                          #{index + 1}
                        </Tag>
                        <Text strong style={{ fontSize: '14px' }}>
                          {test.testType}
                        </Text>
                        <Tag color={test.success ? 'green' : 'red'}>
                          {test.success ? t.security.passed : t.security.failed}
                        </Tag>
                        {riskLevel && (
                          <Tag color={getRiskLevelColor(riskLevel)}>
                            {t.security.riskLevels[riskLevel as keyof typeof t.security.riskLevels] || riskLevel}
                          </Tag>
                        )}
                      </Space>
                    }
                  >
                    <div style={{ fontSize: '13px' }}>
                      {/* 资源名 */}
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>{t.security.resourceName}:</Text>
                        <div style={{ marginTop: 4, color: '#666', fontSize: '12px' }}>
                          {resource.resourceUri}
                        </div>
                      </div>
                      
                      {/* 是否成功 */}
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>{t.security.successStatus}:</Text>
                        <div style={{ marginTop: 4 }}>
                          <Tag color={test.success ? 'green' : 'red'}>
                            {test.success ? t.security.passed : t.security.failed}
                          </Tag>
                        </div>
                      </div>
                      
                      {/* 测试URI */}
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>{t.security.testURI}:</Text>
                        <div style={{ 
                          marginTop: 4,
                          color: '#666',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          backgroundColor: '#f5f5f5',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          wordBreak: 'break-all'
                        }}>
                          {test.uri}
                        </div>
                      </div>
                      
                      {/* 返回结果 */}
                      {test.result && (
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>{t.security.returnResult}:</Text>
                          <div style={{ 
                            marginTop: 4,
                            color: '#666',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            backgroundColor: '#f0f8ff',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            maxHeight: '100px',
                            overflow: 'auto'
                          }}>
                            {typeof test.result === 'string' ? test.result : JSON.stringify(test.result, null, 2)}
                          </div>
                        </div>
                      )}
                      
                      {/* 风险等级 */}
                      {riskLevel && (
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>{t.security.testRiskLevel}:</Text>
                          <div style={{ marginTop: 4 }}>
                            <Tag color={getRiskLevelColor(riskLevel)}>
                              {t.security.riskLevels[riskLevel as keyof typeof t.security.riskLevels] || riskLevel}
                            </Tag>
                          </div>
                        </div>
                      )}
                      
                      {/* 描述 */}
                      {assessmentData.description && (
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>{t.security.testDescription}:</Text>
                          <div style={{ 
                            marginTop: 4,
                            color: '#666',
                            fontSize: '12px',
                            lineHeight: '1.4'
                          }}>
                            {assessmentData.description}
                          </div>
                        </div>
                      )}
                      
                      {/* 证据 */}
                      {assessmentData.evidence && (
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>{t.security.testEvidence}:</Text>
                          <div style={{ 
                            marginTop: 4,
                            color: '#666',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            backgroundColor: '#f5f5f5',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            maxHeight: '100px',
                            overflow: 'auto'
                          }}>
                            {assessmentData.evidence}
                          </div>
                        </div>
                      )}
                      
                      {/* 改进措施 */}
                      {assessmentData.recommendation && (
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>{t.security.improvementMeasures}:</Text>
                          <div style={{ 
                            marginTop: 4,
                            color: '#666',
                            fontSize: '12px',
                            lineHeight: '1.4'
                          }}>
                            {assessmentData.recommendation}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

        </div>
      ),
    });
  };

  const renderOverview = () => {
    // 收集严重和高风险问题
    const criticalIssues: any[] = [];
    const highRiskIssues: any[] = [];

    // 从主动扫描结果中收集问题
    if (currentReport) {
      // 从工具结果中收集问题
      currentReport.toolResults.forEach(tool => {
        tool.vulnerabilities.forEach(vuln => {
          const issue = {
            sourceType: 'tool',
            source: tool.toolName,
            scanType: 'active',
            ...vuln
          };
          if (vuln.severity === 'critical') {
            criticalIssues.push(issue);
          } else if (vuln.severity === 'high') {
            highRiskIssues.push(issue);
          }
        });
      });

      // 从提示结果中收集问题
      currentReport.promptResults.forEach(prompt => {
        prompt.threats.forEach(threat => {
          const issue = {
            sourceType: 'prompt',
            source: prompt.promptName,
            scanType: 'active',
            ...threat
          };
          if (threat.severity === 'critical') {
            criticalIssues.push(issue);
          } else if (threat.severity === 'high') {
            highRiskIssues.push(issue);
          }
        });
      });

      // 从资源结果中收集问题
      currentReport.resourceResults.forEach(resource => {
        resource.risks.forEach(risk => {
          const issue = {
            sourceType: 'resource',
            source: resource.resourceUri,
            scanType: 'active',
            ...risk
          };
          if (risk.severity === 'critical') {
            criticalIssues.push(issue);
          } else if (risk.severity === 'high') {
            highRiskIssues.push(issue);
          }
        });
      });
    }

    // 从被动检测结果中收集问题
    passiveResults.forEach(result => {
      result.threats.forEach(threat => {
        const issue = {
          sourceType: result.type,
          source: result.targetName,
          scanType: 'passive',
          description: threat.description,
          type: threat.type,
          severity: threat.severity,
          recommendation: result.recommendation,
          timestamp: result.timestamp
        };
        if (threat.severity === 'critical') {
          criticalIssues.push(issue);
        } else if (threat.severity === 'high') {
          highRiskIssues.push(issue);
        }
      });
    });

    // 计算统计数据
    const activeStats = currentReport ? {
      totalIssues: currentReport.summary.totalIssues,
      criticalIssues: currentReport.summary.criticalIssues,
      highIssues: currentReport.summary.highIssues,
      mediumIssues: currentReport.summary.mediumIssues,
      lowIssues: currentReport.summary.lowIssues
    } : {
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0
    };

    // 计算被动检测统计数据
    const passiveStats = {
      totalIssues: passiveResults.length,
      criticalIssues: passiveResults.filter(r => r.riskLevel === 'critical').length,
      highIssues: passiveResults.filter(r => r.riskLevel === 'high').length,
      mediumIssues: passiveResults.filter(r => r.riskLevel === 'medium').length,
      lowIssues: 0
    };

    // 合并统计数据
    const combinedStats = {
      totalIssues: activeStats.totalIssues + passiveStats.totalIssues,
      criticalIssues: activeStats.criticalIssues + passiveStats.criticalIssues,
      highIssues: activeStats.highIssues + passiveStats.highIssues,
      mediumIssues: activeStats.mediumIssues + passiveStats.mediumIssues,
      lowIssues: activeStats.lowIssues + 0
    };

    // 如果没有数据，显示空状态
    if (!currentReport && passiveResults.length === 0) {
      return (
        <Empty 
          description={t.security.noData}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div>
        {/* 保存按钮 */}
        <Card style={{ marginBottom: 16 }} size="small">
          <Row justify="space-between" align="middle">
                      <Col>
            <Space>
              <Text strong>检测结果管理</Text>
              {currentReport && (
                <Tag color="blue">
                  主动扫描 结果
                </Tag>
              )}
              {passiveResults.length > 0 && (
                <Tag color="green">
                  被动检测 结果 ({passiveResults.length})
                </Tag>
              )}
              {!currentReport && passiveResults.length === 0 && (
                <Tag color="orange">
                  暂无检测结果
                </Tag>
              )}
            </Space>
            {(currentReport || passiveResults.length > 0) && (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                <Text type="secondary">
                  {currentReport && passiveResults.length > 0 
                    ? `主动扫描: ${new Date(currentReport.timestamp).toLocaleString()} | 被动检测: 实时更新`
                    : currentReport 
                      ? `主动扫描: ${new Date(currentReport.timestamp).toLocaleString()}`
                      : '被动检测: 实时更新'
                  }
                </Text>
              </div>
            )}
          </Col>
            <Col>
              <Space>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  onClick={handleSaveCurrentResults}
                  disabled={!currentReport && passiveResults.length === 0}
                >
                  保存检测结果
                </Button>
                <Button 
                  icon={<HistoryOutlined />}
                  onClick={() => setActiveTab('history')}
                >
                  查看历史记录
                </Button>
                {(currentReport || passiveResults.length > 0) && (
                  <Button 
                    icon={<CloseCircleOutlined />}
                    onClick={() => {
                      setCurrentReport(null);
                      setPassiveResults([]);
                      message.info('已清空当前检测结果');
                    }}
                    danger
                  >
                    清空结果
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
          {/* 添加说明文字 */}
          {(!currentReport && passiveResults.length === 0) && (
            <div style={{ marginTop: 12, fontSize: '12px', color: '#666' }}>
              <Text type="secondary">
                提示：主动扫描和被动检测的结果会同时显示。断开连接后结果会被清空，请及时保存重要结果。
              </Text>
            </div>
          )}
          {(currentReport || passiveResults.length > 0) && (
            <div style={{ marginTop: 12, fontSize: '12px', color: '#666' }}>
              <Text type="secondary">
                提示：可以点击"保存检测结果"将当前结果保存到历史记录，或点击"清空结果"清除当前显示的结果。
              </Text>
            </div>
          )}
        </Card>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.overallRisk}
                value={currentReport ? t.security.riskLevels[currentReport.overallRisk as keyof typeof t.security.riskLevels] : t.security.riskLevels.low}
                valueStyle={{ color: currentReport ? getRiskLevelColor(currentReport.overallRisk) : '#52c41a', textAlign: 'center' }}
              />
              {/* {!currentReport && passiveResults.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: 8 }}>
                  <Text type="secondary">仅被动检测</Text>
                </div>
              )}
              {currentReport && passiveResults.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: 8 }}>
                  <Text type="secondary">主动+被动</Text>
                </div>
              )}
              {currentReport && passiveResults.length === 0 && (
                <div style={{ fontSize: '12px', color: 'center', marginTop: 8 }}>
                  <Text type="secondary">仅主动扫描</Text>
                </div>
              )} */}
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.totalIssues}
                value={combinedStats.totalIssues}
                prefix={<AlertOutlined />}
                valueStyle={{ color: combinedStats.totalIssues > 0 ? '#ff4d4f' : '#52c41a', textAlign: 'center' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.criticalIssues}
                value={combinedStats.criticalIssues}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f', textAlign: 'center' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.highIssues}
                value={combinedStats.highIssues}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff7a45', textAlign: 'center' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card title={t.security.issueDist} size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{t.security.criticalRisk}: </Text>
                  <Tag color="red">{combinedStats.criticalIssues}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{t.security.highRisk}: </Text>
                  <Tag color="orange">{combinedStats.highIssues}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{t.security.mediumRisk}: </Text>
                  <Tag color="gold">{combinedStats.mediumIssues}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{t.security.lowRisk}: </Text>
                  <Tag color="green">{combinedStats.lowIssues}</Tag>
                </div>
              </Space>
              {(currentReport || passiveResults.length > 0) && (
                <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                  <Text type="secondary">
                    {currentReport && passiveResults.length > 0 
                      ? '包含主动扫描和被动检测结果'
                      : currentReport 
                        ? '仅主动扫描结果'
                        : '仅被动检测结果'
                    }
                  </Text>
                </div>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title={t.security.recommendations} size="small">
              <Space direction="vertical">
                {currentReport?.recommendations?.map((rec, index) => (
                  <Alert
                    key={index}
                    type="info"
                    message={rec}
                    showIcon
                  />
                )) || (
                  <Alert
                    type="info"
                    message="暂无建议"
                    showIcon
                  />
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 被动检测统计信息 */}
        {passiveResults.length > 0 && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={24}>
              <Card title="被动检测统计" size="small">
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="总检测次数"
                      value={passiveStats.totalIssues}
                      prefix={<AlertOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="严重风险"
                      value={passiveStats.criticalIssues}
                      prefix={<ExclamationCircleOutlined />}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="高风险"
                      value={passiveStats.highIssues}
                      prefix={<WarningOutlined />}
                      valueStyle={{ color: '#ff7a45' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="中等风险"
                      value={passiveStats.mediumIssues}
                      prefix={<SafetyCertificateOutlined />}
                      valueStyle={{ color: '#ffa940' }}
                    />
                  </Col>
                </Row>
                <div style={{ marginTop: 12, fontSize: '12px', color: '#666' }}>
                  <Text type="secondary">
                    被动检测结果会实时更新，与主动扫描结果同时显示。断开连接后结果会被清空。
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 综合安全分析 */}
        {currentReport?.comprehensiveRiskAnalysis && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={24}>
              {renderComprehensiveRiskAnalysisContent(currentReport.comprehensiveRiskAnalysis)}
            </Col>
          </Row>
        )}
        
        {/* 严重问题详情 */}
        {criticalIssues.length > 0 && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={24}>
              <Card title={`${t.security.criticalIssuesDetail} (${criticalIssues.length})`} size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {criticalIssues.map((issue, index) => (
                    <Alert
                      key={index}
                      type="error"
                      showIcon
                      message={
                        <div>
                          <Text strong>{issue.description}</Text>
                          <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                            {t.security.source}: {issue.source} ({t.security.sourceTypes[issue.sourceType as keyof typeof t.security.sourceTypes]})
                            {issue.scanType === 'passive' && (
                              <Tag color="blue" style={{ marginLeft: 8 }}>被动检测</Tag>
                            )}
                          </div>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '12px' }}>
                          <div><strong>{t.security.riskType}:</strong> {issue.type}</div>
                          <div><strong>{t.security.suggestion}:</strong> {issue.recommendation}</div>
                          {issue.scanType === 'passive' && issue.timestamp && (
                            <div><strong>检测时间:</strong> {new Date(issue.timestamp).toLocaleString()}</div>
                          )}
                        </div>
                      }
                    />
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        )}

        {/* 高风险问题详情 */}
        {highRiskIssues.length > 0 && (
          <Row gutter={16}>
            <Col span={24}>
              <Card title={`${t.security.highRiskIssuesDetail} (${highRiskIssues.length})`} size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {highRiskIssues.map((issue, index) => (
                    <Alert
                      key={index}
                      type="warning"
                      showIcon
                      message={
                        <div>
                          <Text strong>{issue.description}</Text>
                          <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                            {t.security.source}: {issue.source} ({t.security.sourceTypes[issue.sourceType as keyof typeof t.security.sourceTypes]})
                            {issue.scanType === 'passive' && (
                              <Tag color="blue" style={{ marginLeft: 8 }}>被动检测</Tag>
                            )}
                          </div>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '12px' }}>
                          <div><strong>{t.security.riskType}:</strong> {issue.type}</div>
                          <div><strong>{t.security.suggestion}:</strong> {issue.recommendation}</div>
                          {issue.scanType === 'passive' && issue.timestamp && (
                            <div><strong>检测时间:</strong> {new Date(issue.timestamp).toLocaleString()}</div>
                          )}
                        </div>
                      }
                    />
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <Modal
      title={t.security.scanSettings}
      open={showSettings}
      onCancel={() => setShowSettings(false)}
      footer={[
        <Button key="cancel" onClick={() => setShowSettings(false)}>
          {t.common.cancel}
        </Button>,
        <Button key="save" type="primary" onClick={() => {
          form.validateFields().then(values => {
            setScanConfig({ ...scanConfig, ...values });
            setShowSettings(false);
            message.success(t.security.scanSettingsSaved);
          });
        }}>
          {t.common.save}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={scanConfig}
      >
        <Form.Item
          label={t.security.selectLLM}
          name="llmConfigId"
          rules={[{ required: true, message: t.security.noLLMConfigured }]}
        >
          <Select 
            placeholder={t.security.selectLLMPlaceholder}
            dropdownRender={menu => (
              <>
                {menu}
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ padding: '4px 8px', cursor: 'pointer' }} onClick={() => {
                  loadLLMConfigs();
                  message.info(t.security.refreshLLMConfigs);
                }}>
                  🔄 {t.security.refreshLLMConfigs}
                </div>
              </>
            )}
          >
            {llmConfigs.map(config => (
              <Select.Option key={config.id} value={config.id}>
                {config.name} ({config.type})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        

        
        <Form.Item label={t.security.autoGenerateTests} name="autoGenerate" valuePropName="checked">
          <Switch />
        </Form.Item>
        
        <Form.Item label={t.security.enableLLMAnalysis} name="enableLLMAnalysis" valuePropName="checked">
          <Switch />
        </Form.Item>
        
        <Form.Item label={t.security.maxTestCases} name="maxTestCases">
          <InputNumber min={1} max={20} />
        </Form.Item>
        
        <Form.Item label={t.security.timeout} name="timeout">
          <InputNumber min={10} max={300} />
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <div>
      {/* 扫描控制区 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                {t.security.title}
              </Title>
              <Tag color={connectionStatus === 'connected' ? 'green' : 'red'}>
                {connectionStatus === 'connected' ? t.config.connectionStatus.connected : t.config.connectionStatus.disconnected}
              </Tag>
              {securityLogs.length > 0 && (
                <Tag color="blue">
                  {t.security.logs}: {securityLogs.length} {t.security.logCount}
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<EyeOutlined />} 
                onClick={showRiskAnalysisGuide}
                type="dashed"
              >
                {t.security.riskGuide}
              </Button>
              <Button 
                icon={<SettingOutlined />} 
                onClick={() => setShowSettings(true)}
              >
                {t.security.settings}
              </Button>
              {currentReport && (
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={handleExportReport}
                >
                  {t.security.exportReport}
                </Button>
              )}
              {securityLogs.length > 0 && (
                <Button 
                  icon={<FileTextOutlined />} 
                  onClick={handleExportLogs}
                >
                  {t.security.exportLogs}
                </Button>
              )}
                {/* 被动监控开关 */}
                <Space>
                  <Text>{t.security.passive.monitoring}: </Text>
                  <Switch
                  checked={passiveMonitoringEnabled}
                  onChange={setPassiveMonitoringEnabled}
                  disabled={connectionStatus !== 'connected'}
                  checkedChildren={<><ScanOutlined style={{ marginRight: 4 }} />监控中</>}
                  unCheckedChildren="已停止"
                />
              </Space>
              {isScanning ? (
                <Button 
                  icon={<PauseCircleOutlined />} 
                  onClick={handleStopScan}
                  type="primary"
                  danger
                >
                  {t.security.stopScan}
                </Button>
              ) : (
                <Button 
                  icon={<PlayCircleOutlined />} 
                  onClick={handleStartScan}
                  type="primary"
                  disabled={connectionStatus !== 'connected'}
                >
                  {t.security.startScan}
                </Button>
              )}
            </Space>
          </Col>
        </Row>
        
        {isScanning && (
          <div style={{ marginTop: 16 }}>
            <Progress 
              percent={scanProgress} 
              status="active"
              format={() => `${Math.round(scanProgress)}%`}
            />
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              {scanMessage}
            </Text>
          </div>
        )}
      </Card>

      {/* 结果展示区 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: t.security.overview,
              children: renderOverview()
            },
            {
              key: 'tools',
              label: (
                <Space>
                  {t.security.toolSecurity}
                  {(() => {
                    const mergedResults = getMergedResults();
                    const totalCount = mergedResults.toolResults.length;
                    return totalCount > 0 ? <Tag color="blue">{totalCount}</Tag> : null;
                  })()}
                </Space>
              ),
              children: (() => {
                try {
                  const mergedResults = getMergedResults();
                  const filteredResults = filterResults(mergedResults.toolResults, toolRiskFilter, toolScanTypeFilter);
                  
                  return (
                    <div>
                      {renderFilterPanel(toolRiskFilter, setToolRiskFilter, toolScanTypeFilter, setToolScanTypeFilter)}
                      {filteredResults.length > 0 ? (
                        <Table
                          dataSource={filteredResults}
                          columns={toolColumns}
                          rowKey={(record) => `${record.toolName}-${record.isPassive ? 'passive' : 'active'}`}
                          pagination={{ pageSize: 10 }}
                        />
                      ) : (
                        <Empty description={t.security.noData} />
                      )}
                    </div>
                  );
                } catch (error) {
                  console.error('Error rendering tool security tab:', error);
                  return <Empty description={t.errors.loadDataFailed} />;
                }
              })()
            },
            {
              key: 'prompts',
              label: (
                <Space>
                  {t.security.promptSecurity}
                  {(() => {
                    const mergedResults = getMergedResults();
                    const totalCount = mergedResults.promptResults.length;
                    return totalCount > 0 ? <Tag color="blue">{totalCount}</Tag> : null;
                  })()}
                </Space>
              ),
                            children: (() => {
                try {
                  const mergedResults = getMergedResults();
                  const filteredResults = filterResults(mergedResults.promptResults, promptRiskFilter, promptScanTypeFilter);
                  
                  return (
                    <div>
                      {renderFilterPanel(promptRiskFilter, setPromptRiskFilter, promptScanTypeFilter, setPromptScanTypeFilter)}
                      {filteredResults.length > 0 ? (
                        <Table
                          dataSource={filteredResults}
                          columns={[
                            {
                              title: t.security.promptName,
                              dataIndex: 'promptName',
                              key: 'promptName',
                              render: (name: string, record: any) => (
                                <Space>
                                  <span>{name}</span>
                                  {record.isPassive ? (
                                    <Tag color="blue">被动检测</Tag>
                                  ) : (
                                    <Tag color="green">主动扫描</Tag>
                                  )}
                                </Space>
                              ),
                            },
                            {
                              title: t.security.riskLevel,
                              dataIndex: 'riskLevel',
                              key: 'riskLevel',
                              align: 'center' as const,
                              render: (level: SecurityRiskLevel) => (
                                <Tag color={getRiskLevelColor(level)}>
                                  {t.security.riskLevels[level as keyof typeof t.security.riskLevels] || level}
                                </Tag>
                              ),
                            },
                            {
                              title: t.security.threatCount,
                              dataIndex: 'threats',
                              key: 'threatCount',
                              align: 'center' as const,
                              render: (threats: any[], record: any) => {
                                let totalThreats = threats?.length || 0;
                                
                                // 如果有LLM静态分析，也计算其中的威胁数量
                                if (record.llmAnalysis) {
                                  try {
                                    const analysis = typeof record.llmAnalysis === 'string' 
                                      ? JSON.parse(record.llmAnalysis) 
                                      : record.llmAnalysis;
                                    if (analysis.threats && Array.isArray(analysis.threats)) {
                                      totalThreats += analysis.threats.length;
                                    }
                                  } catch (error) {
                                    // 解析失败时忽略
                                  }
                                }
                                
                                return totalThreats;
                              },
                            },
                            {
                              title: t.llm.actions,
                              key: 'actions',
                              align: 'center' as const,
                              render: (_: any, record: any) => (
                                <Button type="link" onClick={() => showPromptDetail(record)}>
                                  {t.security.viewDetails}
                                </Button>
                              ),
                            },
                          ]}
                          rowKey={(record) => `${record.promptName}-${record.isPassive ? 'passive' : 'active'}`}
                          pagination={{ pageSize: 10 }}
                        />
                      ) : (
                        <Empty description={t.security.noData} />
                      )}
                    </div>
                  );
                } catch (error) {
                  console.error('Error rendering prompt security tab:', error);
                  return <Empty description={t.errors.loadDataFailed} />;
                }
              })()
            },
            {
              key: 'resources',
              label: (
                <Space>
                  {t.security.resourceSecurity}
                  {(() => {
                    const mergedResults = getMergedResults();
                    const totalCount = mergedResults.resourceResults.length;
                    return totalCount > 0 ? <Tag color="blue">{totalCount}</Tag> : null;
                  })()}
                </Space>
              ),
                            children: (() => {
                try {
                  const mergedResults = getMergedResults();
                  const filteredResults = filterResults(mergedResults.resourceResults, resourceRiskFilter, resourceScanTypeFilter);
                  
                  return (
                    <div>
                      {renderFilterPanel(resourceRiskFilter, setResourceRiskFilter, resourceScanTypeFilter, setResourceScanTypeFilter)}
                      {filteredResults.length > 0 ? (
                        <Table
                          dataSource={filteredResults}
                          columns={[
                            {
                              title: t.security.resourceUri,
                              dataIndex: 'resourceUri',
                              key: 'resourceUri',
                              render: (uri: string, record: any) => (
                                <Space>
                                  <span>{uri}</span>
                                  {record.isPassive ? (
                                    <Tag color="blue">被动检测</Tag>
                                  ) : (
                                    <Tag color="green">主动扫描</Tag>
                                  )}
                                </Space>
                              ),
                            },
                            {
                              title: t.security.riskLevel,
                              dataIndex: 'riskLevel',
                              key: 'riskLevel',
                              align: 'center' as const,
                              render: (level: SecurityRiskLevel) => (
                                <Tag color={getRiskLevelColor(level)}>
                                  {t.security.riskLevels[level as keyof typeof t.security.riskLevels] || level}
                                </Tag>
                              ),
                            },
                            {
                              title: t.security.riskCount,
                              dataIndex: 'risks',
                              key: 'riskCount',
                              align: 'center' as const,
                              render: (risks: any[], record: any) => {
                                let totalRisks = risks?.length || 0;
                                
                                // 如果有访问测试结果，也计算其中的数量
                                if (record.accessTests && Array.isArray(record.accessTests)) {
                                  totalRisks += record.accessTests.length;
                                }
                                
                                // 如果有LLM静态分析，也计算其中的风险数量
                                if (record.llmAnalysis) {
                                  try {
                                    const analysis = typeof record.llmAnalysis === 'string' 
                                      ? JSON.parse(record.llmAnalysis) 
                                      : record.llmAnalysis;
                                    if (analysis.risks && Array.isArray(analysis.risks)) {
                                      totalRisks += analysis.risks.length;
                                    }
                                  } catch (error) {
                                    // 解析失败时忽略
                                  }
                                }
                                
                                return totalRisks;
                              },
                            },
                            {
                              title: t.llm.actions,
                              key: 'actions',
                              align: 'center' as const,
                              render: (_: any, record: any) => (
                                <Button type="link" onClick={() => showResourceDetail(record)}>
                                  {t.security.viewDetails}
                                </Button>
                              ),
                            },
                          ]}
                          rowKey={(record) => `${record.resourceUri}-${record.isPassive ? 'passive' : 'active'}`}
                          pagination={{ pageSize: 10 }}
                        />
                      ) : (
                        <Empty description={t.security.noData} />
                      )}
                    </div>
                  );
                } catch (error) {
                  console.error('Error rendering resource security tab:', error);
                  return <Empty description={t.errors.loadDataFailed} />;
                }
              })()
            },
            {
              key: 'passive',
              label: (
                <Space>
                  <PlayCircleOutlined />
                  {t.security.passive.title}
                </Space>
              ),
              children: (
                <PassiveSecurityTester
                  config={scanConfig}
                  onNewPassiveResult={handleNewPassiveResult}
                  enabled={passiveMonitoringEnabled}
                  onEnabledChange={setPassiveMonitoringEnabled}
                />
              )
            },
            {
              key: 'logs',
              label: (
                <Space>
                  <FileTextOutlined />
                  {t.security.detectionLogs}
                                     {securityLogs.length > 0 && (
                     <Tag color="blue">{securityLogs.length}</Tag>
                   )}
                </Space>
              ),
              children: (
                <SecurityLogViewer
                  logs={securityLogs}
                  isScanning={isScanning}
                  onClearLogs={handleClearLogs}
                  onExportLogs={handleExportLogs}
                />
              )
            },
            {
              key: 'history',
              label: (
                <Space>
                  <HistoryOutlined />
                  {t.security.history.title}
                </Space>
              ),
              children: (
                <SecurityHistoryPanel
                  onRestoreRecord={handleRestoreHistoryRecord}
                />
              )
            }
          ]}
        />
      </Card>

      {renderSettings()}
    </div>
  );
};

export default SecurityPanel; 