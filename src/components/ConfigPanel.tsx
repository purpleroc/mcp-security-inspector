import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Switch, Space, message } from 'antd';
import { ApiOutlined, SaveOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { connectToServer, disconnectFromServer } from '../store/mcpSlice';
import { RootState } from '../store';
import { MCPServerConfig } from '../types/mcp';
import { storage } from '../utils/storage';
import AuthConfigComponent from './AuthConfig';
import { useI18n } from '../hooks/useI18n';

interface ConfigPanelProps {
  onConfigLoad?: (config: MCPServerConfig) => void;
  selectedConfig?: MCPServerConfig | null;
  onConfigSaved?: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onConfigLoad, selectedConfig, onConfigSaved }) => {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const { connectionStatus, serverConfig } = useSelector((state: RootState) => state.mcp);
  const [authConfig, setAuthConfig] = useState<any>({ type: 'none' });
  const [autoSave, setAutoSave] = useState(true);

  // 监听选中的配置变化
  useEffect(() => {
    if (selectedConfig) {
      form.setFieldsValue({
        name: selectedConfig.name,
        host: selectedConfig.host,
        ssePath: selectedConfig.ssePath,
        transport: selectedConfig.transport || 'sse',
        sessionId: selectedConfig.sessionId
      });
      setAuthConfig(selectedConfig.auth || { type: 'none' });
    }
  }, [selectedConfig, form]);

  // 连接到服务器
  const handleConnect = async (values: any) => {
    try {
      const serverConfig: MCPServerConfig = {
        name: values.name,
        host: values.host,
        ssePath: values.ssePath,
        messagePath: '', // 现在从SSE自动获取，不需要配置
        transport: 'sse', // 固定为SSE传输方式
        sessionId: values.sessionId || undefined,
        headers: values.headers ? JSON.parse(values.headers || '{}') : undefined,
        auth: authConfig // 添加认证配置
      };
      
      await dispatch(connectToServer(serverConfig) as any).unwrap();
      message.success(t.config.messages.connectSuccess);
      
      // 连接成功后自动保存配置
      if (autoSave) {
        const saved = storage.saveMCPConfig(serverConfig);
        if (saved) {
          message.success(t.config.messages.configSavedAuto);
          // 通知刷新配置列表
          if (onConfigSaved) {
            onConfigSaved();
          }
        }
      }
      
      // 通知父组件配置已加载
      if (onConfigLoad) {
        onConfigLoad(serverConfig);
      }
    } catch (error) {
      message.error(`${t.config.messages.connectFailed}: ${error}`);
    }
  };

  // 断开连接
  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectFromServer() as any).unwrap();
      message.success(t.config.messages.disconnectSuccess);
      // 断开连接后保持配置，不重置表单
    } catch (error) {
      message.error(`${t.config.messages.disconnectFailed}: ${error}`);
    }
  };

  // 手动保存配置
  const handleSaveConfig = () => {
    form.validateFields().then((values) => {
      if (!values.host || !values.ssePath) {
        message.error(t.errors.invalidConfig);
        return;
      }

      const serverConfig: MCPServerConfig = {
        name: values.name,
        host: values.host,
        ssePath: values.ssePath,
        messagePath: '',
        transport: 'sse',
        sessionId: values.sessionId || undefined,
        headers: values.headers ? JSON.parse(values.headers || '{}') : undefined,
        auth: authConfig
      };

      const saved = storage.saveMCPConfig(serverConfig);
      if (saved) {
        message.success(t.success.configSaved);
        // 通知刷新配置列表
        if (onConfigSaved) {
          onConfigSaved();
        }
      } else {
        message.error(t.errors.saveConfigFailed);
      }
    }).catch(() => {
      message.error(t.errors.invalidConfig);
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title={t.config.title} style={{ maxWidth: 700, margin: '0 auto' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleConnect}
          disabled={connectionStatus === 'connected'}
          initialValues={{
            transport: 'sse',
            name: 'MCP Server',
            host: 'http://127.0.0.1:8020',
            ssePath: '/sse'
          }}
        >
          <Form.Item
            name="name"
            label={t.config.serverName}
            rules={[{ required: true, message: t.config.messages.serverNameRequired }]}
          >
            <Input placeholder={t.config.serverNamePlaceholder} />
          </Form.Item>

          <Form.Item
            name="host"
            label={t.config.serverHost}
            rules={[
              { required: true, message: t.config.messages.serverHostRequired },
              {
                pattern: /^https?:\/\/[^\/\s]+$/,
                message: t.config.messages.serverHostFormat
              }
            ]}
            tooltip={t.config.serverHostPlaceholder}
          >
            <Input placeholder={t.config.serverHostPlaceholder} />
          </Form.Item>

          <Form.Item
            name="ssePath"
            label={t.config.ssePath}
            rules={[{ required: true, message: t.config.messages.ssePathRequired }]}
            tooltip={t.config.ssePathPlaceholder}
          >
            <Input placeholder={t.config.ssePathPlaceholder} />
          </Form.Item>

          <Form.Item label={t.config.authentication}>
            <AuthConfigComponent
              value={authConfig}
              onChange={setAuthConfig}
            />
          </Form.Item>

          <Form.Item label={t.config.autoSave} tooltip={t.config.autoSaveTooltip}>
            <Switch 
              checked={autoSave}
              onChange={setAutoSave}
              checkedChildren={t.common.ok}
              unCheckedChildren={t.common.cancel}
            />
          </Form.Item>

          {connectionStatus !== 'connected' && (
            <Form.Item>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={connectionStatus === 'connecting'}
                  icon={<ApiOutlined />}
                  block
                >
                  {connectionStatus === 'connecting' ? t.config.connectionStatus.connecting : t.common.connect}
                </Button>
                <Button 
                  type="default" 
                  icon={<SaveOutlined />}
                  block
                  onClick={handleSaveConfig}
                >
                  {t.config.saveConfig}
                </Button>
              </Space>
            </Form.Item>
          )}
        </Form>

        {/* 连接成功后的状态和断开按钮 */}
        {connectionStatus === 'connected' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
              <p><strong>{t.config.connectionStatus.connected}:</strong> {serverConfig?.name}</p>
              <p><strong>{t.config.serverHost}:</strong> {serverConfig?.host}</p>
              <p><strong>{t.config.authType}:</strong> {
                (() => {
                  const authType = serverConfig?.auth?.type;
                  if (!authType || authType === 'none') return t.auth.none;
                  if (authType === 'combined') return t.auth.combined;
                  return t.auth.none;
                })()
              }</p>
            </div>
            
            <Button 
              type="default" 
              onClick={handleDisconnect}
              icon={<DisconnectOutlined />}
              danger
              block
            >
              {t.common.disconnect}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ConfigPanel; 