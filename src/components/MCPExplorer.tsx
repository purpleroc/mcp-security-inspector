import React, { useState } from 'react';
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
  Modal,
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
  const [showResult, setShowResult] = useState(false);

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
      await dispatch(callTool({ tool: selectedTool, parameters: toolParams }) as any).unwrap();
      setShowResult(true);
      message.success(t.success.connected);
    } catch (error) {
      message.error(`${t.errors.toolCallFailed}: ${error}`);
    }
  };

  // 读取资源
  const handleResourceRead = async () => {
    if (!selectedResource) return;

    try {
      // 如果是动态资源模板，构造实际的URI
      let actualUri = selectedResource.uri || (selectedResource as any).uriTemplate;
      if (actualUri && actualUri.includes('{')) {
        // 替换URI模板中的参数，对于空值使用空字符串
        Object.entries(resourceParams).forEach(([key, value]) => {
          actualUri = actualUri.replace(`{${key}}`, String(value || ''));
        });
        
        // 对于剩余的未填写参数，也用空字符串替换
        const remainingParams = actualUri.match(/\{([^}]+)\}/g) || [];
        remainingParams.forEach((param: string) => {
          actualUri = actualUri.replace(param, '');
        });
      }

      // 创建带有实际URI的资源对象
      const resourceToRead = {
        ...selectedResource,
        uri: actualUri
      };

      await dispatch(readResource({ resource: resourceToRead, parameters: resourceParams }) as any).unwrap();
      setShowResult(true);
      message.success(t.success.connected);
    } catch (error) {
      message.error(`${t.errors.resourceReadFailed}: ${error}`);
    }
  };

  // 获取提示
  const handlePromptGet = async () => {
    if (!selectedPrompt) return;

    try {
      await dispatch(getPrompt({ prompt: selectedPrompt, parameters: promptParams }) as any).unwrap();
      setShowResult(true);
      message.success(t.success.connected);
    } catch (error) {
      message.error(`${t.errors.promptGetFailed}: ${error}`);
    }
  };

  // 渲染参数表单
  const renderParameterForm = (
    schema: any, 
    values: Record<string, any>, 
    onChange: (values: Record<string, any>) => void
  ) => {
    if (!schema?.properties) return null;

    return (
      <Form layout="vertical">
        {Object.entries(schema.properties).map(([key, prop]: [string, any]) => (
          <Form.Item 
            key={key} 
            label={prop.title || key}
            help={prop.description}
            required={false}
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
              )}
            />
          )}

          {selectedTool && (
            <>
              <Divider />
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
            </>
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
                    )}
                  />
            </div>
          )}

          {selectedResource && (
            <>
              <Divider />
                  <Card size="small" title={`${t.resources.readResource}: ${selectedResource.name || selectedResource.uri}`}>
                    {selectedResource.uri && selectedResource.uri.includes('{') && (
                    <div style={{ marginBottom: 16 }}>
                        <Alert
                          message={`${t.resources.resourceUri}: ${selectedResource.uri}`}
                          type="info"
                          style={{ marginBottom: 16 }}
                        />
                        {renderParameterForm(
                          (selectedResource as any).inputSchema || { properties: {} },
                          resourceParams,
                          setResourceParams
                        )}
                    </div>
                    )}
                
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />}
                  onClick={handleResourceRead}
                  loading={isLoading}
                >
                      {t.resources.readResource}
                </Button>
              </Card>
            </>
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
              )}
            />
          )}

          {selectedPrompt && (
            <>
              <Divider />
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
            </>
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

        {/* 结果显示模态框 */}
        <Modal
          title={t.tools.result}
          open={showResult}
          onCancel={() => setShowResult(false)}
          footer={[
            <Button key="close" onClick={() => setShowResult(false)}>
              {t.common.close}
            </Button>
          ]}
          width={1000}
          style={{ top: 20 }}
        >
          {lastError ? (
            <Alert
              message={t.common.error}
              description={lastError}
              type="error"
            />
          ) : lastResult ? (
            <div>
              <Paragraph>
                <Text strong>{t.tools.result}:</Text>
              </Paragraph>
              <div style={{ 
                backgroundColor: '#f5f5f5', 
                padding: 16, 
                borderRadius: 4,
                maxHeight: 'calc(100vh - 300px)',
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
                  {JSON.stringify(lastResult, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div>{t.common.loading}</div>
          )}
        </Modal>
    </div>
  );
};

export default MCPExplorer; 