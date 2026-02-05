import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Checkbox,
  Space,
  Alert,
  Tag,
  Typography,
  message,
  Badge,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import {
  ToolOutlined,
  FileTextOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  ExpandOutlined,
  CompressOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  CodeOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { callTool, readResource, getPrompt, setTools, setPrompts, setResources, setResourceTemplates } from '../store/mcpSlice';
import { MCPTool, MCPResource, MCPPrompt, SecurityRiskLevel } from '../types/mcp';
import { useI18n } from '../hooks/useI18n';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// 类型选项卡类型
type TabType = 'tools' | 'resources' | 'prompts';

const MCPExplorer: React.FC = () => {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const {
    connectionStatus,
    tools,
    resources,
    resourceTemplates,
    prompts,
    isLoading,
    lastResult,
    lastError,
    securityCheck
  } = useSelector((state: RootState) => state.mcp);

  const [activeTab, setActiveTab] = useState<TabType>('tools');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [selectedResource, setSelectedResource] = useState<MCPResource | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<MCPPrompt | null>(null);
  const [toolParams, setToolParams] = useState<Record<string, any>>({});
  const [resourceParams, setResourceParams] = useState<Record<string, any>>({});
  const [promptParams, setPromptParams] = useState<Record<string, any>>({});
  const [toolResults, setToolResults] = useState<Record<string, any>>({});
  const [resourceResults, setResourceResults] = useState<Record<string, any>>({});
  const [promptResults, setPromptResults] = useState<Record<string, any>>({});
  const [toolErrors, setToolErrors] = useState<Record<string, string>>({});
  const [resourceErrors, setResourceErrors] = useState<Record<string, string>>({});
  const [promptErrors, setPromptErrors] = useState<Record<string, string>>({});
  const [expandedResult, setExpandedResult] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // 监听连接状态变化，切换服务器时清空本地状态
  useEffect(() => {
    if (connectionStatus === 'connecting') {
      setSelectedTool(null);
      setSelectedResource(null);
      setSelectedPrompt(null);
      setToolParams({});
      setResourceParams({});
      setPromptParams({});
      setToolResults({});
      setResourceResults({});
      setPromptResults({});
      setToolErrors({});
      setResourceErrors({});
      setPromptErrors({});
    }
  }, [connectionStatus]);

  // 过滤列表
  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tool.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const allResources = [...resources, ...resourceTemplates];
  const filteredResources = allResources.filter(resource =>
    (resource.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (resource.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (resource.uri?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPrompts = prompts.filter(prompt =>
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (prompt.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 执行工具调用
  const handleToolCall = async () => {
    if (!selectedTool) return;

    try {
      const result = await dispatch(callTool({ tool: selectedTool, parameters: toolParams }) as any).unwrap();
      setToolResults(prev => ({ ...prev, [selectedTool.name]: result.result }));
      setToolErrors(prev => ({ ...prev, [selectedTool.name]: '' }));
      message.success(t.success.toolCallSuccess);
    } catch (error) {
      setToolErrors(prev => ({ ...prev, [selectedTool.name]: String(error) }));
      setToolResults(prev => ({ ...prev, [selectedTool.name]: null }));
      message.error(`${t.errors.toolCallFailed}: ${error}`);
    }
  };

  // 读取资源
  const handleResourceRead = async () => {
    if (!selectedResource) return;

    try {
      let actualUri = selectedResource.uri || (selectedResource as any).uriTemplate;

      if (actualUri && actualUri.includes('{')) {
        const requiredParams = actualUri.match(/\{([^}]+)\}/g) || [];
        const missingParams: string[] = [];

        requiredParams.forEach((param: string) => {
          const paramName = param.slice(1, -1);
          if (!resourceParams[paramName] || resourceParams[paramName].toString().trim() === '') {
            missingParams.push(paramName);
          }
        });

        if (missingParams.length > 0) {
          message.error(`请填写以下必需参数: ${missingParams.join(', ')}`);
          return;
        }

        Object.entries(resourceParams).forEach(([key, value]) => {
          if (value && value.toString().trim() !== '') {
            actualUri = actualUri.replace(`{${key}}`, String(value));
          }
        });

        const remainingParams = actualUri.match(/\{([^}]+)\}/g) || [];
        if (remainingParams.length > 0) {
          const remainingParamNames = remainingParams.map((param: string) => param.slice(1, -1));
          message.error(`缺少必需参数: ${remainingParamNames.join(', ')}`);
          return;
        }
      }

      const resourceToRead = { ...selectedResource, uri: actualUri };
      const result = await dispatch(readResource({ resource: resourceToRead, parameters: resourceParams }) as any).unwrap();
      const resourceKey = selectedResource.name || selectedResource.uri || (selectedResource as any).uriTemplate;
      setResourceResults(prev => ({ ...prev, [resourceKey]: result.result }));
      setResourceErrors(prev => ({ ...prev, [resourceKey]: '' }));
      message.success(t.success.resourceReadSuccess);
    } catch (error) {
      const resourceKey = selectedResource.name || selectedResource.uri || (selectedResource as any).uriTemplate;
      setResourceErrors(prev => ({ ...prev, [resourceKey]: String(error) }));
      setResourceResults(prev => ({ ...prev, [resourceKey]: null }));
      message.error(`${t.errors.resourceReadFailed}: ${error}`);
    }
  };

  // 获取提示
  const handlePromptGet = async () => {
    if (!selectedPrompt) return;

    try {
      const result = await dispatch(getPrompt({ prompt: selectedPrompt, parameters: promptParams }) as any).unwrap();
      setPromptResults(prev => ({ ...prev, [selectedPrompt.name]: result.result }));
      setPromptErrors(prev => ({ ...prev, [selectedPrompt.name]: '' }));
      message.success(t.success.promptGetSuccess);
    } catch (error) {
      setPromptErrors(prev => ({ ...prev, [selectedPrompt.name]: String(error) }));
      setPromptResults(prev => ({ ...prev, [selectedPrompt.name]: null }));
      message.error(`${t.errors.promptGetFailed}: ${error}`);
    }
  };

  // 从URI模板中提取参数
  const extractParamsFromUri = (uri: string): Record<string, { type: string; description?: string }> => {
    const params: Record<string, { type: string; description?: string }> = {};
    const matches = uri.match(/\{([^}]+)\}/g) || [];

    matches.forEach((match) => {
      const paramName = match.slice(1, -1);
      params[paramName] = { type: 'string', description: `参数: ${paramName}` };
    });

    return params;
  };

  // 复制结果到剪贴板
  const copyToClipboard = (content: any) => {
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  // 获取当前结果和错误
  const getCurrentResult = () => {
    if (activeTab === 'tools' && selectedTool) {
      return { result: toolResults[selectedTool.name], error: toolErrors[selectedTool.name] };
    }
    if (activeTab === 'resources' && selectedResource) {
      const key = selectedResource.name || selectedResource.uri || (selectedResource as any).uriTemplate;
      return { result: resourceResults[key], error: resourceErrors[key] };
    }
    if (activeTab === 'prompts' && selectedPrompt) {
      return { result: promptResults[selectedPrompt.name], error: promptErrors[selectedPrompt.name] };
    }
    return { result: null, error: '' };
  };

  // 清除当前结果
  const clearCurrentResult = () => {
    if (activeTab === 'tools' && selectedTool) {
      setToolResults(prev => ({ ...prev, [selectedTool.name]: null }));
      setToolErrors(prev => ({ ...prev, [selectedTool.name]: '' }));
    }
    if (activeTab === 'resources' && selectedResource) {
      const key = selectedResource.name || selectedResource.uri || (selectedResource as any).uriTemplate;
      setResourceResults(prev => ({ ...prev, [key]: null }));
      setResourceErrors(prev => ({ ...prev, [key]: '' }));
    }
    if (activeTab === 'prompts' && selectedPrompt) {
      setPromptResults(prev => ({ ...prev, [selectedPrompt.name]: null }));
      setPromptErrors(prev => ({ ...prev, [selectedPrompt.name]: '' }));
    }
  };

  // 渲染参数表单
  const renderParameterForm = (
    schema: any,
    values: Record<string, any>,
    onChange: (values: Record<string, any>) => void,
    uriTemplate?: string
  ) => {
    let effectiveSchema = schema;
    if ((!schema?.properties || Object.keys(schema.properties || {}).length === 0) && uriTemplate) {
      const extractedParams = extractParamsFromUri(uriTemplate);
      effectiveSchema = { properties: extractedParams };
    }

    if (!effectiveSchema?.properties || Object.keys(effectiveSchema.properties).length === 0) {
      return (
        <div className="no-params-hint">
          <Text type="secondary">无需参数</Text>
        </div>
      );
    }

    return (
      <Form layout="vertical" className="modern-form">
        {Object.entries(effectiveSchema.properties).map(([key, prop]: [string, any]) => (
          <Form.Item
            key={key}
            label={<span className="param-label">{prop.title || key}</span>}
            className="modern-form-item"
          >
            {prop.type === 'string' && prop.enum ? (
              <Select
                placeholder={`选择 ${key}`}
                value={values[key]}
                allowClear
                onChange={(value: any) => onChange({ ...values, [key]: value })}
                className="modern-select"
              >
                {prop.enum.map((option: string) => (
                  <Select.Option key={option} value={option}>{option}</Select.Option>
                ))}
              </Select>
            ) : prop.type === 'boolean' ? (
              <Checkbox
                checked={values[key] || false}
                onChange={(e: any) => onChange({ ...values, [key]: e.target.checked })}
              >
                {prop.description || key}
              </Checkbox>
            ) : prop.type === 'object' || prop.type === 'array' ? (
              <TextArea
                placeholder={prop.description || `输入 ${key} (JSON 格式)`}
                value={values[key] || ''}
                onChange={(e) => onChange({ ...values, [key]: e.target.value })}
                autoSize={{ minRows: 2, maxRows: 6 }}
                className="modern-textarea"
              />
            ) : (
              <Input
                placeholder={prop.description || `输入 ${key}`}
                value={values[key] || ''}
                onChange={(e) => onChange({ ...values, [key]: e.target.value })}
                className="modern-input"
              />
            )}
            {prop.description && (
              <div className="param-description">{prop.description}</div>
            )}
          </Form.Item>
        ))}
      </Form>
    );
  };

  // 渲染工具卡片
  const renderToolCard = (tool: MCPTool) => {
    const isSelected = selectedTool?.name === tool.name;
    return (
      <div
        key={tool.name}
        className={`item-card ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          setSelectedTool(tool);
          setToolParams({});
        }}
      >
        <div className="item-card-header">
          <div className="item-icon tool-icon">
            <ThunderboltOutlined />
          </div>
          <div className="item-info">
            <div className="item-name">{tool.name}</div>
            <div className="item-desc">{tool.description || '暂无描述'}</div>
          </div>
          <RightOutlined className="item-arrow" />
        </div>
      </div>
    );
  };

  // 渲染资源卡片
  const renderResourceCard = (resource: MCPResource) => {
    const isTemplate = !!(resource as any).uriTemplate;
    const resourceKey = resource.name || resource.uri || (resource as any).uriTemplate;
    const isSelected = selectedResource &&
      ((selectedResource.name === resource.name) ||
       (selectedResource.uri === resource.uri) ||
       ((selectedResource as any).uriTemplate === (resource as any).uriTemplate));

    return (
      <div
        key={resourceKey}
        className={`item-card ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          setSelectedResource(resource);
          setResourceParams({});
        }}
      >
        <div className="item-card-header">
          <div className="item-icon resource-icon">
            <FileTextOutlined />
          </div>
          <div className="item-info">
            <div className="item-name">
              {resource.name || resource.uri || (resource as any).uriTemplate}
              {isTemplate && <Tag className="template-tag">模板</Tag>}
            </div>
            <div className="item-desc">{resource.description || resource.uri || (resource as any).uriTemplate}</div>
          </div>
          <RightOutlined className="item-arrow" />
        </div>
      </div>
    );
  };

  // 渲染提示卡片
  const renderPromptCard = (prompt: MCPPrompt) => {
    const isSelected = selectedPrompt?.name === prompt.name;
    return (
      <div
        key={prompt.name}
        className={`item-card ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          setSelectedPrompt(prompt);
          setPromptParams({});
        }}
      >
        <div className="item-card-header">
          <div className="item-icon prompt-icon">
            <MessageOutlined />
          </div>
          <div className="item-info">
            <div className="item-name">{prompt.name}</div>
            <div className="item-desc">{prompt.description || '暂无描述'}</div>
          </div>
          <RightOutlined className="item-arrow" />
        </div>
      </div>
    );
  };

  // 渲染详情面板
  const renderDetailPanel = () => {
    const { result, error } = getCurrentResult();

    if (activeTab === 'tools' && selectedTool) {
      return (
        <div className="detail-panel">
          <div className="detail-header">
            <div className="detail-icon tool-icon">
              <ThunderboltOutlined />
            </div>
            <div className="detail-title-section">
              <h3 className="detail-title">{selectedTool.name}</h3>
              <p className="detail-subtitle">{selectedTool.description}</p>
            </div>
          </div>

          <div className="detail-content">
            <div className="params-section">
              <h4 className="section-title">
                <CodeOutlined /> 参数配置
              </h4>
              {renderParameterForm(selectedTool.inputSchema, toolParams, setToolParams)}
            </div>

            <div className="action-section">
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleToolCall}
                loading={isLoading}
                className="execute-btn"
              >
                执行调用
              </Button>
            </div>

            {(result || error) && (
              <div className="result-section">
                <div className="result-header">
                  <h4 className="section-title">
                    {error ? <CloseCircleOutlined style={{ color: 'var(--color-error)' }} /> :
                            <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />}
                    {error ? ' 执行失败' : ' 执行结果'}
                  </h4>
                  <Space>
                    {result && (
                      <Tooltip title="复制结果">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(result)}
                        />
                      </Tooltip>
                    )}
                    <Tooltip title={expandedResult ? '收起' : '展开'}>
                      <Button
                        type="text"
                        size="small"
                        icon={expandedResult ? <CompressOutlined /> : <ExpandOutlined />}
                        onClick={() => setExpandedResult(!expandedResult)}
                      />
                    </Tooltip>
                    <Button size="small" onClick={clearCurrentResult}>关闭</Button>
                  </Space>
                </div>
                <div
                  ref={resultRef}
                  className={`result-content ${expandedResult ? 'expanded' : ''} ${error ? 'error' : 'success'}`}
                >
                  <pre>{error || JSON.stringify(result, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'resources' && selectedResource) {
      const uriTemplate = selectedResource.uri || (selectedResource as any).uriTemplate;
      return (
        <div className="detail-panel">
          <div className="detail-header">
            <div className="detail-icon resource-icon">
              <FileTextOutlined />
            </div>
            <div className="detail-title-section">
              <h3 className="detail-title">{selectedResource.name || uriTemplate}</h3>
              <p className="detail-subtitle">{selectedResource.description || uriTemplate}</p>
            </div>
          </div>

          <div className="detail-content">
            <div className="uri-display">
              <span className="uri-label">URI:</span>
              <code className="uri-value">{uriTemplate}</code>
            </div>

            <div className="params-section">
              <h4 className="section-title">
                <CodeOutlined /> 参数配置
              </h4>
              {renderParameterForm(
                (selectedResource as any).inputSchema || { properties: {} },
                resourceParams,
                setResourceParams,
                uriTemplate
              )}
            </div>

            <div className="action-section">
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleResourceRead}
                loading={isLoading}
                className="execute-btn"
              >
                读取资源
              </Button>
            </div>

            {(result || error) && (
              <div className="result-section">
                <div className="result-header">
                  <h4 className="section-title">
                    {error ? <CloseCircleOutlined style={{ color: 'var(--color-error)' }} /> :
                            <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />}
                    {error ? ' 读取失败' : ' 读取结果'}
                  </h4>
                  <Space>
                    {result && (
                      <Tooltip title="复制结果">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(result)}
                        />
                      </Tooltip>
                    )}
                    <Tooltip title={expandedResult ? '收起' : '展开'}>
                      <Button
                        type="text"
                        size="small"
                        icon={expandedResult ? <CompressOutlined /> : <ExpandOutlined />}
                        onClick={() => setExpandedResult(!expandedResult)}
                      />
                    </Tooltip>
                    <Button size="small" onClick={clearCurrentResult}>关闭</Button>
                  </Space>
                </div>
                <div
                  ref={resultRef}
                  className={`result-content ${expandedResult ? 'expanded' : ''} ${error ? 'error' : 'success'}`}
                >
                  <pre>{error || JSON.stringify(result, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'prompts' && selectedPrompt) {
      return (
        <div className="detail-panel">
          <div className="detail-header">
            <div className="detail-icon prompt-icon">
              <MessageOutlined />
            </div>
            <div className="detail-title-section">
              <h3 className="detail-title">{selectedPrompt.name}</h3>
              <p className="detail-subtitle">{selectedPrompt.description}</p>
            </div>
          </div>

          <div className="detail-content">
            {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
              <div className="params-section">
                <h4 className="section-title">
                  <CodeOutlined /> 参数配置
                </h4>
                <Form layout="vertical" className="modern-form">
                  {selectedPrompt.arguments.map((arg) => (
                    <Form.Item
                      key={arg.name}
                      label={<span className="param-label">{arg.name}</span>}
                      className="modern-form-item"
                    >
                      <Input
                        placeholder={arg.description || `输入 ${arg.name}`}
                        value={promptParams[arg.name] || ''}
                        onChange={(e) => setPromptParams({ ...promptParams, [arg.name]: e.target.value })}
                        className="modern-input"
                      />
                      {arg.description && (
                        <div className="param-description">{arg.description}</div>
                      )}
                    </Form.Item>
                  ))}
                </Form>
              </div>
            )}

            <div className="action-section">
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handlePromptGet}
                loading={isLoading}
                className="execute-btn"
              >
                获取提示
              </Button>
            </div>

            {(result || error) && (
              <div className="result-section">
                <div className="result-header">
                  <h4 className="section-title">
                    {error ? <CloseCircleOutlined style={{ color: 'var(--color-error)' }} /> :
                            <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />}
                    {error ? ' 获取失败' : ' 提示内容'}
                  </h4>
                  <Space>
                    {result && (
                      <Tooltip title="复制结果">
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyToClipboard(result)}
                        />
                      </Tooltip>
                    )}
                    <Tooltip title={expandedResult ? '收起' : '展开'}>
                      <Button
                        type="text"
                        size="small"
                        icon={expandedResult ? <CompressOutlined /> : <ExpandOutlined />}
                        onClick={() => setExpandedResult(!expandedResult)}
                      />
                    </Tooltip>
                    <Button size="small" onClick={clearCurrentResult}>关闭</Button>
                  </Space>
                </div>
                <div
                  ref={resultRef}
                  className={`result-content ${expandedResult ? 'expanded' : ''} ${error ? 'error' : 'success'}`}
                >
                  <pre>{error || JSON.stringify(result, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="detail-panel empty-state">
        <div className="empty-content">
          <ApiOutlined className="empty-icon" />
          <h3>选择一个项目开始</h3>
          <p>从左侧列表中选择一个工具、资源或提示来查看详情并执行操作</p>
        </div>
      </div>
    );
  };

  if (connectionStatus !== 'connected') {
    return (
      <div className="mcp-explorer-disconnected">
        <div className="disconnected-content">
          <ApiOutlined className="disconnected-icon" />
          <h2>{t.explorer.noConnection}</h2>
          <p>{t.explorer.connectFirst}</p>
        </div>
      </div>
    );
  }

  const tabData = [
    { key: 'tools' as TabType, label: t.tools.title, icon: <ThunderboltOutlined />, count: tools.length },
    { key: 'resources' as TabType, label: t.resources.title, icon: <FileTextOutlined />, count: allResources.length },
    { key: 'prompts' as TabType, label: t.prompts.title, icon: <MessageOutlined />, count: prompts.length },
  ];

  const getCurrentList = () => {
    switch (activeTab) {
      case 'tools': return filteredTools;
      case 'resources': return filteredResources;
      case 'prompts': return filteredPrompts;
      default: return [];
    }
  };

  return (
    <div className="mcp-explorer">
      {/* 左侧列表面板 */}
      <div className="list-panel">
        {/* Tab 切换 */}
        <div className="tab-bar">
          {tabData.map(tab => (
            <div
              key={tab.key}
              className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span className="tab-label">{tab.label}</span>
              <Badge count={tab.count} className="tab-badge" />
            </div>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="search-bar">
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            className="search-input"
          />
        </div>

        {/* 列表内容 */}
        <div className="list-content">
          {getCurrentList().length === 0 ? (
            <Empty
              description={searchQuery ? '未找到匹配项' : '暂无数据'}
              className="empty-list"
            />
          ) : (
            <div className="item-list">
              {activeTab === 'tools' && filteredTools.map(renderToolCard)}
              {activeTab === 'resources' && filteredResources.map(renderResourceCard)}
              {activeTab === 'prompts' && filteredPrompts.map(renderPromptCard)}
            </div>
          )}
        </div>
      </div>

      {/* 右侧详情面板 */}
      {renderDetailPanel()}
    </div>
  );
};

export default MCPExplorer;
