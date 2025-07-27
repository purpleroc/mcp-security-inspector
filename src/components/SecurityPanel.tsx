import React, { useState, useEffect } from 'react';
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
  CheckCircleOutlined
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
import { securityEngine } from '../services/securityEngine';
import { llmClient } from '../services/llmClient';
import { getLLMConfigs } from '../utils/storage';

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

  // 默认配置
  const defaultConfig: SecurityCheckConfig = {
    enabled: true,
    llmConfigId: '',
    checkLevel: 'standard',
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

      const report = await securityEngine.startComprehensiveScan(
        scanConfig,
        (progress, message) => {
          setScanProgress(progress);
          setScanMessage(message);
        }
      );

      setCurrentReport(report);
      message.success(t.security.scanComplete);
    } catch (error) {
      console.error('安全扫描失败:', error);
      message.error(`${t.security.scanFailed}: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setScanMessage('');
    }
  };

  const handleStopScan = () => {
    securityEngine.cancelCurrentScan();
    setIsScanning(false);
    setScanProgress(0);
    setScanMessage('');
    message.info(t.security.scanCancelled);
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

  const getRiskLevelColor = (level: SecurityRiskLevel): string => {
    switch (level) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#ff7a45';
      case 'medium': return '#ffa940';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getRiskLevelIcon = (level: SecurityRiskLevel) => {
    switch (level) {
      case 'critical': return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'high': return <AlertOutlined style={{ color: '#ff7a45' }} />;
      case 'medium': return <WarningOutlined style={{ color: '#ffa940' }} />;
      case 'low': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      default: return <SafetyCertificateOutlined style={{ color: '#d9d9d9' }} />;
    }
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
      render: (level: SecurityRiskLevel) => (
        <Tag color={getRiskLevelColor(level)}>
          {getRiskLevelIcon(level)}
          {t.security.riskLevels[level as keyof typeof t.security.riskLevels] || level}
        </Tag>
      ),
    },
    {
      title: t.security.vulnerabilityCount,
      dataIndex: 'vulnerabilities',
      key: 'vulnerabilityCount',
      render: (vulnerabilities: any[]) => vulnerabilities.length,
    },
    {
      title: t.security.testCaseCount,
      dataIndex: 'testResults',
      key: 'testCount',
      render: (testResults: any[]) => testResults.length,
    },
    {
      title: t.llm.actions,
      key: 'actions',
      render: (_: any, record: any) => (
        <Button type="link" onClick={() => showToolDetail(record)}>
          {t.security.viewDetails}
        </Button>
      ),
    },
  ];

  const showToolDetail = (tool: any) => {
    Modal.info({
      title: `${t.security.toolSecurityAnalysis}: ${tool.toolName}`,
      width: 800,
      content: (
        <div>
          <Divider>{t.security.riskLevel}</Divider>
          <Tag color={getRiskLevelColor(tool.riskLevel)}>
            {getRiskLevelIcon(tool.riskLevel)}
            {t.security.riskLevels[tool.riskLevel as keyof typeof t.security.riskLevels] || tool.riskLevel}
          </Tag>
          
          {tool.vulnerabilities.length > 0 && (
            <>
              <Divider>{t.security.foundVulnerabilities}</Divider>
              {tool.vulnerabilities.map((vuln: any, index: number) => (
                <Alert
                  key={index}
                  type={vuln.severity === 'critical' || vuln.severity === 'high' ? 'error' : 'warning'}
                  message={vuln.description}
                  description={vuln.recommendation}
                  style={{ marginBottom: 8 }}
                />
              ))}
            </>
          )}
          
          {tool.testResults.length > 0 && (
            <>
              <Divider>{t.security.securityTestResults}</Divider>
              {tool.testResults.map((test: any, index: number) => (
                <Card key={index} size="small" style={{ marginBottom: 8 }}>
                  <p><strong>{t.security.testCase}:</strong> {test.testCase}</p>
                  <p><strong>{t.security.passStatus}:</strong> 
                    <Tag color={test.passed ? 'success' : 'error'}>
                      {test.passed ? t.security.passed : t.security.failed}
                    </Tag>
                  </p>
                  <p><strong>{t.security.riskAssessmentTitle}:</strong> {test.riskAssessment}</p>
                </Card>
              ))}
            </>
          )}
          
          <Divider>{t.security.llmAnalysisTitle}</Divider>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {tool.llmAnalysis}
          </Paragraph>
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

    return (
      <div>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.overallRisk}
                value={t.security.riskLevels[currentReport.overallRisk as keyof typeof t.security.riskLevels]}
                prefix={getRiskLevelIcon(currentReport.overallRisk)}
                valueStyle={{ color: getRiskLevelColor(currentReport.overallRisk) }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.totalIssues}
                value={currentReport.summary.totalIssues}
                prefix={<AlertOutlined />}
                valueStyle={{ color: currentReport.summary.totalIssues > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.criticalIssues}
                value={currentReport.summary.criticalIssues}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.highIssues}
                value={currentReport.summary.highIssues}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#ff7a45' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
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
        
        <Form.Item label={t.security.scanLevel} name="checkLevel">
          <Select>
            <Select.Option value="basic">{t.security.basic}</Select.Option>
            <Select.Option value="standard">{t.security.standard}</Select.Option>
            <Select.Option value="deep">{t.security.deep}</Select.Option>
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
            </Space>
          </Col>
          <Col>
            <Space>
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
        <Tabs defaultActiveKey="overview">
          <TabPane tab={t.security.overview} key="overview">
            {renderOverview()}
          </TabPane>
          
          <TabPane tab={t.security.toolSecurity} key="tools">
            {currentReport ? (
              <Table
                dataSource={currentReport.toolResults}
                columns={toolColumns}
                rowKey="toolName"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description={t.security.noData} />
            )}
          </TabPane>
          
          <TabPane tab={t.security.promptSecurity} key="prompts">
            {currentReport ? (
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
                    render: (level: SecurityRiskLevel) => (
                      <Tag color={getRiskLevelColor(level)}>
                        {getRiskLevelIcon(level)}
                        {t.security.riskLevels[level as keyof typeof t.security.riskLevels] || level}
                      </Tag>
                    ),
                  },
                  {
                    title: t.security.threatCount,
                    dataIndex: 'threats',
                    key: 'threatCount',
                    render: (threats: any[]) => threats.length,
                  },
                ]}
                rowKey="promptName"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description={t.security.noData} />
            )}
          </TabPane>
          
          <TabPane tab={t.security.resourceSecurity} key="resources">
            {currentReport ? (
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
                    render: (level: SecurityRiskLevel) => (
                      <Tag color={getRiskLevelColor(level)}>
                        {getRiskLevelIcon(level)}
                        {t.security.riskLevels[level as keyof typeof t.security.riskLevels] || level}
                      </Tag>
                    ),
                  },
                  {
                    title: t.security.riskCount,
                    dataIndex: 'risks',
                    key: 'riskCount',
                    render: (risks: any[]) => risks.length,
                  },
                ]}
                rowKey="resourceUri"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <Empty description={t.security.noData} />
            )}
          </TabPane>
        </Tabs>
      </Card>

      {renderSettings()}
    </div>
  );
};

export default SecurityPanel; 