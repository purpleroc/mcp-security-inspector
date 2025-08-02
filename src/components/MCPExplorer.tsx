import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Collapse, 
  List, 
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
  Divider,
  Badge
} from 'antd';
import { 
  ToolOutlined, 
  FileTextOutlined, 
  MessageOutlined, 
  PlayCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { callTool, readResource, getPrompt } from '../store/mcpSlice';
import { MCPTool, MCPResource, MCPPrompt, SecurityRiskLevel } from '../types/mcp';
import { useI18n } from '../hooks/useI18n';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

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

  // 监听连接状态变化，切换服务器时清空本地状态
  useEffect(() => {
    if (connectionStatus === 'connecting') {
      // 清空所有选中状态和结果
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

  // 安全等级颜色映射
  const getRiskColor = (level: SecurityRiskLevel) => {
    switch (level) {
      case 'low': return 'green';
      case 'medium': return 'orange';
      case 'high': return 'red';
      case 'critical': return '#FF0000';
      default: return 'default';
    }
  };

  // 执行工具调用
  const handleToolCall = async () => {
    if (!selectedTool) return;

    try {
      const result = await dispatch(callTool({ tool: selectedTool, parameters: toolParams }) as any).unwrap();
      setToolResults(prev => ({ ...prev, [selectedTool.name]: result.result }));
      setToolErrors(prev => ({ ...prev, [selectedTool.name]: '' }));
      message.success(t.success.connected);
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
      // 如果是动态资源模板，构造实际的URI
      let actualUri = selectedResource.uri || (selectedResource as any).uriTemplate;
      console.log('原始URI模板:', actualUri);
      console.log('当前参数:', resourceParams);
      
      if (actualUri && actualUri.includes('{')) {
        // 检查是否所有必需的参数都已填写
        const requiredParams = actualUri.match(/\{([^}]+)\}/g) || [];
        const missingParams: string[] = [];
        
        requiredParams.forEach((param: string) => {
          const paramName = param.slice(1, -1); // 移除 { 和 }
          if (!resourceParams[paramName] || resourceParams[paramName].toString().trim() === '') {
            missingParams.push(paramName);
          }
        });
        
        if (missingParams.length > 0) {
          message.error(`请填写以下必需参数: ${missingParams.join(', ')}`);
          return;
        }
        
        // 替换URI模板中的参数
        Object.entries(resourceParams).forEach(([key, value]) => {
          if (value && value.toString().trim() !== '') {
            console.log(`替换参数 ${key} = ${value}`);
            actualUri = actualUri.replace(`{${key}}`, String(value));
          }
        });
        
        console.log('替换后的URI:', actualUri);
        
        // 检查是否还有未替换的参数
        const remainingParams = actualUri.match(/\{([^}]+)\}/g) || [];
        if (remainingParams.length > 0) {
          const remainingParamNames = remainingParams.map((param: string) => param.slice(1, -1));
          message.error(`缺少必需参数: ${remainingParamNames.join(', ')}`);
          return;
        }
      }

      // 创建带有实际URI的资源对象
      const resourceToRead = {
        ...selectedResource,
        uri: actualUri
      };
      
      console.log('发送给服务器的资源对象:', resourceToRead);

      const result = await dispatch(readResource({ resource: resourceToRead, parameters: resourceParams }) as any).unwrap();
      // 改进资源键的生成逻辑
      const resourceKey = selectedResource.name || selectedResource.uri || (selectedResource as any).uriTemplate;
      setResourceResults(prev => ({ ...prev, [resourceKey]: result.result }));
      setResourceErrors(prev => ({ ...prev, [resourceKey]: '' }));
      message.success(t.success.connected);
    } catch (error) {
      console.error('资源读取错误:', error);
      // 改进资源键的生成逻辑
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
      message.success(t.success.connected);
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
      const paramName = match.slice(1, -1); // 移除 { 和 }
      params[paramName] = {
        type: 'string',
        description: `参数: ${paramName}`
      };
    });
    
    return params;
  };

  // 渲染结果显示组件
  const renderResultDisplay = (result: any, error: string, onClose: () => void) => {
    if (!result && !error) return null;

    return (
      <Card 
        size="small" 
        title={t.tools.result}
        style={{ marginTop: 16 }}
        extra={
          <Button size="small" onClick={onClose}>
            {t.common.close}
          </Button>
        }
      >
        {error ? (
          <Alert
            message={t.common.error}
            description={error}
            type="error"
          />
        ) : result ? (
          <div>
            <div style={{ 
              backgroundColor: '#f5f5f5', 
              padding: 12, 
              borderRadius: 4,
              maxHeight: '400px',
              overflow: 'auto',
              border: '1px solid #d9d9d9'
            }}>
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: '12px',
                lineHeight: '1.4',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div>{t.common.loading}</div>
        )}
      </Card>
    );
  };

  // 渲染参数表单
  const renderParameterForm = (
    schema: any, 
    values: Record<string, any>, 
    onChange: (values: Record<string, any>) => void,
    uriTemplate?: string
  ) => {
    
    // 如果没有schema但有URI模板，从模板中提取参数
    let effectiveSchema = schema;
    if ((!schema?.properties || Object.keys(schema.properties || {}).length === 0) && uriTemplate) {
      const extractedParams = extractParamsFromUri(uriTemplate);
      effectiveSchema = { properties: extractedParams };
    }
    
    if (!effectiveSchema?.properties || Object.keys(effectiveSchema.properties).length === 0) {
      return null;
    }

    return (
      <Form layout="vertical">
        {Object.entries(effectiveSchema.properties).map(([key, prop]: [string, any]) => (
          <Form.Item 
            key={key} 
            label={prop.title || key}
            help={prop.description}
            required={true} // 从URI模板提取的参数都是必需的
          >
            {prop.type === 'string' && prop.enum ? (
              <Select
                placeholder={`${t.tools.selectTool} ${key}`}
                value={values[key]}
                allowClear
                onChange={(value: any) => onChange({ ...values, [key]: value })}
              >
                {prop.enum.map((option: string) => (
                  <Select.Option key={option} value={option}>
                    {option}
                  </Select.Option>
                ))}
              </Select>
            ) : prop.type === 'boolean' ? (
              <Checkbox
                checked={values[key] || false}
                onChange={(e: any) => onChange({ ...values, [key]: e.target.checked })}
              >
                {prop.title || key}
              </Checkbox>
            ) : (
              <Input
                placeholder={prop.description ? prop.description : `${t.tools.pleaseInput} ${key}`}
                value={values[key] || ''}
                onChange={(e) => onChange({ ...values, [key]: e.target.value })}
                required
              />
            )}
          </Form.Item>
        ))}
      </Form>
    );
  };

  if (connectionStatus !== 'connected') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Alert
          message={t.explorer.noConnection}
          description={t.explorer.connectFirst}
          type="warning"
          showIcon
        />
      </div>
    );
  }

  // Collapse items配置
  const collapseItems = [
    // 工具部分
    {
      key: 'tools',
      label: (
        <Space>
          <ToolOutlined />
          <span>{t.tools.title}</span>
          <Badge count={tools.length} />
        </Space>
      ),
      children: (
        <div>
          {tools.length === 0 ? (
            <Alert message={t.tools.noTools} type="info" />
          ) : (
            <List
              dataSource={tools}
              renderItem={(tool) => (
                <div key={tool.name}>
                  <List.Item
                    actions={[
                      <Button 
                        key="select"
                        type={selectedTool?.name === tool.name ? 'primary' : 'default'}
                        onClick={() => {
                          setSelectedTool(tool);
                          setToolParams({}); // 清空参数状态
                        }}
                      >
                        {selectedTool?.name === tool.name ? t.tools.selectTool : t.tools.selectTool}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={tool.name}
                      description={tool.description}
                    />
                  </List.Item>
                  
                  {/* 在选中的工具下方显示调用功能框 */}
                  {selectedTool?.name === tool.name && (
                    <div style={{ marginLeft: 24, marginBottom: 16, marginTop: 8 }}>
                      <Card size="small" title={`${t.tools.callTool}: ${selectedTool.name}`}>
                        {renderParameterForm(
                          selectedTool.inputSchema,
                          toolParams,
                          setToolParams
                        )}
                        
                        {securityCheck && (
                          <Alert
                            message={`${t.security.riskAssessment}: ${securityCheck.level.toUpperCase()}`}
                            description={
                              <div>
                                {securityCheck.warnings.length > 0 && (
                                  <div>
                                    <Text strong>{t.common.warning}:</Text>
                                    <ul>
                                      {securityCheck.warnings.map((warning, idx) => (
                                        <li key={idx}>{warning}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {securityCheck.recommendations.length > 0 && (
                                  <div>
                                    <Text strong>{t.security.recommendations}:</Text>
                                    <ul>
                                      {securityCheck.recommendations.map((rec, idx) => (
                                        <li key={idx}>{rec}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            }
                            type={securityCheck.level === 'low' ? 'success' : 
                                  securityCheck.level === 'medium' ? 'warning' : 'error'}
                            style={{ marginBottom: 16 }}
                          />
                        )}

                        <Button 
                          type="primary" 
                          icon={<PlayCircleOutlined />}
                          onClick={handleToolCall}
                          loading={isLoading}
                        >
                          {t.tools.callTool}
                        </Button>
                      </Card>
                      
                            {/* 工具调用结果显示 */}
                            {renderResultDisplay(
                              toolResults[tool.name], 
                              toolErrors[tool.name], 
                              () => {
                                setToolResults(prev => ({ ...prev, [tool.name]: null }));
                                setToolErrors(prev => ({ ...prev, [tool.name]: '' }));
                              }
                            )}
                    </div>
                  )}
                </div>
              )}
            />
          )}

        </div>
      )
    },
    // 资源部分
    {
      key: 'resources',
      label: (
        <Space>
          <FileTextOutlined />
          <span>{t.resources.title}</span>
          <Badge count={resources.length + resourceTemplates.length} />
        </Space>
      ),
      children: (
        <div>
          {resources.length === 0 && resourceTemplates.length === 0 ? (
            <Alert message={t.resources.noResources} type="info" />
          ) : (
            <div>
              {resources.length > 0 && (
                <div>
                  <Text strong>{t.resources.staticResources} ({resources.length})</Text>
                  <List
                    dataSource={resources}
                    renderItem={(resource) => (
                      <div key={resource.uri}>
                        <List.Item
                          actions={[
                            <Button 
                              key="select"
                              type={selectedResource?.uri === resource.uri ? 'primary' : 'default'}
                              onClick={() => {
                                setSelectedResource(resource);
                                setResourceParams({}); // 清空参数状态
                              }}
                            >
                              {selectedResource?.uri === resource.uri ? t.resources.selectResource : t.resources.selectResource}
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            title={resource.name || resource.uri}
                            description={
                              <div>
                                <div>{resource.description}</div>
                                <Text type="secondary">{t.resources.resourceUri}: {resource.uri}</Text>
                                {resource.mimeType && <Tag>{resource.mimeType}</Tag>}
                              </div>
                            }
                          />
                        </List.Item>
                        
                        {/* 在选中的资源下方显示读取功能框 */}
                        {selectedResource?.uri === resource.uri && (
                          <div style={{ marginLeft: 24, marginBottom: 16, marginTop: 8 }}>
                            <Card size="small" title={`${t.resources.readResource}: ${selectedResource?.name || selectedResource?.uri}`}>
                              <div style={{ marginBottom: 16 }}>
                                <Alert
                                  message={`${t.resources.resourceUri}: ${selectedResource.uri}`}
                                  type="info"
                                  style={{ marginBottom: 16 }}
                                />
                                {renderParameterForm(
                                  (selectedResource as any).inputSchema || { properties: {} },
                                  resourceParams,
                                  setResourceParams,
                                  selectedResource.uri
                                )}
                              </div>
                              
                              <Button 
                                type="primary" 
                                icon={<PlayCircleOutlined />}
                                onClick={handleResourceRead}
                                loading={isLoading}
                              >
                                {t.resources.readResource}
                              </Button>
                            </Card>
                            
                            {/* 资源读取结果显示 */}
                            {renderResultDisplay(
                              resourceResults[resource.name || resource.uri], 
                              resourceErrors[resource.name || resource.uri], 
                              () => {
                                const resourceKey = resource.name || resource.uri;
                                setResourceResults(prev => ({ ...prev, [resourceKey]: null }));
                                setResourceErrors(prev => ({ ...prev, [resourceKey]: '' }));
                              }
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  />
                </div>
              )}

              {resourceTemplates.length > 0 && (
                <div style={{ marginTop: resources.length > 0 ? 16 : 0 }}>
                  <Text strong>{t.resources.templates} ({resourceTemplates.length})</Text>
                  <List
                    dataSource={resourceTemplates}
                    renderItem={(template) => (
                      <div key={template.name}>
                        <List.Item
                          actions={[
                            <Button 
                              key="select"
                              type={selectedResource?.name === template.name ? 'primary' : 'default'}
                              onClick={() => {
                                setSelectedResource(template);
                                setResourceParams({}); // 清空参数状态
                              }}
                            >
                              {selectedResource?.name === template.name ? t.resources.selectResource : t.resources.selectResource}
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            title={template.name || (template as any).uriTemplate}
                            description={
                              <div>
                                <div>{template.description}</div>
                                <Text type="secondary">{t.resources.resourceUri}: {(template as any).uriTemplate}</Text>
                                {template.mimeType && <Tag>{template.mimeType}</Tag>}
                                <Tag color="blue">{t.resources.templates}</Tag>
                              </div>
                            }
                          />
                        </List.Item>
                        
                        {/* 在选中的资源模板下方显示读取功能框 */}
                        {selectedResource?.name === template.name && (
                          <div style={{ marginLeft: 24, marginBottom: 16, marginTop: 8 }}>
                            <Card size="small" title={`${t.resources.readResource}: ${selectedResource?.name || selectedResource?.uri}`}>
                              <div style={{ marginBottom: 16 }}>
                                <Alert
                                  message={`${t.resources.resourceUri}: ${selectedResource?.uri || (template as any).uriTemplate}`}
                                  type="info"
                                  style={{ marginBottom: 16 }}
                                />
                                {renderParameterForm(
                                  (selectedResource as any).inputSchema || (template as any).inputSchema || { properties: {} },
                                  resourceParams,
                                  setResourceParams,
                                  (template as any).uriTemplate
                                )}
                              </div>
                              
                              <Button 
                                type="primary" 
                                icon={<PlayCircleOutlined />}
                                onClick={handleResourceRead}
                                loading={isLoading}
                              >
                                {t.resources.readResource}
                              </Button>
                            </Card>
                            
                            {/* 资源读取结果显示 */}
                            {renderResultDisplay(
                              resourceResults[template.name || (template as any).uriTemplate || ''], 
                              resourceErrors[template.name || (template as any).uriTemplate || ''], 
                              () => {
                                const resourceKey = template.name || (template as any).uriTemplate || '';
                                setResourceResults(prev => ({ ...prev, [resourceKey]: null }));
                                setResourceErrors(prev => ({ ...prev, [resourceKey]: '' }));
                              }
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  />
            </div>
          )}

            </div>
          )}
        </div>
      )
    },
    // 提示部分
    {
      key: 'prompts',
      label: (
        <Space>
          <MessageOutlined />
          <span>{t.prompts.title}</span>
          <Badge count={prompts.length} />
        </Space>
      ),
      children: (
        <div>
          {prompts.length === 0 ? (
            <Alert message={t.prompts.noPrompts} type="info" />
          ) : (
            <List
              dataSource={prompts}
              renderItem={(prompt) => (
                <div key={prompt.name}>
                  <List.Item
                    actions={[
                      <Button 
                        key="select"
                        type={selectedPrompt?.name === prompt.name ? 'primary' : 'default'}
                        onClick={() => {
                          setSelectedPrompt(prompt);
                          setPromptParams({}); // 清空参数状态
                        }}
                      >
                        {selectedPrompt?.name === prompt.name ? t.prompts.selectPrompt : t.prompts.selectPrompt}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={prompt.name}
                      description={prompt.description}
                    />
                  </List.Item>
                  
                  {/* 在选中的提示下方显示获取功能框 */}
                  {selectedPrompt?.name === prompt.name && (
                    <div style={{ marginLeft: 24, marginBottom: 16, marginTop: 8 }}>
                      <Card size="small" title={`${t.prompts.getPrompt}: ${selectedPrompt.name}`}>
                        {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <Form layout="vertical">
                              {selectedPrompt.arguments.map((arg) => (
                                <Form.Item 
                                  key={arg.name} 
                                  label={arg.name}
                                  help={arg.description}
                                  required={false}
                                >
                                  <Input
                                    placeholder={arg.description ? arg.description : `${t.prompts.pleaseInput} ${arg.name}`}
                                    value={promptParams[arg.name] || ''}
                                    onChange={(e) => setPromptParams({ 
                                      ...promptParams, 
                                      [arg.name]: e.target.value 
                                    })}
                                  />
                                </Form.Item>
                              ))}
                            </Form>
                          </div>
                        )}
                        
                        <Button 
                          type="primary" 
                          icon={<PlayCircleOutlined />}
                          onClick={handlePromptGet}
                          loading={isLoading}
                        >
                          {t.prompts.getPrompt}
                        </Button>
                      </Card>
                      
                      {/* 提示获取结果显示 */}
                      {renderResultDisplay(
                        promptResults[prompt.name], 
                        promptErrors[prompt.name], 
                        () => {
                          setPromptResults(prev => ({ ...prev, [prompt.name]: null }));
                          setPromptErrors(prev => ({ ...prev, [prompt.name]: '' }));
                        }
                      )}
                    </div>
                  )}
                </div>
              )}
            />
          )}

        </div>
      )
    }
  ];

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
        <Collapse 
          items={collapseItems}
        defaultActiveKey={['tools', 'resources', 'prompts']}
        size="small"
        />

    </div>
  );
};

export default MCPExplorer; 