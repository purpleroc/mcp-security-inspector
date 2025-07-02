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
import { useI18n } from '../hooks/useI18n';

const { Text } = Typography;

const PromptsPanel: React.FC = () => {
  const { t } = useI18n();
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
      <Card title={t.prompts.arguments} size="small" style={{ marginTop: 16 }}>
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
                  message: `${t.prompts.pleaseInput}${arg.name}` 
                }
              ]}
            >
              <Input 
                placeholder={arg.description || `${t.prompts.pleaseInput}${arg.name}`}
              />
            </Form.Item>
          ))}
          
          <Button 
            type="primary" 
            htmlType="submit"
            loading={isLoading}
          >
            {t.prompts.getPrompt}
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

      <Card title={t.prompts.title} loading={isLoading}>
        {prompts.length === 0 ? (
          <Empty description={t.prompts.noPrompts} />
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
                      <div>{prompt.description || t.prompts.promptName}</div>
                      {prompt.arguments && prompt.arguments.length > 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t.prompts.arguments}: {prompt.arguments.map(arg => arg.name).join(', ')}
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
        <Card title={`${t.prompts.promptName}: ${selectedPrompt.name}`} size="small" style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <p><strong>{t.prompts.promptName}:</strong> {selectedPrompt.name}</p>
            <p><strong>{t.tools.description}:</strong> {selectedPrompt.description || t.prompts.promptName}</p>
            
            {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
              <div>
                <p><strong>{t.prompts.arguments}:</strong></p>
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
              {t.prompts.getPrompt}
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