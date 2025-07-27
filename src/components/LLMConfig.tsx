import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Space,
  Table,
  Modal,
  message,
  Popconfirm,
  Tag,
  Typography,
  Divider,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { LLMConfig, LLMType } from '../types/mcp';
import { useI18n } from '../hooks/useI18n';
import { getLLMConfigs, saveLLMConfig, deleteLLMConfig, testLLMConnection } from '../utils/storage';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface LLMConfigProps {
  onConfigChange?: (configs: LLMConfig[]) => void;
}

const LLMConfigComponent: React.FC<LLMConfigProps> = ({ onConfigChange }) => {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [endpointHelpText, setEndpointHelpText] = useState<string>(t.llm.endpointHelpDefault);
  const [endpointPlaceholder, setEndpointPlaceholder] = useState<string>(t.llm.endpointPlaceholder);

  // LLM类型选项
  const llmTypeOptions = [
    { value: 'openai', label: t.llm.types.openai },
    { value: 'claude', label: t.llm.types.claude },
    { value: 'gemini', label: t.llm.types.gemini },
    { value: 'ollama', label: t.llm.types.ollama },
    { value: 'custom', label: t.llm.types.custom }
  ];

  // 预定义模型选项
  const modelOptions: Record<LLMType, string[]> = {
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    claude: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    gemini: ['gemini-pro', 'gemini-pro-vision'],
    ollama: ['llama2', 'codellama', 'mistral', 'neural-chat'],
    custom: []
  };

  // 默认完整端点
  const defaultEndpoints: Record<LLMType, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    claude: 'https://api.anthropic.com/v1/messages',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    ollama: 'http://localhost:11434/api/chat',
    custom: ''
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const savedConfigs = await getLLMConfigs();
      setConfigs(savedConfigs);
      onConfigChange?.(savedConfigs);
    } catch (error) {
      console.error('加载LLM配置失败:', error);
    }
  };

  const showModal = (config?: LLMConfig) => {
    if (config) {
      setEditingConfig(config);
      form.setFieldsValue({
        ...config,
        customHeaders: config.customHeaders ? Object.entries(config.customHeaders).map(([key, value]) => ({ key, value })) : []
      });
      // 设置对应类型的帮助文本，但不覆盖配置值
      setHelpTextForType(config.type);
    } else {
      setEditingConfig(null);
      form.resetFields();
      form.setFieldsValue({
        type: 'openai',
        endpoint: defaultEndpoints.openai,
        model: modelOptions.openai[0],
        maxTokens: 4096,
        temperature: 0.7,
        enabled: true
      });
      // 设置默认类型的帮助文本和placeholder
      setEndpointHelpText(t.llm.endpointHelpOpenAI);
      setEndpointPlaceholder(defaultEndpoints.openai);
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingConfig(null);
    form.resetFields();
  };

    // 只设置帮助文本和占位符，不修改表单值（用于编辑模式）
  const setHelpTextForType = (type: LLMType) => {
    let helpText = '';
    let placeholder = '';
    switch (type) {
      case 'openai':
        helpText = t.llm.endpointHelpOpenAI;
        placeholder = defaultEndpoints.openai;
        break;
      case 'custom':
        helpText = t.llm.endpointHelpCustom;
        placeholder = 'https://your-api.com/v1/chat/completions';
        break;
      case 'claude':
        helpText = t.llm.endpointHelpClaude;
        placeholder = defaultEndpoints.claude;
        break;
      case 'gemini':
        helpText = t.llm.endpointHelpGemini;
        placeholder = defaultEndpoints.gemini;
        break;
      case 'ollama':
        helpText = t.llm.endpointHelpOllama;
        placeholder = defaultEndpoints.ollama;
        break;
    }

    setEndpointHelpText(helpText);
    setEndpointPlaceholder(placeholder);
  };

  const handleTypeChange = (type: LLMType) => {
    const currentEndpoint = form.getFieldValue('endpoint');
    const defaultEndpoint = defaultEndpoints[type];
    const model = modelOptions[type][0] || '';
    
    // 只有在当前endpoint为空或者是其他类型的默认值时，才自动设置新的默认endpoint
    const shouldUpdateEndpoint = !currentEndpoint || 
      Object.values(defaultEndpoints).includes(currentEndpoint);
    
    form.setFieldsValue({
      ...(shouldUpdateEndpoint && { endpoint: defaultEndpoint }),
      model
    });
    
    // 设置帮助文本
    setHelpTextForType(type);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理自定义头部
      const customHeaders: Record<string, string> = {};
      if (values.customHeaders) {
        values.customHeaders.forEach((header: any) => {
          if (header.key && header.value) {
            customHeaders[header.key] = header.value;
          }
        });
      }

      const config: LLMConfig = {
        id: editingConfig?.id || `llm_${Date.now()}`,
        name: values.name,
        type: values.type,
        endpoint: values.endpoint,
        apiKey: values.apiKey,
        model: values.model,
        maxTokens: values.maxTokens,
        temperature: values.temperature,
        customHeaders: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
        enabled: values.enabled,
        description: values.description
      };

      await saveLLMConfig(config);
      await loadConfigs();
      setIsModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      message.success(editingConfig ? t.llm.configUpdated : t.llm.configSaved);
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error(t.llm.saveConfigFailed);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLLMConfig(id);
      await loadConfigs();
      message.success(t.llm.configDeleted);
    } catch (error) {
      console.error('删除配置失败:', error);
      message.error(t.errors.loadConfigFailed);
    }
  };

  const handleTest = async (config: LLMConfig) => {
    setTesting(config.id);
    try {
      await testLLMConnection(config);
      message.success(t.llm.connectionTestSuccess);
    } catch (error) {
      console.error('连接测试失败:', error);
      message.error(`${t.llm.connectionTestFailed}: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setTesting(null);
    }
  };

  const toggleEnabled = async (config: LLMConfig) => {
    try {
      const updatedConfig = { ...config, enabled: !config.enabled };
      await saveLLMConfig(updatedConfig);
      await loadConfigs();
      message.success(updatedConfig.enabled ? t.llm.configEnabled : t.llm.configDisabled);
    } catch (error) {
      console.error('更新配置失败:', error);
      message.error(t.llm.saveConfigFailed);
    }
  };

  const columns = [
    {
      title: t.llm.name,
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: LLMConfig) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: t.llm.type,
      dataIndex: 'type',
      key: 'type',
      render: (type: LLMType) => {
        const colors: Record<LLMType, string> = {
          openai: 'blue',
          claude: 'purple',
          gemini: 'green',
          ollama: 'orange',
          custom: 'gray'
        };
        return <Tag color={colors[type]}>{llmTypeOptions.find(opt => opt.value === type)?.label}</Tag>;
      },
    },
    {
      title: t.llm.endpointUrl,
      dataIndex: 'endpoint',
      key: 'endpoint',
      render: (endpoint: string) => (
        <Text style={{ fontSize: '12px', color: '#666' }}>
          {endpoint.length > 40 ? `${endpoint.substring(0, 40)}...` : endpoint}
        </Text>
      ),
    },
    {
      title: t.llm.model,
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: t.llm.status,
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: LLMConfig) => (
        <Switch
          checked={enabled}
          onChange={() => toggleEnabled(record)}
          checkedChildren={t.llm.enabled}
          unCheckedChildren={t.llm.disabled}
        />
      ),
    },
    {
      title: t.llm.actions,
      key: 'actions',
      render: (_: any, record: LLMConfig) => (
        <Space>
          <Button
            type="link"
            icon={<ThunderboltOutlined />}
            loading={testing === record.id}
            onClick={() => handleTest(record)}
            size="small"
          >
            {t.llm.testConnection}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            size="small"
          >
            {t.llm.editConfig}
          </Button>
          <Popconfirm
            title={t.llm.confirmDelete}
            onConfirm={() => handleDelete(record.id)}
            okText={t.common.ok}
            cancelText={t.common.cancel}
          >
            <Button
              type="link"
              icon={<DeleteOutlined />}
              danger
              size="small"
            >
              {t.llm.deleteConfig}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>{t.llm.title}</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              {t.llm.addConfig}
            </Button>
          </div>
        }
      >
        <Table
          dataSource={configs}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>

      <Modal
        title={editingConfig ? t.llm.editLLMConfig : t.llm.addLLMConfig}
        open={isModalVisible}
        onCancel={handleCancel}
        width={800}
        footer={[
          <Button key="cancel" onClick={handleCancel} icon={<CloseOutlined />}>
            {t.common.cancel}
          </Button>,
          <Button key="save" type="primary" onClick={handleSave} icon={<SaveOutlined />}>
            {t.common.save}
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'openai',
            maxTokens: 4096,
            temperature: 0.7,
            enabled: true
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
                          <Form.Item
              label={t.llm.configName}
              name="name"
              rules={[{ required: true, message: t.llm.configNameRequired }]}
            >
              <Input placeholder={t.llm.configNamePlaceholder} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={t.llm.modelType}
              name="type"
              rules={[{ required: true, message: t.llm.modelTypeRequired }]}
            >
              <Select onChange={handleTypeChange} options={llmTypeOptions} />
            </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={t.llm.endpoint}
            name="endpoint"
            rules={[{ required: true, message: t.llm.endpointRequired }]}
            help={endpointHelpText}
          >
            <Input 
              placeholder={endpointPlaceholder}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
                          <Form.Item
              label={t.llm.modelName}
              name="model"
              rules={[{ required: true, message: t.llm.modelNameRequired }]}
            >
              <Input placeholder={t.llm.modelNamePlaceholder} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={t.llm.apiKey}
              name="apiKey"
            >
              <Input.Password placeholder={t.llm.apiKeyPlaceholder} />
            </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
                          <Form.Item
              label={t.llm.maxTokens}
              name="maxTokens"
            >
              <InputNumber min={1} max={32000} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={t.llm.temperature}
              name="temperature"
            >
              <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={t.llm.enabled}
              name="enabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={t.llm.description}
            name="description"
          >
            <TextArea rows={2} placeholder={t.llm.descriptionPlaceholder} />
          </Form.Item>

          <Divider>{t.llm.customHeaders}</Divider>
          <Form.List name="customHeaders">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} align="middle">
                    <Col span={10}>
                                          <Form.Item
                      {...restField}
                      name={[name, 'key']}
                      rules={[{ required: true, message: t.llm.headerNameRequired }]}
                    >
                      <Input placeholder={t.llm.headerName} />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item
                      {...restField}
                      name={[name, 'value']}
                      rules={[{ required: true, message: t.llm.headerValueRequired }]}
                    >
                      <Input placeholder={t.llm.headerValue} />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Button type="link" onClick={() => remove(name)} danger>
                      {t.llm.deleteHeader}
                    </Button>
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    {t.llm.addCustomHeader}
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default LLMConfigComponent; 