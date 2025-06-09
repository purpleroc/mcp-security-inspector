import React, { useEffect } from 'react';
import { Card, List, Button, Alert, Empty, Form, Input, Select } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { 
  fetchTools, 
  setSelectedTool, 
  updateParameters, 
  callTool 
} from '../store/mcpSlice';
import { MCPTool } from '../types/mcp';
import SecurityWarning from './SecurityWarning';
import ResultDisplay from './ResultDisplay';

const { Option } = Select;

const ToolsPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    tools, 
    selectedTool, 
    currentParameters, 
    securityCheck, 
    isLoading, 
    lastError 
  } = useSelector((state: RootState) => state.mcp);

  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchTools() as any);
  }, [dispatch]);

  const handleToolSelect = (tool: MCPTool) => {
    dispatch(setSelectedTool(tool));
    form.resetFields();
  };

  const handleParameterChange = (values: Record<string, unknown>) => {
    dispatch(updateParameters(values));
  };

  const handleToolCall = async () => {
    if (!selectedTool) return;
    
    try {
      await dispatch(callTool({ 
        tool: selectedTool, 
        parameters: currentParameters 
      }) as any).unwrap();
    } catch (error) {
      console.error('Tool call failed:', error);
    }
  };

  const renderParameterForm = () => {
    if (!selectedTool) return null;

    const { inputSchema } = selectedTool;
    const properties = inputSchema.properties || {};

    return (
      <Card title="参数配置" size="small" style={{ marginTop: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleParameterChange}
        >
          {Object.entries(properties).map(([key, schema]) => (
            <Form.Item
              key={key}
              name={key}
              label={key}
              rules={[
                { 
                  required: inputSchema.required?.includes(key),
                  message: `请输入${key}` 
                }
              ]}
            >
              {schema.enum ? (
                <Select placeholder={schema.description}>
                  {schema.enum.map(option => (
                    <Option key={option} value={option}>
                      {option}
                    </Option>
                  ))}
                </Select>
              ) : (
                <Input 
                  placeholder={schema.description}
                  type={schema.type === 'number' ? 'number' : 'text'}
                />
              )}
            </Form.Item>
          ))}
          
          <Button 
            type="primary" 
            onClick={handleToolCall}
            loading={isLoading}
            disabled={!currentParameters || Object.keys(currentParameters).length === 0}
          >
            调用工具
          </Button>
        </Form>
      </Card>
    );
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {lastError && (
        <Alert 
          message="错误" 
          description={lastError} 
          type="error" 
          closable 
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title="可用工具" loading={isLoading}>
        {tools.length === 0 ? (
          <Empty description="暂无可用工具" />
        ) : (
          <List
            dataSource={tools}
            renderItem={(tool) => (
              <List.Item
                className={`tool-card ${selectedTool?.name === tool.name ? 'selected' : ''}`}
                onClick={() => handleToolSelect(tool)}
                style={{ 
                  cursor: 'pointer',
                  padding: 12,
                  border: selectedTool?.name === tool.name ? '2px solid #1890ff' : '1px solid #f0f0f0',
                  borderRadius: 8,
                  marginBottom: 8
                }}
              >
                <List.Item.Meta
                  title={tool.name}
                  description={tool.description || '无描述'}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {selectedTool && (
        <Card title={`工具详情: ${selectedTool.name}`} size="small" style={{ marginTop: 16 }}>
          <p><strong>描述:</strong> {selectedTool.description || '无'}</p>
          <p><strong>参数结构:</strong></p>
          <pre className="code-block">
            {JSON.stringify(selectedTool.inputSchema, null, 2)}
          </pre>
        </Card>
      )}

      {securityCheck && (
        <SecurityWarning 
          securityCheck={securityCheck}
          style={{ marginTop: 16 }}
        />
      )}

      {renderParameterForm()}

      <ResultDisplay />
    </div>
  );
};

export default ToolsPanel; 