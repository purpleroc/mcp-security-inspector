import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Switch,
  Button,
  Statistic,
  Badge,
  Table,
  Tag,
  Drawer,
  Timeline,
  Alert,
  Space,
  Typography,
  Input,
  Select,
  Tooltip,
  Divider,
  Empty,
  Progress,
  message,
  ConfigProvider,
  Tabs,
  List,
  Avatar,
  Collapse,
  Radio,
  Form,
  Modal,
  Checkbox
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  EyeOutlined,
  FilterOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined,
  AlertOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  BugOutlined,
  SecurityScanOutlined,
  ScanOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SettingOutlined,
  RobotOutlined,
  ApiOutlined,
  DownOutlined,
  RightOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { useI18n } from '../hooks/useI18n';
import { SecurityCheckConfig, SecurityRiskLevel, DetectionRule, DetectionRuleCategory, DetectionScope, RuleValidationResult } from '../types/mcp';
import { mcpClient, PassiveDetectionResult } from '../services/mcpClient';
import { DetectionEngine } from '../services/detectionEngine';

const { Title, Text, Paragraph } = Typography;
const { Search, TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

interface PassiveSecurityDisplayProps {
  config: SecurityCheckConfig;
}

export const PassiveSecurityTester: React.FC<PassiveSecurityDisplayProps> = ({
  config
}) => {
  const { t } = useI18n();
  
  // 状态管理
  const [isEnabled, setIsEnabled] = useState(false);
  const [results, setResults] = useState<PassiveDetectionResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<PassiveDetectionResult[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterLevel, setFilterLevel] = useState<SecurityRiskLevel | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'tool' | 'resource' | 'prompt'>('all');
  const [selectedResult, setSelectedResult] = useState<PassiveDetectionResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [llmAnalysisEnabled, setLlmAnalysisEnabled] = useState(false);
  const [autoScrollToNew, setAutoScrollToNew] = useState(true);

  // 规则管理状态
  const [activeTab, setActiveTab] = useState('monitor');
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<DetectionRule[]>([]);
  const [ruleSearchText, setRuleSearchText] = useState('');
  const [ruleFilterCategory, setRuleFilterCategory] = useState<DetectionRuleCategory | 'all'>('all');
  const [selectedRule, setSelectedRule] = useState<DetectionRule | null>(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [isEditingRule, setIsEditingRule] = useState(false);
  const [ruleForm] = Form.useForm();
  const [testInput, setTestInput] = useState('');
  const [testResults, setTestResults] = useState<RuleValidationResult | null>(null);
  const [testMatchResult, setTestMatchResult] = useState<{isMatched: boolean, message: string} | null>(null);

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    today: 0,
    thisHour: 0
  });

  // 初始化被动检测
  useEffect(() => {
    const handleNewResult = (result: PassiveDetectionResult) => {
      setResults(prev => [result, ...prev.slice(0, 499)]); // 保持最新500条
      
      if (realtimeEnabled) {
        message.info({
          content: `${t.security.passive.detectionTime} ${getRiskLevelText(result.riskLevel)} ${t.security.passive.threatLevel}: ${result.targetName}`,
          duration: 3
        });
      }
      
      // 更新统计信息
      updateStats([result, ...results]);
    };

    // 添加监听器
    mcpClient.addPassiveDetectionListener(handleNewResult);
    
    // 加载现有结果
    const existingResults = mcpClient.getPassiveDetectionResults();
    setResults(existingResults);
    updateStats(existingResults);

    return () => {
      mcpClient.removePassiveDetectionListener(handleNewResult);
    };
  }, [results, realtimeEnabled]);

  // 初始化规则管理
  useEffect(() => {
    loadRules();
  }, []);

  // 加载检测规则
  const loadRules = async () => {
    try {
      const detectionEngine = DetectionEngine.getInstance();
      const allRules = detectionEngine.getAllRules();
      setRules(allRules);
      setFilteredRules(allRules);
    } catch (error) {
      console.error(t.security.passive.rulesManagement.loadRulesFailed, error);
      message.error(t.security.passive.rulesManagement.loadRulesFailed);
    }
  };

  // 更新统计信息
  const updateStats = (resultList: PassiveDetectionResult[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    
    const newStats = resultList.reduce((acc, result) => {
      const resultTime = new Date(result.timestamp);
      
      acc.total++;
      acc[result.riskLevel]++;
      
      if (resultTime >= today) {
        acc.today++;
      }
      
      if (resultTime >= thisHour) {
        acc.thisHour++;
      }
      
      return acc;
    }, { total: 0, critical: 0, high: 0, medium: 0, low: 0, today: 0, thisHour: 0 });
    
    setStats(newStats);
  };

  // 过滤结果
  useEffect(() => {
    let filtered = results;
    
    // 文本搜索
    if (searchText) {
      filtered = filtered.filter(result => 
        result.targetName.toLowerCase().includes(searchText.toLowerCase()) ||
        result.threats.some(threat => 
          threat.description.toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }
    
    // 风险级别过滤
    if (filterLevel !== 'all') {
      filtered = filtered.filter(result => result.riskLevel === filterLevel);
    }
    
    // 类型过滤
    if (filterType !== 'all') {
      filtered = filtered.filter(result => result.type === filterType);
    }
    
    setFilteredResults(filtered);
  }, [results, searchText, filterLevel, filterType]);

  // 过滤规则
  useEffect(() => {
    let filtered = rules;
    
    // 文本搜索
    if (ruleSearchText) {
      const detectionEngine = DetectionEngine.getInstance();
      filtered = detectionEngine.searchRules(ruleSearchText);
    }
    
    // 分类过滤
    if (ruleFilterCategory !== 'all') {
      filtered = filtered.filter(rule => rule.category === ruleFilterCategory);
    }
    
    setFilteredRules(filtered);
  }, [rules, ruleSearchText, ruleFilterCategory]);

  // 切换被动检测状态
  const handleToggleDetection = () => {
    if (isEnabled) {
      mcpClient.disablePassiveDetection();
      setIsEnabled(false);
      message.success(t.security.passive.disabled);
    } else {
      mcpClient.enablePassiveDetection(config);
      setIsEnabled(true);
      message.success(t.security.passive.enabled);
    }
  };

  // 清空结果
  const handleClearResults = () => {
    mcpClient.clearPassiveDetectionResults();
    setResults([]);
    setFilteredResults([]);
    setStats({ total: 0, critical: 0, high: 0, medium: 0, low: 0, today: 0, thisHour: 0 });
    message.success(t.security.passive.clearRecords);
  };

  // 导出结果
  const handleExportResults = () => {
    const dataStr = JSON.stringify(filteredResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `passive-detection-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    message.success(t.security.passive.exportResults);
  };

  // 获取风险等级相关样式和文本
  const getRiskLevelColor = (level: SecurityRiskLevel): string => {
    switch (level) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#ff7a45';
      case 'medium': return '#ffa940';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getRiskLevelText = (level: SecurityRiskLevel): string => {
    switch (level) {
      case 'critical': return t.security.riskLevels.critical;
      case 'high': return t.security.riskLevels.high;
      case 'medium': return t.security.riskLevels.medium;
      case 'low': return t.security.riskLevels.low;
      default: return 'Unknown';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tool': return <ApiOutlined />;
      case 'resource': return <FileTextOutlined />;
      case 'prompt': return <RobotOutlined />;
      default: return <BugOutlined />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'tool': return t.security.passive.toolCall;
      case 'resource': return t.security.passive.resourceAccess;
      case 'prompt': return t.security.passive.promptProcessing;
      default: return type;
    }
  };

  // 规则管理函数
  const handleCreateRule = () => {
    setSelectedRule(null);
    setIsEditingRule(false);
    ruleForm.resetFields();
    setTestInput(''); // 清空测试输入
    setTestResults(null); // 清空测试结果
    setTestMatchResult(null); // 清空匹配结果
    setShowRuleEditor(true);
  };

  const handleEditRule = (rule: DetectionRule) => {
    setSelectedRule(rule);
    setIsEditingRule(true);
    ruleForm.setFieldsValue({
      ...rule,
      tags: rule.tags?.join(', ') || ''
    });
    setTestInput(''); // 清空测试输入
    setTestResults(null); // 清空测试结果
    setTestMatchResult(null); // 清空匹配结果
    setShowRuleEditor(true);
  };

  const handleSaveRule = async () => {
    try {
      const values = await ruleForm.validateFields();
      const detectionEngine = DetectionEngine.getInstance();
      
      const ruleData: DetectionRule = {
        id: isEditingRule ? selectedRule!.id : `custom_${Date.now()}`,
        name: values.name,
        description: values.description,
        category: values.category,
        enabled: values.enabled !== false,
        pattern: values.pattern,
        flags: values.flags || 'gi',
        scope: values.scope,
        riskLevel: values.riskLevel,
        threatType: values.threatType,
        captureGroups: values.captureGroups?.split(',').map((s: string) => s.trim()).filter(Boolean),
        maskSensitiveData: values.maskSensitiveData || false,
        maxMatches: values.maxMatches || 10,
        isBuiltin: false,
        createdAt: isEditingRule ? selectedRule!.createdAt : Date.now(),
        updatedAt: Date.now(),
        tags: values.tags ? values.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        recommendation: values.recommendation,
        remediation: values.remediation,
        references: values.references?.split('\n').map((s: string) => s.trim()).filter(Boolean)
      };

      if (isEditingRule) {
        detectionEngine.updateRule(ruleData);
        message.success(t.security.passive.rulesManagement.ruleUpdated);
      } else {
        detectionEngine.addCustomRule(ruleData);
        message.success(t.security.passive.rulesManagement.ruleCreated);
      }

      await loadRules();
      setShowRuleEditor(false);
    } catch (error) {
      message.error(t.security.passive.rulesManagement.saveRuleFailed.replace('{error}', (error as Error).message));
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    Modal.confirm({
      title: t.security.passive.rulesManagement.confirmDelete,
      content: t.security.passive.rulesManagement.confirmDeleteDesc,
      onOk: async () => {
        try {
          const detectionEngine = DetectionEngine.getInstance();
          detectionEngine.removeRule(ruleId);
          await loadRules();
          message.success(t.security.passive.rulesManagement.ruleDeleted);
        } catch (error) {
          message.error(t.security.passive.rulesManagement.deleteRuleFailed.replace('{error}', (error as Error).message));
        }
      }
    });
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const detectionEngine = DetectionEngine.getInstance();
      detectionEngine.toggleRule(ruleId, enabled);
      await loadRules();
      message.success(enabled ? t.security.passive.rulesManagement.ruleEnabled : t.security.passive.rulesManagement.ruleDisabled);
    } catch (error) {
      message.error(t.security.passive.rulesManagement.toggleRuleFailed.replace('{error}', (error as Error).message));
    }
  };

  const handleTestRule = async () => {
    if (!testInput.trim()) {
      message.warning(t.security.passive.rulesManagement.testRuleWarning);
      return;
    }

    try {
      const values = await ruleForm.validateFields();
      const detectionEngine = DetectionEngine.getInstance();
      
      // 创建临时规则进行测试
      const tempRule: Partial<DetectionRule> = {
        name: values.name,
        pattern: values.pattern,
        flags: values.flags || 'gi',
        threatType: values.threatType
      };

      const validation = detectionEngine.validateRule(tempRule);
      
      // 扩展验证结果，包含匹配信息
      let matchResult = null;
      
      // 如果规则有效，测试匹配
      if (validation.valid && tempRule.pattern) {
        try {
          const regex = new RegExp(tempRule.pattern, tempRule.flags || 'gi');
          const matches = regex.test(testInput);
          matchResult = {
            isMatched: matches,
            message: matches ? t.security.passive.rulesManagement.testSuccess : t.security.passive.rulesManagement.testComplete
          };
          
          // 显示测试结果消息
          if (matches) {
            message.success(t.security.passive.rulesManagement.testSuccess);
          } else {
            message.info(t.security.passive.rulesManagement.testComplete);
          }
        } catch (error) {
          matchResult = {
            isMatched: false,
            message: t.security.passive.rulesManagement.regexExecutionFailed
          };
          message.error(t.security.passive.rulesManagement.regexExecutionFailed);
        }
      } else if (!validation.valid) {
        // 规则无效时，不进行匹配测试
        matchResult = null;
        message.error(t.security.passive.rulesManagement.ruleSyntaxErrorDesc);
      }

      setTestResults(validation);
      setTestMatchResult(matchResult);

    } catch (error) {
      message.error(t.security.passive.rulesManagement.testRuleFailed);
    }
  };

  const handleExportRules = () => {
    let selectedExportType = 'all';
    
    Modal.confirm({
      title: t.security.passive.rulesManagement.selectExportType,
      content: (
        <div>
          <p>{t.security.passive.rulesManagement.exportTypeDesc}</p>
          <Radio.Group 
            defaultValue="all" 
            onChange={(e) => { selectedExportType = e.target.value; }}
          >
            <div style={{ marginBottom: 8 }}>
              <Radio value="all">{t.security.passive.rulesManagement.allRules}</Radio>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Radio value="custom">{t.security.passive.rulesManagement.customRulesOnly}</Radio>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Radio value="enabled">{t.security.passive.rulesManagement.enabledRulesOnly}</Radio>
            </div>
          </Radio.Group>
        </div>
      ),
      onOk: () => {
        performExport(selectedExportType);
      },
      okText: t.security.passive.rulesManagement.export,
      cancelText: t.security.passive.rulesManagement.cancel
    });
  };

  const performExport = (exportType: string) => {
    try {
      const detectionEngine = DetectionEngine.getInstance();
      let rulesToExport: DetectionRule[] = [];
      let fileName = '';

      switch (exportType) {
        case 'all':
          rulesToExport = detectionEngine.getAllRules();
          fileName = `all-detection-rules-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'custom':
          rulesToExport = detectionEngine.getAllRules().filter(rule => !rule.isBuiltin);
          fileName = `custom-detection-rules-${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'enabled':
          rulesToExport = detectionEngine.getEnabledRules();
          fileName = `enabled-detection-rules-${new Date().toISOString().split('T')[0]}.json`;
          break;
        default:
          rulesToExport = detectionEngine.getAllRules();
          fileName = `detection-rules-${new Date().toISOString().split('T')[0]}.json`;
      }

      if (rulesToExport.length === 0) {
        message.warning(t.security.passive.rulesManagement.noRulesToExport);
        return;
      }

      const rulesJson = JSON.stringify(rulesToExport, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(rulesJson);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', fileName);
      linkElement.click();
      
      message.success(t.security.passive.rulesManagement.exportSuccess.replace('{count}', rulesToExport.length.toString()));
    } catch (error) {
      message.error(t.security.passive.rulesManagement.export);
    }
  };

  const handleImportRules = () => {
    Modal.confirm({
      title: t.security.passive.rulesManagement.importRulesDesc,
      width: 700,
      content: (
        <div>
          <Alert
            type="info"
            message={t.security.passive.rulesManagement.importRulesFormat}
            description={
              <div>
                <p>{t.security.passive.rulesManagement.importRulesExample}</p>
                <div style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  marginTop: '8px',
                  overflow: 'auto',
                  maxHeight: '300px'
                }}>
{`[
  {
    "id": "custom_rule_001",
    "name": "Custom Password Detection",
    "description": "Detect password leakage patterns",
    "category": "privacy",
    "enabled": true,
    "pattern": "(password|pwd)\\\\s*[:=]\\\\s*([^\\\\s]+)",
    "flags": "gi",
    "scope": "both",
    "riskLevel": "high",
    "threatType": "Password Leakage",
    "captureGroups": ["password"],
    "maskSensitiveData": true,
    "maxMatches": 5,
    "isBuiltin": false,
    "tags": ["password", "credentials"],
    "recommendation": "Change password immediately",
    "remediation": "Use secure password storage methods",
    "references": ["https://owasp.org/..."]
  }
]`}
                </div>
                <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                  <p><strong>{t.security.passive.rulesManagement.requiredFields}</strong></p>
                  <p><strong>{t.security.passive.rulesManagement.categories}</strong></p>
                  <p><strong>{t.security.passive.rulesManagement.riskLevels}</strong></p>
                  <p><strong>{t.security.passive.rulesManagement.detectionScopes}</strong></p>
                </div>
              </div>
            }
            style={{ marginBottom: 16 }}
          />
          <p>{t.security.passive.rulesManagement.clickToSelectFile}</p>
        </div>
      ),
      onOk: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const content = e.target?.result as string;
              const detectionEngine = DetectionEngine.getInstance();
              
              // 验证JSON格式
              let importedData;
              try {
                importedData = JSON.parse(content);
              } catch (parseError) {
                throw new Error(t.security.passive.rulesManagement.jsonFormatError);
              }

              // 验证是否为数组
              if (!Array.isArray(importedData)) {
                throw new Error(t.security.passive.rulesManagement.mustBeArray);
              }

              if (importedData.length === 0) {
                message.warning(t.security.passive.rulesManagement.noRulesFound);
                return;
              }

              // 导入规则
              detectionEngine.importRules(content);
              await loadRules();
              message.success(t.security.passive.rulesManagement.importSuccess.replace('{count}', importedData.length.toString()));
            } catch (error) {
              message.error(t.security.passive.rulesManagement.importFailed.replace('{error}', (error as Error).message));
            }
          };
          reader.readAsText(file);
        };
        input.click();
      },
      okText: t.security.passive.rulesManagement.selectFile,
      cancelText: t.security.passive.rulesManagement.cancel
    });
  };

  // 渲染监控内容
  const renderMonitorContent = () => (
    <div>
      {/* 统计面板 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t.security.passive.totalDetections}
              value={stats.total}
              prefix={<SecurityScanOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t.security.passive.criticalRisks}
              value={stats.critical}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t.security.passive.todayDetections}
              value={stats.today}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t.security.passive.currentHour}
              value={stats.thisHour}
              prefix={<ScanOutlined />}
              valueStyle={{ color: '#ffa940' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 过滤和搜索 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex={1}>
            <Search
              placeholder={t.security.passive.searchTargetNamePlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          
          <Col>
            <Space>
              <Text>{t.security.passive.riskLevelFilter}</Text>
              <Select
                value={filterLevel}
                onChange={setFilterLevel}
                style={{ width: 120 }}
              >
                <Option value="all">{t.security.passive.allLevels}</Option>
                <Option value="critical">{t.security.riskLevels.critical}</Option>
                <Option value="high">{t.security.riskLevels.high}</Option>
                <Option value="medium">{t.security.riskLevels.medium}</Option>
                <Option value="low">{t.security.riskLevels.low}</Option>
              </Select>
            </Space>
          </Col>
          
          <Col>
            <Space>
              <Text>{t.security.passive.callTypeFilter}</Text>
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: 120 }}
              >
                <Option value="all">{t.security.passive.allTypes}</Option>
                <Option value="tool">{t.security.passive.toolCall}</Option>
                <Option value="resource">{t.security.passive.resourceAccess}</Option>
                <Option value="prompt">{t.security.passive.promptProcessing}</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 检测结果 */}
      {!isEnabled && results.length === 0 ? (
        <Empty
          image={<SecurityScanOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          description={
            <div>
              <Title level={4}>{t.security.passive.notEnabled}</Title>
              <Paragraph>
                {t.security.passive.notEnabledDesc}
              </Paragraph>
            </div>
          }
        />
      ) : isEnabled && filteredResults.length === 0 ? (
        <Empty
          image={<ScanOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <div>
              <Title level={4}>{t.security.passive.waitingResults}</Title>
              <Paragraph>
                {t.security.passive.waitingResultsDesc}
              </Paragraph>
            </div>
          }
        />
      ) : (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>
              {t.security.passive.showRecords.replace('{count}', filteredResults.length.toString()).replace('{total}', results.length.toString())}
              {searchText && t.security.passive.searchResults.replace('{search}', searchText)}
            </Text>
            
            <Space>
              <Tooltip title={realtimeEnabled ? t.security.passive.disableRealtimeNotification : t.security.passive.enableRealtimeNotification}>
                <Button
                  type="text"
                  icon={realtimeEnabled ? <BugOutlined /> : <BugOutlined style={{ opacity: 0.5 }} />}
                  onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                />
              </Tooltip>
              
              <Tooltip title={t.security.passive.refresh}>
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    const existingResults = mcpClient.getPassiveDetectionResults();
                    setResults(existingResults);
                    updateStats(existingResults);
                  }}
                />
              </Tooltip>
            </Space>
          </div>
          
          <Table
            columns={columns}
            dataSource={filteredResults}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} records`,
            }}
            scroll={{ x: 800 }}
          />
        </div>
      )}
    </div>
  );

  // 渲染规则管理界面
  const renderRulesManagement = () => {
    const ruleColumns = [
      {
        title: t.security.passive.rulesManagement.ruleName,
        dataIndex: 'name',
        key: 'name',
        width: 200,
        render: (name: string, record: DetectionRule) => (
          <div>
            <Text strong style={{ display: 'flex', alignItems: 'center' }}>
              {record.isBuiltin && <Tag color="blue" style={{ marginRight: 4, fontSize: '11px' }}>{t.security.passive.rulesManagement.builtin}</Tag>}
              {name}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
          </div>
        ),
      },
      {
        title: t.security.passive.rulesManagement.category,
        dataIndex: 'category',
        key: 'category',
        width: 100,
        render: (category: DetectionRuleCategory) => {
          const categoryMap = {
            security: { color: '#ff4d4f', text: t.security.passive.rulesManagement.security },
            privacy: { color: '#fa8c16', text: t.security.passive.rulesManagement.privacy },
            compliance: { color: '#1890ff', text: t.security.passive.rulesManagement.compliance },
            data_quality: { color: '#52c41a', text: t.security.passive.rulesManagement.dataQuality },
            performance: { color: '#722ed1', text: t.security.passive.rulesManagement.performance },
            custom: { color: '#8c8c8c', text: t.security.passive.rulesManagement.custom }
          };
          const config = categoryMap[category] || categoryMap.custom;
          return <Tag color={config.color}>{config.text}</Tag>;
        },
      },
      {
        title: t.security.passive.rulesManagement.riskLevel,
        dataIndex: 'riskLevel',
        key: 'riskLevel',
        width: 100,
        render: (level: SecurityRiskLevel) => (
          <Tag color={getRiskLevelColor(level)}>
            {getRiskLevelText(level)}
          </Tag>
        ),
      },
      {
        title: t.security.passive.rulesManagement.scope,
        dataIndex: 'scope',
        key: 'scope',
        width: 80,
        render: (scope: DetectionScope) => {
          const scopeMap = {
            parameters: t.security.passive.rulesManagement.input,
            output: t.security.passive.rulesManagement.output,
            both: t.security.passive.rulesManagement.both
          };
          return <Tag>{scopeMap[scope]}</Tag>;
        },
      },
      {
        title: t.security.passive.rulesManagement.status,
        dataIndex: 'enabled',
        key: 'enabled',
        width: 80,
        render: (enabled: boolean, record: DetectionRule) => (
          <Switch
            checked={enabled}
            size="small"
            onChange={(checked) => handleToggleRule(record.id, checked)}
          />
        ),
      },
      {
        title: t.security.passive.rulesManagement.actions,
        key: 'actions',
        width: 120,
        render: (_: any, record: DetectionRule) => (
          <Space size="small">
            <Tooltip title={t.security.passive.rulesManagement.edit}>
              <Button
                type="text"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => handleEditRule(record)}
              />
            </Tooltip>
            {!record.isBuiltin && (
              <Tooltip title={t.security.passive.rulesManagement.delete}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteRule(record.id)}
                />
              </Tooltip>
            )}
          </Space>
        ),
      },
    ];

    return (
      <div>
        {/* 规则管理工具栏 */}
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col flex={1}>
              <Row gutter={16} align="middle">
                <Col flex={1}>
                  <Search
                    placeholder={t.security.passive.rulesManagement.searchRulesPlaceholder}
                    value={ruleSearchText}
                    onChange={(e) => setRuleSearchText(e.target.value)}
                    style={{ width: '100%' }}
                    allowClear
                  />
                </Col>
                <Col>
                  <Select
                    value={ruleFilterCategory}
                    onChange={setRuleFilterCategory}
                    style={{ width: 120 }}
                  >
                    <Option value="all">{t.security.passive.rulesManagement.allCategories}</Option>
                    <Option value="security">{t.security.passive.rulesManagement.security}</Option>
                    <Option value="privacy">{t.security.passive.rulesManagement.privacy}</Option>
                    <Option value="compliance">{t.security.passive.rulesManagement.compliance}</Option>
                    <Option value="data_quality">{t.security.passive.rulesManagement.dataQuality}</Option>
                    <Option value="performance">{t.security.passive.rulesManagement.performance}</Option>
                    <Option value="custom">{t.security.passive.rulesManagement.custom}</Option>
                  </Select>
                </Col>
              </Row>
            </Col>
            
            <Col>
              <Space>
                <Button 
                  type="primary" 
                  icon={<SettingOutlined />}
                  onClick={handleCreateRule}
                >
                  {t.security.passive.rulesManagement.newRule}
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={handleExportRules}
                >
                  {t.security.passive.rulesManagement.exportRules}
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={handleImportRules}
                >
                  {t.security.passive.rulesManagement.importRules}
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 规则统计 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.passive.rulesManagement.totalRules}
                value={rules.length}
                prefix={<SettingOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.passive.rulesManagement.enabledRules}
                value={rules.filter(r => r.enabled).length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.passive.rulesManagement.builtinRules}
                value={rules.filter(r => r.isBuiltin).length}
                prefix={<SecurityScanOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t.security.passive.rulesManagement.customRules}
                value={rules.filter(r => !r.isBuiltin).length}
                prefix={<BugOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 规则列表 */}
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>
              {t.security.passive.rulesManagement.showRules.replace('{count}', filteredRules.length.toString()).replace('{total}', rules.length.toString())}
              {ruleSearchText && t.security.passive.searchResults.replace('{search}', ruleSearchText)}
            </Text>
          </div>
          
          <Table
            columns={ruleColumns}
            dataSource={filteredRules}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} rules`,
            }}
            scroll={{ x: 800 }}
            expandable={{
              expandIcon: ({ expanded, onExpand, record }) => 
                expanded ? (
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<DownOutlined />} 
                    onClick={(e) => onExpand(record, e)}
                  />
                ) : (
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<RightOutlined />} 
                    onClick={(e) => onExpand(record, e)}
                  />
                ),
              expandedRowRender: (record: DetectionRule) => (
                <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong>{t.security.passive.rulesManagement.regularExpression}:</Text>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          backgroundColor: '#f5f5f5', 
                          padding: '8px', 
                          borderRadius: '4px',
                          marginTop: '4px',
                          fontSize: '12px'
                        }}>
                          {record.pattern}
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong>{t.security.passive.rulesManagement.threatType}:</Text>
                        <div>{record.threatType}</div>
                      </div>
                      {record.tags && record.tags.length > 0 && (
                        <div>
                          <Text strong>{t.security.passive.rulesManagement.tags}:</Text>
                          <div style={{ marginTop: '4px' }}>
                            {record.tags.map(tag => (
                              <Tag key={tag} style={{ fontSize: '11px' }}>{tag}</Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </Col>
                    <Col span={12}>
                      {record.recommendation && (
                        <div style={{ marginBottom: 12 }}>
                          <Text strong>{t.security.passive.rulesManagement.securityRecommendation}</Text>
                          <div style={{ fontSize: '12px', color: '#666' }}>{record.recommendation}</div>
                        </div>
                      )}
                      {record.remediation && (
                        <div style={{ marginBottom: 12 }}>
                          <Text strong>{t.security.passive.rulesManagement.remediationSuggestion}</Text>
                          <div style={{ fontSize: '12px', color: '#666' }}>{record.remediation}</div>
                        </div>
                      )}
                      <div>
                        <Text strong>{t.security.passive.rulesManagement.updateTime}</Text>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(record.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              ),
            }}
          />
              </Card>

      {/* 规则编辑器Modal */}
      <Modal
        title={isEditingRule ? t.security.passive.rulesManagement.edit : t.security.passive.rulesManagement.newRule}
        open={showRuleEditor}
        onCancel={() => setShowRuleEditor(false)}
        onOk={handleSaveRule}
        width={800}
        okText={t.common.save}
        cancelText={t.common.cancel}
      >
        <Form
          form={ruleForm}
          layout="vertical"
          initialValues={{
            enabled: true,
            flags: 'gi',
            scope: 'both',
            riskLevel: 'medium',
            category: 'security',
            maxMatches: 10,
            maskSensitiveData: false
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={t.security.passive.rulesManagement.ruleName}
                name="name"
                rules={[{ required: true, message: t.security.passive.rulesManagement.ruleName }]}
              >
                <Input placeholder={t.security.passive.rulesManagement.ruleName} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t.security.passive.rulesManagement.threatType}
                name="threatType"
                rules={[{ required: true, message: t.security.passive.rulesManagement.threatType }]}
              >
                <Input placeholder={t.security.passive.rulesManagement.threatTypePlaceholder} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={t.security.passive.rulesManagement.ruleDescription}
            name="description"
            rules={[{ required: true, message: t.security.passive.rulesManagement.ruleDescription }]}
          >
            <TextArea 
              rows={2} 
              placeholder={t.security.passive.rulesManagement.ruleDescription} 
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                {t.security.passive.rulesManagement.regularExpression}
                <Tooltip title={t.security.passive.rulesManagement.regularExpressionTooltip}>
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
            name="pattern"
            rules={[{ required: true, message: t.security.passive.rulesManagement.regularExpression }]}
          >
            <TextArea 
              rows={3} 
              placeholder={t.security.passive.rulesManagement.regularExpressionPlaceholder} 
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={t.security.passive.rulesManagement.category}
                name="category"
              >
                <Select>
                  <Option value="security">{t.security.passive.rulesManagement.security}</Option>
                  <Option value="privacy">{t.security.passive.rulesManagement.privacy}</Option>
                  <Option value="compliance">{t.security.passive.rulesManagement.compliance}</Option>
                  <Option value="data_quality">{t.security.passive.rulesManagement.dataQuality}</Option>
                  <Option value="performance">{t.security.passive.rulesManagement.performance}</Option>
                  <Option value="custom">{t.security.passive.rulesManagement.custom}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={t.security.passive.rulesManagement.riskLevel}
                name="riskLevel"
              >
                <Select>
                  <Option value="critical">{t.security.riskLevels.critical}</Option>
                  <Option value="high">{t.security.riskLevels.high}</Option>
                  <Option value="medium">{t.security.riskLevels.medium}</Option>
                  <Option value="low">{t.security.riskLevels.low}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={t.security.passive.rulesManagement.scope}
                name="scope"
              >
                <Select>
                  <Option value="parameters">{t.security.passive.rulesManagement.input}</Option>
                  <Option value="output">{t.security.passive.rulesManagement.output}</Option>
                  <Option value="both">{t.security.passive.rulesManagement.both}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label={t.security.passive.rulesManagement.flags}
                name="flags"
              >
                <Input placeholder={t.security.passive.rulesManagement.flagsPlaceholder} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={t.security.passive.rulesManagement.maxMatches}
                name="maxMatches"
              >
                <Input type="number" min={1} max={100} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="enabled" valuePropName="checked">
                <Checkbox>{t.security.passive.rulesManagement.enableRule}</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maskSensitiveData" valuePropName="checked">
                <Checkbox>{t.security.passive.rulesManagement.maskSensitiveData}</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={t.security.passive.rulesManagement.captureGroups}
            name="captureGroups"
            extra={t.security.passive.rulesManagement.captureGroupsExtra}
          >
            <Input placeholder={t.security.passive.rulesManagement.captureGroupsPlaceholder} />
          </Form.Item>

          <Form.Item
            label={t.security.passive.rulesManagement.tags}
            name="tags"
            extra={t.security.passive.rulesManagement.tagsExtra}
          >
            <Input placeholder={t.security.passive.rulesManagement.tagsPlaceholder} />
          </Form.Item>

          <Form.Item
            label={t.security.passive.rulesManagement.securityAdvice}
            name="recommendation"
          >
            <TextArea 
              rows={2} 
              placeholder={t.security.passive.rulesManagement.securityAdvicePlaceholder} 
            />
          </Form.Item>

          <Form.Item
            label={t.security.passive.rulesManagement.remediationAdvice}
            name="remediation"
          >
            <TextArea 
              rows={2} 
              placeholder={t.security.passive.rulesManagement.remediationAdvicePlaceholder} 
            />
          </Form.Item>

          <Form.Item
            label={t.security.passive.rulesManagement.references}
            name="references"
            extra={t.security.passive.rulesManagement.referencesExtra}
          >
            <TextArea 
              rows={2} 
              placeholder={t.security.passive.rulesManagement.referencesPlaceholder} 
            />
          </Form.Item>

          {/* 规则测试区域 */}
          <Divider>{t.security.passive.rulesManagement.ruleTest}</Divider>
          
          <Form.Item
            label={t.security.passive.rulesManagement.testInput}
            extra={t.security.passive.rulesManagement.testInputExtra}
          >
            <TextArea
              rows={3}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder={t.security.passive.rulesManagement.testInputPlaceholder}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                icon={<BugOutlined />} 
                onClick={handleTestRule}
              >
                {t.security.passive.rulesManagement.testRule}
              </Button>
              
              {testMatchResult && (
                <div>
                  {testMatchResult.isMatched ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>{t.security.passive.rulesManagement.matched}</Tag>
                  ) : (
                    <Tag color="red" icon={<ExclamationCircleOutlined />}>{t.security.passive.rulesManagement.notMatched}</Tag>
                  )}
                </div>
              )}
              
              {testResults && !testResults.valid && (
                <div>
                  <Tag color="orange" icon={<WarningOutlined />}>{t.security.passive.rulesManagement.ruleSyntaxError}</Tag>
                </div>
              )}
            </Space>
          </Form.Item>

          {testResults && !testResults.valid && (
            <Alert
              type="error"
              message={t.security.passive.rulesManagement.ruleValidationFailed}
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {testResults.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              }
              style={{ marginTop: 8 }}
            />
          )}

          {testResults && testResults.warnings && testResults.warnings.length > 0 && (
            <Alert
              type="warning"
              message={t.security.passive.rulesManagement.notes}
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {testResults.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              }
              style={{ marginTop: 8 }}
            />
          )}
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title={t.security.passive.details}
        placement="right"
        onClose={() => setShowDetail(false)}
        open={showDetail}
        width={600}
      >
        {selectedResult && (
          <div>
            <Timeline>
              <Timeline.Item 
                color="blue" 
                dot={<ClockCircleOutlined />}
              >
                <div>
                  <Text strong>{t.security.passive.detectionTime}</Text>
                  <div>{new Date(selectedResult.timestamp).toLocaleString()}</div>
                </div>
              </Timeline.Item>
              
              <Timeline.Item 
                color="green" 
                dot={getTypeIcon(selectedResult.type)}
              >
                <div>
                  <Text strong>{t.security.passive.callType}</Text>
                  <div>{getTypeText(selectedResult.type)}</div>
                </div>
              </Timeline.Item>
              
              <Timeline.Item 
                color="orange" 
                dot={<AlertOutlined />}
              >
                <div>
                  <Text strong>{t.security.passive.targetName}</Text>
                  <div>{selectedResult.targetName}</div>
                </div>
              </Timeline.Item>
              
              <Timeline.Item 
                color={getRiskLevelColor(selectedResult.riskLevel)} 
                dot={<WarningOutlined />}
              >
                <div>
                  <Text strong>{t.security.riskLevel}</Text>
                  <div>
                    <Tag color={getRiskLevelColor(selectedResult.riskLevel)}>
                      {getRiskLevelText(selectedResult.riskLevel)}
                    </Tag>
                  </div>
                </div>
              </Timeline.Item>
            </Timeline>

            <Divider>{t.security.passive.threatDetails}</Divider>
            
            {selectedResult.threats.map((threat, index) => (
              <Card 
                key={index} 
                size="small" 
                style={{ marginBottom: 16 }}
                title={threat.type}
              >
                <Paragraph>{threat.description}</Paragraph>
                
                {threat.evidence && (
                  <div>
                    <Text strong>{t.security.passive.evidence}</Text>
                    <div style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}>
                      {threat.evidence}
                    </div>
                  </div>
                )}
                
                <div style={{ marginTop: 12 }}>
                  <Text strong>{t.security.passive.threatLevel}</Text>
                  <Tag color={getRiskLevelColor(threat.severity)} style={{ marginLeft: 8 }}>
                    {getRiskLevelText(threat.severity)}
                  </Tag>
                </div>
              </Card>
            ))}

            {selectedResult.sensitiveDataLeaks.length > 0 && (
              <>
                <Divider>{t.security.passive.sensitiveDataLeaks}</Divider>
                {selectedResult.sensitiveDataLeaks.map((leak, index) => (
                  <Alert
                    key={index}
                    type="error"
                    message={leak.type}
                    description={
                      <div>
                        <div>{t.security.passive.content} {leak.content}</div>
                        <Tag color={getRiskLevelColor(leak.severity)} style={{ marginTop: 4 }}>
                          {getRiskLevelText(leak.severity)}
                        </Tag>
                      </div>
                    }
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

  // 表格列定义
  const columns = [
    {
      title: t.security.passive.detectionTime,
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (timestamp: string) => (
        <div>
          <div>{new Date(timestamp).toLocaleDateString()}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {new Date(timestamp).toLocaleTimeString()}
          </Text>
        </div>
      ),
    },
    {
      title: t.security.passive.callType,
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Space>
          {getTypeIcon(type)}
          <Text>{getTypeText(type)}</Text>
        </Space>
      ),
    },
    {
      title: t.security.passive.targetName,
      dataIndex: 'targetName',
      key: 'targetName',
      ellipsis: true,
      render: (name: string) => (
        <Tooltip title={name}>
          <Text>{name}</Text>
        </Tooltip>
      ),
    },
    {
      title: t.security.riskLevel,
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      render: (level: SecurityRiskLevel) => (
        <Tag color={getRiskLevelColor(level)}>
          {getRiskLevelText(level)}
        </Tag>
      ),
    },
    {
      title: t.security.passive.threatCount,
      dataIndex: 'threats',
      key: 'threatCount',
      width: 80,
      render: (threats: any[]) => (
        <Badge count={threats.length} style={{ backgroundColor: '#ff7a45' }} />
      ),
    },
    {
      title: t.security.passive.sensitiveData,
      dataIndex: 'sensitiveDataLeaks',
      key: 'sensitiveCount',
      width: 80,
      render: (leaks: any[]) => (
        <Badge count={leaks.length} style={{ backgroundColor: '#ff4d4f' }} />
      ),
    },
    {
      title: t.security.passive.rulesManagement.actions,
      key: 'actions',
      width: 80,
      render: (_: any, record: PassiveDetectionResult) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedResult(record);
            setShowDetail(true);
          }}
        >
          {t.security.passive.details}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* 控制面板 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <div>
                <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                  <ScanOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  {t.security.passive.title}
                </Title>
                <Text type="secondary">{t.security.passive.subtitle}</Text>
              </div>
              
              <div>
                <Switch
                  checked={isEnabled}
                  onChange={handleToggleDetection}
                  checkedChildren={<><ScanOutlined style={{ marginRight: 4 }} />{t.security.passive.monitoring}</>}
                  unCheckedChildren={t.security.passive.stopped}
                />
              </div>
            </Space>
          </Col>
          
          <Col>
            <Space>
              {results.length > 0 && (
                <>
                  <Button 
                    icon={<DownloadOutlined />} 
                    onClick={handleExportResults}
                  >
                    {t.security.passive.exportResults}
                  </Button>
                  
                  <Button 
                    icon={<DeleteOutlined />} 
                    onClick={handleClearResults}
                    type="text"
                    danger
                  >
                    {t.security.passive.clearRecords}
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区域 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'monitor',
              label: (
                <Space>
                  <ScanOutlined />
                  {t.security.passive.realtimeMonitoring}
                  {results.length > 0 && (
                    <Badge count={results.length} style={{ backgroundColor: '#1890ff' }} />
                  )}
                </Space>
              ),
              children: renderMonitorContent()
            },
            {
              key: 'rules',
              label: (
                <Space>
                  <SettingOutlined />
                  {t.security.passive.detectionRules}
                  <Badge count={rules.filter(r => r.enabled).length} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              ),
              children: renderRulesManagement()
            }
          ]}
        />
      </Card>
    </div>
  );
}; 