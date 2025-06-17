import React from 'react';
import { Form, Input, Select, Button, Card, Space, message, Divider } from 'antd';
import { ApiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { connectToServer, disconnectFromServer } from '../store/mcpSlice';
import { MCPServerConfig } from '../types/mcp';

const ConfigPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { connectionStatus, serverConfig } = useSelector((state: RootState) => state.mcp);
  const [form] = Form.useForm();

  // 连接到服务器
  const handleConnect = async (values: any) => {
    try {
      // 验证必要字段
      if (!values.host || !values.ssePath) {
        message.error('请填写完整的配置信息');
        return;
      }

      const serverConfig: MCPServerConfig = {
        name: values.name,
        host: values.host,
        ssePath: values.ssePath,
        messagePath: '', // 现在从SSE自动获取，不需要配置
        transport: 'sse', // 固定为SSE传输方式
        apiKey: values.apiKey || undefined,
        sessionId: values.sessionId || undefined,
        headers: values.headers ? JSON.parse(values.headers || '{}') : undefined
      };
      
      await dispatch(connectToServer(serverConfig) as any).unwrap();
      message.success('连接成功');
    } catch (error) {
      message.error(`连接失败: ${error}`);
    }
  };

  // 断开连接
  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectFromServer() as any).unwrap();
      message.success('已断开连接');
      form.resetFields();
    } catch (error) {
      message.error(`断开连接失败: ${error}`);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="MCP服务器配置" style={{ maxWidth: 600, margin: '0 auto' }}>
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
            label="服务器名称"
            rules={[{ required: true, message: '请输入服务器名称' }]}
          >
            <Input placeholder="例如: Docs Server" />
          </Form.Item>

          <Form.Item
            name="host"
            label="主机地址"
            rules={[
              { required: true, message: '请输入主机地址' },
              {
                pattern: /^https?:\/\/[^\/\s]+$/,
                message: '请输入正确的主机地址格式，例如: http://127.0.0.1:8020 (不要包含路径)'
              }
            ]}
            tooltip="包含协议、主机和端口的基础URL，不要包含路径"
          >
            <Input placeholder="例如: http://127.0.0.1:8020" />
          </Form.Item>

          <Form.Item
            name="ssePath"
            label="SSE路径"
            rules={[{ required: true, message: '请输入SSE路径' }]}
            tooltip="SSE连接的路径，通常是 /sse。消息路径将从SSE响应中自动获取"
          >
            <Input placeholder="例如: /sse" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API密钥 (可选)"
          >
            <Input.Password placeholder="输入API密钥" />
          </Form.Item>

          {connectionStatus !== 'connected' && (
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={connectionStatus === 'connecting'}
                icon={<ApiOutlined />}
                block
              >
                {connectionStatus === 'connecting' ? '连接中...' : '连接'}
              </Button>
            </Form.Item>
          )}
        </Form>

        {/* 连接成功后的状态和断开按钮 */}
        {connectionStatus === 'connected' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
              <p><strong>已连接到:</strong> {serverConfig?.name}</p>
              <p><strong>地址:</strong> {serverConfig?.host}</p>
              <p><strong>传输方式:</strong> {serverConfig?.transport.toUpperCase()}</p>
            </div>
            
            <Button 
              type="default" 
              onClick={handleDisconnect}
              icon={<DisconnectOutlined />}
              danger
              block
            >
              断开连接
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ConfigPanel; 