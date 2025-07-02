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
import { useI18n } from '../hooks/useI18n';

const { Option } = Select;

const ToolsPanel: React.FC = () => {
  const { t } = useI18n();
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
      <Card title={t.tools.parameters} size="small" style={{ marginTop: 16 }}>
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
                  message: `${t.tools.pleaseInput}${key}` 
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
            {t.tools.callTool}
          </Button>
        </Form>
      </Card>
    );
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {lastError && (
        <Alert 
          message={t.common.error} 
          description={lastError} 
          type="error" 
          closable 
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title={t.tools.title} loading={isLoading}>
        {tools.length === 0 ? (
          <Empty description={t.tools.noTools} />
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
                  description={tool.description || t.tools.description}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {selectedTool && (
        <Card title={`${t.tools.toolName}: ${selectedTool.name}`} size="small" style={{ marginTop: 16 }}>
          <p><strong>{t.tools.description}:</strong> {selectedTool.description || t.tools.description}</p>
          <p><strong>{t.tools.parameters}:</strong></p>
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