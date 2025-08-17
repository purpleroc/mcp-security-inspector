import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Select, Switch, Space, message } from 'antd';
import { ApiOutlined, SaveOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { connectToServer, disconnectFromServer } from '../store/mcpSlice';
import { RootState } from '../store';
import { MCPServerConfig, MCPTransportMode } from '../types/mcp';
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
  const { connectionStatus, serverConfig, serverInfo } = useSelector((state: RootState) => state.mcp);
  const [authConfig, setAuthConfig] = useState<any>({ type: 'none' });
  const [autoSave, setAutoSave] = useState(true);

  // 监听选中的配置变化
  useEffect(() => {
    if (selectedConfig) {
      form.setFieldsValue({
        name: selectedConfig.name,
        host: selectedConfig.host,
        transport: selectedConfig.transport,
        ssePath: selectedConfig.ssePath,
        sessionId: selectedConfig.sessionId
      });
      setAuthConfig(selectedConfig.auth || { type: 'none' });
    }
  }, [selectedConfig, form]);

  // 连接到服务器
  const handleConnect = async (values: any) => {
    try {
      const serverConfig: MCPServerConfig = {
        name: values.name || 'MCP Server', // 如果没有填写名称，使用默认值
        host: values.host,
        ssePath: values.ssePath, // 两种模式都需要路径
        messagePath: '', // 现在从SSE自动获取，不需要配置
        transport: values.transport as MCPTransportMode, // 使用选择的传输方式
        sessionId: values.sessionId || undefined,
        headers: values.headers ? JSON.parse(values.headers || '{}') : undefined,
        auth: authConfig // 添加认证配置
      };
      
      const result = await dispatch(connectToServer(serverConfig) as any).unwrap();
      message.success(t.config.messages.connectSuccess);
      
      // 确定最终的配置（如果服务器返回了名称且用户没有填写名称，使用服务器名称）
      const finalConfig = (result.serverInfo && (!values.name || values.name === 'MCP Server'))
        ? { ...serverConfig, name: result.serverInfo.serverInfo.name }
        : serverConfig;
      
      // 如果服务器返回了名称且用户没有填写名称，更新表单显示
      if (result.serverInfo && (!values.name || values.name === 'MCP Server')) {
        form.setFieldsValue({ name: result.serverInfo.serverInfo.name });
      }
      
      // 连接成功后自动保存配置
      if (autoSave) {
        const saved = storage.saveMCPConfig(finalConfig);
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
        onConfigLoad(finalConfig);
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
        name: values.name || 'MCP Server',
        host: values.host,
        ssePath: values.ssePath, // 两种模式都需要路径
        messagePath: '',
        transport: values.transport as MCPTransportMode,
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
            rules={[]}
          >
            <Input placeholder={t.config.serverNamePlaceholder} />
          </Form.Item>

          <Form.Item
            name="transport"
            label={t.config.transportMode}
            rules={[{ required: true, message: t.config.messages.transportModeRequired }]}
            tooltip={t.config.transportModeTooltip}
          >
            <Select placeholder={t.config.transportModePlaceholder}>
              <Select.Option value="sse">{t.config.transportModes.sse}</Select.Option>
              <Select.Option value="streamable">{t.config.transportModes.streamable}</Select.Option>
            </Select>
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
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.transport !== currentValues.transport}
          >
            {({ getFieldValue, setFieldsValue }) => {
              const transport = getFieldValue('transport');
              
              // 当传输模式改变时，自动更新路径默认值（移除useEffect，直接在渲染时检查）
              const currentPath = getFieldValue('ssePath');
              if (!currentPath || currentPath === '/sse' || currentPath === '/mcp') {
                const newPath = transport === 'sse' ? '/sse' : '/mcp';
                if (currentPath !== newPath) {
                  // 使用 setTimeout 避免在渲染过程中更新状态
                  setTimeout(() => {
                    setFieldsValue({
                      ssePath: newPath
                    });
                  }, 0);
                }
              }
              
              return (
                <Form.Item
                  name="ssePath"
                  label={transport === 'sse' ? t.config.ssePath : t.config.mcpPath}
                  rules={[{ required: true, message: transport === 'sse' ? t.config.messages.ssePathRequired : t.config.messages.mcpPathRequired }]}
                  tooltip={transport === 'sse' ? t.config.ssePathPlaceholder : t.config.mcpPathPlaceholder}
                >
                  <Input placeholder={transport === 'sse' ? t.config.ssePathPlaceholder : t.config.mcpPathPlaceholder} />
                </Form.Item>
              );
            }}
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
              <p><strong>{t.config.transportMode}:</strong> {
                serverConfig?.transport === 'streamable' 
                  ? t.config.transportModes.streamable 
                  : t.config.transportModes.sse
              }</p>
              <p><strong>{t.config.authType}:</strong> {
                (() => {
                  const authType = serverConfig?.auth?.type;
                  if (!authType || authType === 'none') return t.auth.none;
                  if (authType === 'combined') return t.auth.combined;
                  return t.auth.none;
                })()
              }</p>
              {serverInfo && (
                <>
                  <p><strong>{t.config.protocolVersion}:</strong> {serverInfo.protocolVersion}</p>
                  <p><strong>{t.config.serverVersion}:</strong> {serverInfo.serverInfo.name} v{serverInfo.serverInfo.version}</p>
                </>
              )}
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