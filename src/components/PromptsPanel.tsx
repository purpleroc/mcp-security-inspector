import React, { useEffect } from 'react';
import { Card, List, Button, Alert, Empty, Form, Input, Typography } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { 
  fetchPrompts, 
  setSelectedPrompt, 
  getPrompt 
} from '../store/mcpSlice';
import { MCPPrompt } from '../types/mcp';
import ResultDisplay from './ResultDisplay';

const { Text } = Typography;

const PromptsPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    prompts, 
    selectedPrompt, 
    isLoading, 
    lastError 
  } = useSelector((state: RootState) => state.mcp);

  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchPrompts() as any);
  }, [dispatch]);

  const handlePromptSelect = (prompt: MCPPrompt) => {
    dispatch(setSelectedPrompt(prompt));
    form.resetFields();
  };

  const handlePromptGet = async (values: Record<string, unknown>) => {
    if (!selectedPrompt) return;
    
    try {
      await dispatch(getPrompt({ 
        prompt: selectedPrompt,
        parameters: values
      }) as any).unwrap();
    } catch (error) {
      console.error('Prompt get failed:', error);
    }
  };

  const renderArgumentForm = () => {
    if (!selectedPrompt || !selectedPrompt.arguments) return null;

    return (
      <Card title="参数配置" size="small" style={{ marginTop: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePromptGet}
        >
          {selectedPrompt.arguments.map((arg) => (
            <Form.Item
              key={arg.name}
              name={arg.name}
              label={arg.name}
              rules={[
                { 
                  required: arg.required,
                  message: `请输入${arg.name}` 
                }
              ]}
            >
              <Input 
                placeholder={arg.description || `输入${arg.name}`}
              />
            </Form.Item>
          ))}
          
          <Button 
            type="primary" 
            htmlType="submit"
            loading={isLoading}
          >
            获取提示
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

      <Card title="可用提示" loading={isLoading}>
        {prompts.length === 0 ? (
          <Empty description="暂无可用提示" />
        ) : (
          <List
            dataSource={prompts}
            renderItem={(prompt) => (
              <List.Item
                className={`tool-card ${selectedPrompt?.name === prompt.name ? 'selected' : ''}`}
                onClick={() => handlePromptSelect(prompt)}
                style={{ 
                  cursor: 'pointer',
                  padding: 12,
                  border: selectedPrompt?.name === prompt.name ? '2px solid #1890ff' : '1px solid #f0f0f0',
                  borderRadius: 8,
                  marginBottom: 8
                }}
              >
                <List.Item.Meta
                  title={prompt.name}
                  description={
                    <div>
                      <div>{prompt.description || '无描述'}</div>
                      {prompt.arguments && prompt.arguments.length > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          参数: {prompt.arguments.map(arg => arg.name).join(', ')}
                        </Text>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {selectedPrompt && (
        <Card title={`提示详情: ${selectedPrompt.name}`} size="small" style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <p><strong>名称:</strong> {selectedPrompt.name}</p>
            <p><strong>描述:</strong> {selectedPrompt.description || '无'}</p>
            
            {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
              <div>
                <p><strong>参数:</strong></p>
                <ul style={{ paddingLeft: 20 }}>
                  {selectedPrompt.arguments.map((arg) => (
                    <li key={arg.name}>
                      <Text strong>{arg.name}</Text>
                      {arg.required && <Text type="danger"> *</Text>}
                      {arg.description && <Text type="secondary"> - {arg.description}</Text>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {(!selectedPrompt.arguments || selectedPrompt.arguments.length === 0) && (
            <Button 
              type="primary" 
              onClick={() => handlePromptGet({})}
              loading={isLoading}
            >
              获取提示
            </Button>
          )}
        </Card>
      )}

      {renderArgumentForm()}

      <ResultDisplay />
    </div>
  );
};

export default PromptsPanel; 