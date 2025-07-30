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
  CloseCircleOutlined
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
import { getLLMConfigs } from '../utils/storage';
import { PassiveSecurityTester } from './PassiveSecurityTester';
import SecurityLogViewer from './SecurityLogViewer';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const SecurityPanel: React.FC = () => {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const connectionStatus = useSelector((state: RootState) => state.mcp.connectionStatus);
  
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

  // 默认配置
  const defaultConfig: SecurityCheckConfig = {
    enabled: true,
    llmConfigId: '',

    autoGenerate: true,
    maxTestCases: 5,
    timeout: 30
  };

  const [scanConfig, setScanConfig] = useState<SecurityCheckConfig>(defaultConfig);

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
      message.success(t.security.scanComplete);
    } catch (error) {
      console.error('安全扫描失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
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
      render: (vulnerabilities: any[]) => vulnerabilities.length,
    },
    {
      title: t.security.testCaseCount,
      dataIndex: 'testResults',
      key: 'testCount',
      align: 'center' as const,
      render: (testResults: any[]) => testResults.length,
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
            <Text strong>{t.security.riskLevel}: </Text>
            <Tag color={getRiskLevelColor(tool.riskLevel)}>
              {t.security.riskLevels[tool.riskLevel as keyof typeof t.security.riskLevels] || tool.riskLevel}
            </Tag>
          </div>

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
            <Text strong>{t.security.riskLevel}: </Text>
            <Tag color={getRiskLevelColor(prompt.riskLevel)}>
              {t.security.riskLevels[prompt.riskLevel as keyof typeof t.security.riskLevels] || prompt.riskLevel}
            </Tag>
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
            <Text strong>{t.security.riskLevel}: </Text>
            <Tag color={getRiskLevelColor(resource.riskLevel)}>
              {t.security.riskLevels[resource.riskLevel as keyof typeof t.security.riskLevels] || resource.riskLevel}
            </Tag>
          </div>


          {/* 显示访问测试结果 */}
          {resource.accessTests && resource.accessTests.length > 0 && (
            <div>
              <Title level={5}>访问测试结果</Title>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  总测试数: {resource.accessTests.length}
                </Text>
              </div>
              {resource.accessTests.map((test: any, index: number) => (
                <Card 
                  key={index} 
                  size="small" 
                  style={{ 
                    marginBottom: 12,
                    border: `2px solid ${test.success ? '#52c41a' : '#ff4d4f'}`,
                    borderRadius: '8px',
                    backgroundColor: test.success ? '#f6ffed' : '#fff2f0'
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
                        {test.success ? '成功' : '失败'}
                      </Tag>
                    </Space>
                  }
                >
                  <div style={{ fontSize: '13px', marginBottom: 12 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Text strong>测试URI:</Text>
                      <div style={{ 
                        marginTop: 4,
                        color: '#666',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        backgroundColor: '#f5f5f5',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>
                        {test.uri}
                      </div>
                    </div>
                    
                    {test.riskAssessment && (
                      <div>
                        <Text strong>风险评估:</Text>
                        <div style={{ 
                          marginTop: 4,
                          color: '#666',
                          fontSize: '12px',
                          lineHeight: '1.4'
                        }}>
                          {test.riskAssessment}
                        </div>
                      </div>
                    )}
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
                        <div style={{ marginBottom: 16 }}>
                          <Space>
                            <Text strong>{t.security.riskLevel}:</Text>
                            <Tag color={getRiskLevelColor(analysis.riskLevel)}>
                              {t.security.riskLevels[analysis.riskLevel as keyof typeof t.security.riskLevels] || analysis.riskLevel}
                            </Tag>
                          </Space>
                        </div>
                        
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

        </div>
      ),
    });
  };

  const renderOverview = () => {
    if (!currentReport) {
      return (
        <Empty 
          description={t.security.noData}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    // 收集严重和高风险问题
    const criticalIssues: any[] = [];
    const highRiskIssues: any[] = [];

    // 从工具结果中收集问题
    currentReport.toolResults.forEach(tool => {
      tool.vulnerabilities.forEach(vuln => {
        const issue = {
          sourceType: 'tool',
          source: tool.toolName,
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
          ...risk
        };
        if (risk.severity === 'critical') {
          criticalIssues.push(issue);
        } else if (risk.severity === 'high') {
          highRiskIssues.push(issue);
        }
      });
    });

    return (
      <div>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.overallRisk}
                value={t.security.riskLevels[currentReport.overallRisk as keyof typeof t.security.riskLevels]}
                valueStyle={{ color: getRiskLevelColor(currentReport.overallRisk), textAlign: 'center' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.totalIssues}
                value={currentReport.summary.totalIssues}
                prefix={<AlertOutlined />}
                valueStyle={{ color: currentReport.summary.totalIssues > 0 ? '#ff4d4f' : '#52c41a', textAlign: 'center' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.criticalIssues}
                value={currentReport.summary.criticalIssues}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f', textAlign: 'center' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.highIssues}
                value={currentReport.summary.highIssues}
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
                  <Tag color="red">{currentReport.summary.criticalIssues}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{t.security.highRisk}: </Text>
                  <Tag color="orange">{currentReport.summary.highIssues}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{t.security.mediumRisk}: </Text>
                  <Tag color="gold">{currentReport.summary.mediumIssues}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{t.security.lowRisk}: </Text>
                  <Tag color="green">{currentReport.summary.lowIssues}</Tag>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card title={t.security.recommendations} size="small">
              <Space direction="vertical">
                {currentReport.recommendations.map((rec, index) => (
                  <Alert
                    key={index}
                    type="info"
                    message={rec}
                    showIcon
                  />
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

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
                          </div>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '12px' }}>
                          <div><strong>{t.security.riskType}:</strong> {issue.type}</div>
                          <div><strong>{t.security.suggestion}:</strong> {issue.recommendation}</div>
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
                          </div>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '12px' }}>
                          <div><strong>{t.security.riskType}:</strong> {issue.type}</div>
                          <div><strong>{t.security.suggestion}:</strong> {issue.recommendation}</div>
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
                  {currentReport && currentReport.toolResults.length > 0 && (
                    <Tag color="blue">{currentReport.toolResults.length}</Tag>
                  )}
                </Space>
              ),
              children: currentReport ? (
                <Table
                  dataSource={currentReport.toolResults}
                  columns={toolColumns}
                  rowKey="toolName"
                  pagination={{ pageSize: 10 }}
                />
              ) : (
                <Empty description={t.security.noData} />
              )
            },
            {
              key: 'prompts',
              label: (
                <Space>
                  {t.security.promptSecurity}
                  {currentReport && currentReport.promptResults.length > 0 && (
                    <Tag color="blue">{currentReport.promptResults.length}</Tag>
                  )}
                </Space>
              ),
              children: currentReport ? (
                <Table
                  dataSource={currentReport.promptResults}
                  columns={[
                    {
                      title: t.security.promptName,
                      dataIndex: 'promptName',
                      key: 'promptName',
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
                      render: (threats: any[]) => threats.length,
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
                  rowKey="promptName"
                  pagination={{ pageSize: 10 }}
                />
              ) : (
                <Empty description={t.security.noData} />
              )
            },
            {
              key: 'resources',
              label: (
                <Space>
                  {t.security.resourceSecurity}
                  {currentReport && currentReport.resourceResults.length > 0 && (
                    <Tag color="blue">{currentReport.resourceResults.length}</Tag>
                  )}
                </Space>
              ),
              children: currentReport ? (
                <Table
                  dataSource={currentReport.resourceResults}
                  columns={[
                    {
                      title: t.security.resourceUri,
                      dataIndex: 'resourceUri',
                      key: 'resourceUri',
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
                      render: (risks: any[]) => risks.length,
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
                  rowKey="resourceUri"
                  pagination={{ pageSize: 10 }}
                />
              ) : (
                <Empty description={t.security.noData} />
              )
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
            }
          ]}
        />
      </Card>

      {renderSettings()}
    </div>
  );
};

export default SecurityPanel; 