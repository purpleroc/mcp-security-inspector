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

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const MCPExplorer: React.FC = () => {
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
      message.success('工具调用成功');
    } catch (error) {
      message.error(`工具调用失败: ${error}`);
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
      message.success('资源读取成功');
    } catch (error) {
      message.error(`资源读取失败: ${error}`);
    }
  };

  // 获取提示
  const handlePromptGet = async () => {
    if (!selectedPrompt) return;

    try {
      await dispatch(getPrompt({ prompt: selectedPrompt, parameters: promptParams }) as any).unwrap();
      setShowResult(true);
      message.success('提示获取成功');
    } catch (error) {
      message.error(`提示获取失败: ${error}`);
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
                placeholder={`选择 ${key}（可选）`}
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
                {prop.title || key}（可选）
              </Checkbox>
            ) : (
              <Input
                placeholder={prop.description ? `${prop.description}（可选）` : `输入 ${key}（可选）`}
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
          message="未连接到MCP服务器"
          description="请先在配置页面连接到MCP服务器"
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
          <span>工具 (Tools)</span>
          <Badge count={tools.length} />
        </Space>
      ),
      children: (
        <div>
          {tools.length === 0 ? (
            <Alert message="没有可用的工具" type="info" />
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
                      {selectedTool?.name === tool.name ? '已选择' : '选择'}
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
              <Card size="small" title={`调用工具: ${selectedTool.name}`}>
                {renderParameterForm(
                  selectedTool.inputSchema,
                  toolParams,
                  setToolParams
                )}
                
                {securityCheck && (
                  <Alert
                    message={`安全风险等级: ${securityCheck.level.toUpperCase()}`}
                    description={
                      <div>
                        {securityCheck.warnings.length > 0 && (
                          <div>
                            <Text strong>警告:</Text>
                            <ul>
                              {securityCheck.warnings.map((warning, idx) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {securityCheck.recommendations.length > 0 && (
                          <div>
                            <Text strong>建议:</Text>
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
                  执行工具
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
          <span>资源 (Resources)</span>
          <Badge count={resources.length + resourceTemplates.length} />
        </Space>
      ),
      children: (
        <div>
          {resources.length === 0 && resourceTemplates.length === 0 ? (
            <Alert message="没有可用的资源" type="info" />
          ) : (
            <div>
              {resources.length > 0 && (
                <div>
                  <Text strong>静态资源 ({resources.length})</Text>
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
                            {selectedResource?.uri === resource.uri ? '已选择' : '选择'}
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          title={resource.name || resource.uri}
                          description={
                            <div>
                              <div>{resource.description}</div>
                              <Text type="secondary">URI: {resource.uri}</Text>
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
                  <Text strong>动态资源模板 ({resourceTemplates.length})</Text>
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
                            {selectedResource?.name === template.name ? '已选择' : '选择'}
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          title={template.name || (template as any).uriTemplate}
                          description={
                            <div>
                              <div>{template.description}</div>
                              <Text type="secondary">URI模板: {(template as any).uriTemplate}</Text>
                              {template.mimeType && <Tag>{template.mimeType}</Tag>}
                              <Tag color="blue">动态模板</Tag>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </div>
          )}

          {selectedResource && (
            <>
              <Divider />
              <Card size="small" title={`读取资源: ${selectedResource.name || selectedResource.uri}`}>
                {/* 如果是动态资源模板，显示参数输入表单 */}
                {(() => {
                  // 处理动态资源模板的URI字段
                  const uri = selectedResource.uri || (selectedResource as any).uriTemplate;
                  const hasParams = uri && uri.includes('{');
                  
                  return hasParams && (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>URI参数配置：</Text>
                      <Form layout="vertical" style={{ marginTop: 8 }}>
                        {/* 解析URI模板中的参数 */}
                        {(() => {
                          const matches = uri.match(/\{([^}]+)\}/g) || [];
                          const paramNames = matches.map((match: string) => match.slice(1, -1));
                          return paramNames.map((paramName: string) => (
                            <Form.Item
                              key={paramName}
                              label={paramName}
                              required={false}
                            >
                              <Input
                                placeholder={`输入${paramName}参数（可选）`}
                                value={resourceParams[paramName] || ''}
                                onChange={(e) => setResourceParams({
                                  ...resourceParams,
                                  [paramName]: e.target.value
                                })}
                              />
                            </Form.Item>
                          ));
                        })()}
                      </Form>
                    </div>
                  );
                })()}
                
                <Button 
                  type="primary" 
                  icon={<PlayCircleOutlined />}
                  onClick={handleResourceRead}
                  loading={isLoading}
                >
                  读取资源
                </Button>
              </Card>
            </>
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
          <span>提示 (Prompts)</span>
          <Badge count={prompts.length} />
        </Space>
      ),
      children: (
        <div>
          {prompts.length === 0 ? (
            <Alert message="没有可用的提示" type="info" />
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
                      {selectedPrompt?.name === prompt.name ? '已选择' : '选择'}
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
              <Card size="small" title={`获取提示: ${selectedPrompt.name}`}>
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
                            placeholder={arg.description ? `${arg.description}（可选）` : `输入 ${arg.name}（可选）`}
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
                  获取提示
                </Button>
              </Card>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="MCP功能浏览器">
        <Collapse 
          defaultActiveKey={tools.length > 0 ? ['tools'] : []}
          items={collapseItems}
        />

        {/* 结果显示模态框 */}
        <Modal
          title="执行结果"
          open={showResult}
          onCancel={() => setShowResult(false)}
          footer={[
            <Button key="close" onClick={() => setShowResult(false)}>
              关闭
            </Button>
          ]}
          width={800}
        >
          {lastError ? (
            <Alert
              message="执行出错"
              description={lastError}
              type="error"
              showIcon
            />
          ) : lastResult ? (
            <div>
              <Paragraph>
                <Text strong>执行成功</Text>
              </Paragraph>
              <TextArea
                value={JSON.stringify(lastResult, null, 2)}
                rows={20}
                readOnly
              />
            </div>
          ) : null}
        </Modal>
      </Card>
    </div>
  );
};

export default MCPExplorer; 