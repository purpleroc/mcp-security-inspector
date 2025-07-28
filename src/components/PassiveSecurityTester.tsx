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
          content: `检测到${getRiskLevelText(result.riskLevel)}风险: ${result.targetName}`,
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
      console.error('加载检测规则失败:', error);
      message.error('加载检测规则失败');
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
      message.success('被动检测已禁用');
    } else {
      mcpClient.enablePassiveDetection(config);
      setIsEnabled(true);
      message.success('被动检测已启用');
    }
  };

  // 清空结果
  const handleClearResults = () => {
    mcpClient.clearPassiveDetectionResults();
    setResults([]);
    setFilteredResults([]);
    setStats({ total: 0, critical: 0, high: 0, medium: 0, low: 0, today: 0, thisHour: 0 });
    message.success('检测记录已清空');
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
    
    message.success('检测结果已导出');
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
      case 'critical': return '严重';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '未知';
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
      case 'tool': return '工具调用';
      case 'resource': return '资源访问';
      case 'prompt': return '提示处理';
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
        message.success('规则更新成功');
      } else {
        detectionEngine.addCustomRule(ruleData);
        message.success('规则创建成功');
      }

      await loadRules();
      setShowRuleEditor(false);
    } catch (error) {
      message.error(`保存规则失败: ${(error as Error).message}`);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个规则吗？此操作不可撤销。',
      onOk: async () => {
        try {
          const detectionEngine = DetectionEngine.getInstance();
          detectionEngine.removeRule(ruleId);
          await loadRules();
          message.success('规则删除成功');
        } catch (error) {
          message.error(`删除规则失败: ${(error as Error).message}`);
        }
      }
    });
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const detectionEngine = DetectionEngine.getInstance();
      detectionEngine.toggleRule(ruleId, enabled);
      await loadRules();
      message.success(`规则已${enabled ? '启用' : '禁用'}`);
    } catch (error) {
      message.error(`切换规则状态失败: ${(error as Error).message}`);
    }
  };

  const handleTestRule = async () => {
    if (!testInput.trim()) {
      message.warning('请输入测试内容');
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
            message: matches ? '规则匹配了输入内容' : '规则未匹配输入内容'
          };
          
          // 显示测试结果消息
          if (matches) {
            message.success('测试成功：规则匹配了输入内容');
          } else {
            message.info('测试完成：规则未匹配输入内容');
          }
        } catch (error) {
          matchResult = {
            isMatched: false,
            message: '正则表达式执行失败'
          };
          message.error('正则表达式执行失败');
        }
      } else if (!validation.valid) {
        // 规则无效时，不进行匹配测试
        matchResult = null;
        message.error('规则语法错误，请检查后重试');
      }

      setTestResults(validation);
      setTestMatchResult(matchResult);

    } catch (error) {
      message.error('测试规则失败');
    }
  };

  const handleExportRules = () => {
    let selectedExportType = 'all';
    
    Modal.confirm({
      title: '选择导出类型',
      content: (
        <div>
          <p>请选择要导出的规则类型：</p>
          <Radio.Group 
            defaultValue="all" 
            onChange={(e) => { selectedExportType = e.target.value; }}
          >
            <div style={{ marginBottom: 8 }}>
              <Radio value="all">所有规则（包括内置规则）</Radio>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Radio value="custom">仅自定义规则</Radio>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Radio value="enabled">仅启用的规则</Radio>
            </div>
          </Radio.Group>
        </div>
      ),
      onOk: () => {
        performExport(selectedExportType);
      },
      okText: '导出',
      cancelText: '取消'
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
        message.warning('没有符合条件的规则可导出');
        return;
      }

      const rulesJson = JSON.stringify(rulesToExport, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(rulesJson);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', fileName);
      linkElement.click();
      
      message.success(`成功导出 ${rulesToExport.length} 条规则`);
    } catch (error) {
      message.error('导出规则失败');
    }
  };

  const handleImportRules = () => {
    Modal.confirm({
      title: '导入检测规则',
      width: 700,
      content: (
        <div>
          <Alert
            type="info"
            message="规则格式说明"
            description={
              <div>
                <p>请选择包含规则数组的JSON文件。文件格式示例：</p>
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
    "name": "自定义密码检测",
    "description": "检测密码泄漏模式",
    "category": "privacy",
    "enabled": true,
    "pattern": "(password|pwd)\\\\s*[:=]\\\\s*([^\\\\s]+)",
    "flags": "gi",
    "scope": "both",
    "riskLevel": "high",
    "threatType": "密码泄漏",
    "captureGroups": ["password"],
    "maskSensitiveData": true,
    "maxMatches": 5,
    "isBuiltin": false,
    "tags": ["password", "credentials"],
    "recommendation": "立即更换密码",
    "remediation": "使用安全的密码存储方式",
    "references": ["https://owasp.org/..."]
  }
]`}
                </div>
                <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                  <p><strong>必填字段：</strong>id, name, description, pattern, category, riskLevel, threatType</p>
                  <p><strong>分类：</strong>security(安全)、privacy(隐私)、compliance(合规)、data_quality(质量)、performance(性能)</p>
                  <p><strong>风险等级：</strong>critical(严重)、high(高)、medium(中)、low(低)</p>
                  <p><strong>检测范围：</strong>parameters(仅输入)、output(仅输出)、both(全部)</p>
                </div>
              </div>
            }
            style={{ marginBottom: 16 }}
          />
          <p>点击确定选择要导入的JSON文件：</p>
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
                throw new Error('JSON格式错误，请检查文件格式');
              }

              // 验证是否为数组
              if (!Array.isArray(importedData)) {
                throw new Error('文件必须包含规则数组，请检查文件格式');
              }

              if (importedData.length === 0) {
                message.warning('文件中没有找到规则');
                return;
              }

              // 导入规则
              detectionEngine.importRules(content);
              await loadRules();
              message.success(`成功导入 ${importedData.length} 条规则`);
            } catch (error) {
              message.error(`导入规则失败: ${(error as Error).message}`);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      },
      okText: '选择文件',
      cancelText: '取消'
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
              title="总检测次数"
              value={stats.total}
              prefix={<SecurityScanOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="严重风险"
              value={stats.critical}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日检测"
              value={stats.today}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="当前小时"
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
              placeholder="搜索目标名称或威胁描述..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          
          <Col>
            <Space>
              <Text>风险等级:</Text>
              <Select
                value={filterLevel}
                onChange={setFilterLevel}
                style={{ width: 120 }}
              >
                <Option value="all">全部</Option>
                <Option value="critical">严重</Option>
                <Option value="high">高</Option>
                <Option value="medium">中</Option>
                <Option value="low">低</Option>
              </Select>
            </Space>
          </Col>
          
          <Col>
            <Space>
              <Text>调用类型:</Text>
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: 120 }}
              >
                <Option value="all">全部</Option>
                <Option value="tool">工具</Option>
                <Option value="resource">资源</Option>
                <Option value="prompt">提示</Option>
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
              <Title level={4}>被动检测未启用</Title>
              <Paragraph>
                启用被动检测后，系统将自动监控您的MCP操作并进行安全分析，
                包括工具调用、资源访问和提示处理的安全检测。
              </Paragraph>
            </div>
          }
        />
      ) : isEnabled && filteredResults.length === 0 ? (
        <Empty
          image={<ScanOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
          description={
            <div>
              <Title level={4}>等待检测结果</Title>
              <Paragraph>
                被动检测已启用，正在监控您的MCP操作...
                <br />
                当您使用工具、访问资源或处理提示时，检测结果将在此显示。
              </Paragraph>
            </div>
          }
        />
      ) : (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>
              显示 {filteredResults.length} / {results.length} 条检测记录
              {searchText && ` (搜索: "${searchText}")`}
            </Text>
            
            <Space>
              <Tooltip title={realtimeEnabled ? '禁用实时通知' : '启用实时通知'}>
                <Button
                  type="text"
                  icon={realtimeEnabled ? <BugOutlined /> : <BugOutlined style={{ opacity: 0.5 }} />}
                  onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                />
              </Tooltip>
              
              <Tooltip title="刷新">
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
              showTotal: (total) => `共 ${total} 条记录`,
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
        title: '规则名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        render: (name: string, record: DetectionRule) => (
          <div>
            <Text strong style={{ display: 'flex', alignItems: 'center' }}>
              {record.isBuiltin && <Tag color="blue" style={{ marginRight: 4, fontSize: '11px' }}>内置</Tag>}
              {name}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
          </div>
        ),
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        width: 100,
        render: (category: DetectionRuleCategory) => {
          const categoryMap = {
            security: { color: '#ff4d4f', text: '安全' },
            privacy: { color: '#fa8c16', text: '隐私' },
            compliance: { color: '#1890ff', text: '合规' },
            data_quality: { color: '#52c41a', text: '质量' },
            performance: { color: '#722ed1', text: '性能' },
            custom: { color: '#8c8c8c', text: '自定义' }
          };
          const config = categoryMap[category] || categoryMap.custom;
          return <Tag color={config.color}>{config.text}</Tag>;
        },
      },
      {
        title: '风险等级',
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
        title: '作用域',
        dataIndex: 'scope',
        key: 'scope',
        width: 80,
        render: (scope: DetectionScope) => {
          const scopeMap = {
            parameters: '输入',
            output: '输出',
            both: '全部'
          };
          return <Tag>{scopeMap[scope]}</Tag>;
        },
      },
      {
        title: '状态',
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
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_: any, record: DetectionRule) => (
          <Space size="small">
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => handleEditRule(record)}
              />
            </Tooltip>
            {!record.isBuiltin && (
              <Tooltip title="删除">
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
                    placeholder="搜索规则名称、描述或标签..."
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
                    <Option value="all">全部分类</Option>
                    <Option value="security">安全</Option>
                    <Option value="privacy">隐私</Option>
                    <Option value="compliance">合规</Option>
                    <Option value="data_quality">质量</Option>
                    <Option value="performance">性能</Option>
                    <Option value="custom">自定义</Option>
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
                  新建规则
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={handleExportRules}
                >
                  导出规则
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={handleImportRules}
                >
                  导入规则
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
                title="总规则数"
                value={rules.length}
                prefix={<SettingOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="启用规则"
                value={rules.filter(r => r.enabled).length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="内置规则"
                value={rules.filter(r => r.isBuiltin).length}
                prefix={<SecurityScanOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="自定义规则"
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
              显示 {filteredRules.length} / {rules.length} 条规则
              {ruleSearchText && ` (搜索: "${ruleSearchText}")`}
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
              showTotal: (total) => `共 ${total} 条规则`,
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
                        <Text strong>正则表达式:</Text>
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
                        <Text strong>威胁类型:</Text>
                        <div>{record.threatType}</div>
                      </div>
                      {record.tags && record.tags.length > 0 && (
                        <div>
                          <Text strong>标签:</Text>
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
                          <Text strong>安全建议:</Text>
                          <div style={{ fontSize: '12px', color: '#666' }}>{record.recommendation}</div>
                        </div>
                      )}
                      {record.remediation && (
                        <div style={{ marginBottom: 12 }}>
                          <Text strong>修复建议:</Text>
                          <div style={{ fontSize: '12px', color: '#666' }}>{record.remediation}</div>
                        </div>
                      )}
                      <div>
                        <Text strong>更新时间:</Text>
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
        title={isEditingRule ? '编辑规则' : '新建规则'}
        open={showRuleEditor}
        onCancel={() => setShowRuleEditor(false)}
        onOk={handleSaveRule}
        width={800}
        okText="保存"
        cancelText="取消"
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
                label="规则名称"
                name="name"
                rules={[{ required: true, message: '请输入规则名称' }]}
              >
                <Input placeholder="请输入规则名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="威胁类型"
                name="threatType"
                rules={[{ required: true, message: '请输入威胁类型' }]}
              >
                <Input placeholder="如：命令注入、XSS攻击等" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="规则描述"
            name="description"
            rules={[{ required: true, message: '请输入规则描述' }]}
          >
            <TextArea 
              rows={2} 
              placeholder="请简要描述此规则的检测目标和作用" 
            />
          </Form.Item>

          <Form.Item
            label={
              <Space>
                正则表达式
                <Tooltip title="用于匹配威胁模式的正则表达式，支持JavaScript正则语法">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
            name="pattern"
            rules={[{ required: true, message: '请输入正则表达式' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="请输入正则表达式模式，如：(password|pwd)\\s*[:=]\\s*([^\\s]+)" 
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="分类"
                name="category"
              >
                <Select>
                  <Option value="security">安全威胁</Option>
                  <Option value="privacy">隐私泄漏</Option>
                  <Option value="compliance">合规检查</Option>
                  <Option value="data_quality">数据质量</Option>
                  <Option value="performance">性能问题</Option>
                  <Option value="custom">自定义</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="风险等级"
                name="riskLevel"
              >
                <Select>
                  <Option value="critical">严重</Option>
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="检测范围"
                name="scope"
              >
                <Select>
                  <Option value="parameters">仅输入参数</Option>
                  <Option value="output">仅输出结果</Option>
                  <Option value="both">输入和输出</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="正则标志"
                name="flags"
              >
                <Input placeholder="如：gi (全局、忽略大小写)" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="最大匹配数"
                name="maxMatches"
              >
                <Input type="number" min={1} max={100} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="enabled" valuePropName="checked">
                <Checkbox>启用规则</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maskSensitiveData" valuePropName="checked">
                <Checkbox>遮蔽敏感数据</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="捕获组名称"
            name="captureGroups"
            extra="如果正则表达式包含捕获组，请用逗号分隔各组的名称"
          >
            <Input placeholder="如：password,username" />
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
            extra="用逗号分隔多个标签，便于规则分类和搜索"
          >
            <Input placeholder="如：injection,sql,database" />
          </Form.Item>

          <Form.Item
            label="安全建议"
            name="recommendation"
          >
            <TextArea 
              rows={2} 
              placeholder="当检测到威胁时给用户的安全建议" 
            />
          </Form.Item>

          <Form.Item
            label="修复建议"
            name="remediation"
          >
            <TextArea 
              rows={2} 
              placeholder="具体的修复措施和最佳实践" 
            />
          </Form.Item>

          <Form.Item
            label="参考资料"
            name="references"
            extra="每行一个URL，提供相关的安全知识和资料链接"
          >
            <TextArea 
              rows={2} 
              placeholder="https://owasp.org/..." 
            />
          </Form.Item>

          {/* 规则测试区域 */}
          <Divider>规则测试</Divider>
          
          <Form.Item
            label="测试输入"
            extra="输入一些文本来测试你的正则表达式是否能正确匹配"
          >
            <TextArea
              rows={3}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="输入测试内容..."
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                icon={<BugOutlined />} 
                onClick={handleTestRule}
              >
                测试规则
              </Button>
              
              {testMatchResult && (
                <div>
                  {testMatchResult.isMatched ? (
                    <Tag color="green" icon={<CheckCircleOutlined />}>已匹配</Tag>
                  ) : (
                    <Tag color="red" icon={<ExclamationCircleOutlined />}>未匹配</Tag>
                  )}
                </div>
              )}
              
              {testResults && !testResults.valid && (
                <div>
                  <Tag color="orange" icon={<WarningOutlined />}>规则语法错误</Tag>
                </div>
              )}
            </Space>
          </Form.Item>

          {testResults && !testResults.valid && (
            <Alert
              type="error"
              message="规则验证失败"
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
              message="注意事项"
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
        title="检测详情"
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
                  <Text strong>检测时间</Text>
                  <div>{new Date(selectedResult.timestamp).toLocaleString()}</div>
                </div>
              </Timeline.Item>
              
              <Timeline.Item 
                color="green" 
                dot={getTypeIcon(selectedResult.type)}
              >
                <div>
                  <Text strong>调用类型</Text>
                  <div>{getTypeText(selectedResult.type)}</div>
                </div>
              </Timeline.Item>
              
              <Timeline.Item 
                color="orange" 
                dot={<AlertOutlined />}
              >
                <div>
                  <Text strong>目标名称</Text>
                  <div>{selectedResult.targetName}</div>
                </div>
              </Timeline.Item>
              
              <Timeline.Item 
                color={getRiskLevelColor(selectedResult.riskLevel)} 
                dot={<WarningOutlined />}
              >
                <div>
                  <Text strong>风险等级</Text>
                  <div>
                    <Tag color={getRiskLevelColor(selectedResult.riskLevel)}>
                      {getRiskLevelText(selectedResult.riskLevel)}
                    </Tag>
                  </div>
                </div>
              </Timeline.Item>
            </Timeline>

            <Divider>威胁详情</Divider>
            
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
                    <Text strong>证据:</Text>
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
                  <Text strong>威胁等级:</Text>
                  <Tag color={getRiskLevelColor(threat.severity)} style={{ marginLeft: 8 }}>
                    {getRiskLevelText(threat.severity)}
                  </Tag>
                </div>
              </Card>
            ))}

            {selectedResult.sensitiveDataLeaks.length > 0 && (
              <>
                <Divider>敏感数据泄漏</Divider>
                {selectedResult.sensitiveDataLeaks.map((leak, index) => (
                  <Alert
                    key={index}
                    type="error"
                    message={leak.type}
                    description={
                      <div>
                        <div>内容: {leak.content}</div>
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
      title: '时间',
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
      title: '类型',
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
      title: '目标',
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
      title: '风险等级',
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
      title: '威胁数量',
      dataIndex: 'threats',
      key: 'threatCount',
      width: 80,
      render: (threats: any[]) => (
        <Badge count={threats.length} style={{ backgroundColor: '#ff7a45' }} />
      ),
    },
    {
      title: '敏感数据',
      dataIndex: 'sensitiveDataLeaks',
      key: 'sensitiveCount',
      width: 80,
      render: (leaks: any[]) => (
        <Badge count={leaks.length} style={{ backgroundColor: '#ff4d4f' }} />
      ),
    },
    {
      title: '操作',
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
          详情
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
                  被动安全监控
                </Title>
                <Text type="secondary">实时监控MCP调用，自动检测安全风险</Text>
              </div>
              
              <div>
                <Switch
                  checked={isEnabled}
                  onChange={handleToggleDetection}
                  checkedChildren={<><ScanOutlined style={{ marginRight: 4 }} />监控中</>}
                  unCheckedChildren="已停止"
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
                    导出结果
                  </Button>
                  
                  <Button 
                    icon={<DeleteOutlined />} 
                    onClick={handleClearResults}
                    type="text"
                    danger
                  >
                    清空记录
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
                  实时监控
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
                  检测规则
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