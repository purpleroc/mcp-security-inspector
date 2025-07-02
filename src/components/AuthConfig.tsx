import React, { useEffect } from 'react';
import { Form, Input, Select, Button, Space, Card, Divider, Switch } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { AuthConfig, AuthType } from '../types/mcp';

interface AuthConfigProps {
  value?: AuthConfig;
  onChange?: (value: AuthConfig) => void;
}

const AuthConfigComponent: React.FC<AuthConfigProps> = ({ value, onChange }) => {
  const authEnabled = value?.type === 'combined';

  const handleAuthToggle = (enabled: boolean) => {
    if (enabled) {
      onChange?.({ type: 'combined' });
    } else {
      onChange?.({ type: 'none' });
    }
  };

  // 组合认证处理方法
  const handleCombinedChange = (section: 'apiKey' | 'urlParams' | 'customHeaders' | 'basicAuth', data: any) => {
    if (value?.type === 'combined') {
      onChange?.({ 
        ...value, 
        [section]: data
      });
    }
  };

  return (
    <Card title="认证配置" size="small" style={{ marginBottom: 16 }}>
      <Form.Item label="启用认证" valuePropName="checked">
        <Switch
          checked={authEnabled}
          onChange={handleAuthToggle}
        />
        <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
          {authEnabled ? '已启用认证功能' : '未启用认证'}
        </span>
      </Form.Item>

      {authEnabled && (
        <div>
          <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
              组合认证模式
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              可以同时配置多种认证方式，系统会自动组合应用这些认证配置
            </div>
          </div>

          {/* API Key 配置 */}
          <Form.Item label="API Key 认证" valuePropName="checked">
            <Switch
              checked={value?.type === 'combined' && !!value.apiKey}
              onChange={(checked) => {
                if (checked) {
                  handleCombinedChange('apiKey', {
                    apiKey: '',
                    headerName: 'Authorization',
                    prefix: 'Bearer '
                  });
                } else {
                  handleCombinedChange('apiKey', undefined);
                }
              }}
            />
            <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
              启用 API Key 认证
            </span>
          </Form.Item>

          {value?.type === 'combined' && value.apiKey && (
            <div style={{ marginLeft: 24, marginBottom: 16 }}>
              <Form.Item label="API Key" required>
                <Input.Password
                  placeholder="请输入API Key"
                  value={value.apiKey.apiKey || ''}
                  onChange={(e) => handleCombinedChange('apiKey', { ...value.apiKey, apiKey: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="请求头名称">
                <Input
                  placeholder="Authorization"
                  value={value.apiKey.headerName || 'Authorization'}
                  onChange={(e) => handleCombinedChange('apiKey', { ...value.apiKey, headerName: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="前缀">
                <Input
                  placeholder="Bearer "
                  value={value.apiKey.prefix || 'Bearer '}
                  onChange={(e) => handleCombinedChange('apiKey', { ...value.apiKey, prefix: e.target.value })}
                />
              </Form.Item>
            </div>
          )}

          {/* URL 参数配置 */}
          <Form.Item label="URL 参数认证" valuePropName="checked">
            <Switch
              checked={value?.type === 'combined' && !!value.urlParams}
              onChange={(checked) => {
                if (checked) {
                  handleCombinedChange('urlParams', [{ name: '', value: '' }]);
                } else {
                  handleCombinedChange('urlParams', undefined);
                }
              }}
            />
            <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
              启用 URL 参数认证
            </span>
          </Form.Item>

          {value?.type === 'combined' && value.urlParams !== undefined && (
            <div style={{ marginLeft: 24, marginBottom: 16 }}>
              {value.urlParams.map((param, index) => (
                <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Input 
                    placeholder="参数名" 
                    style={{ width: 150 }}
                    value={param.name || ''}
                    onChange={(e) => {
                      const params = [...value.urlParams!];
                      params[index] = { ...params[index], name: e.target.value };
                      handleCombinedChange('urlParams', params);
                    }}
                  />
                  <Input 
                    placeholder="参数值" 
                    style={{ width: 200 }}
                    value={param.value || ''}
                    onChange={(e) => {
                      const params = [...value.urlParams!];
                      params[index] = { ...params[index], value: e.target.value };
                      handleCombinedChange('urlParams', params);
                    }}
                  />
                  <MinusCircleOutlined onClick={() => {
                    const params = [...value.urlParams!];
                    params.splice(index, 1);
                    handleCombinedChange('urlParams', params.length > 0 ? params : [{ name: '', value: '' }]);
                  }} />
                </Space>
              ))}
              <Button 
                type="dashed" 
                onClick={() => {
                  const params = [...(value.urlParams || [])];
                  params.push({ name: '', value: '' });
                  handleCombinedChange('urlParams', params);
                }} 
                block 
                icon={<PlusOutlined />}
                style={{ marginTop: 8 }}
              >
                添加URL参数
              </Button>
            </div>
          )}

          {/* Basic Auth 配置 */}
          <Form.Item label="Basic Auth 认证" valuePropName="checked">
            <Switch
              checked={value?.type === 'combined' && !!value.basicAuth}
              onChange={(checked) => {
                if (checked) {
                  handleCombinedChange('basicAuth', { username: '', password: '' });
                } else {
                  handleCombinedChange('basicAuth', undefined);
                }
              }}
            />
            <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
              启用 Basic Auth 认证
            </span>
          </Form.Item>

          {value?.type === 'combined' && value.basicAuth && (
            <div style={{ marginLeft: 24, marginBottom: 16 }}>
              <Form.Item label="用户名">
                <Input
                  placeholder="Basic Auth用户名"
                  value={value.basicAuth.username || ''}
                  onChange={(e) => handleCombinedChange('basicAuth', { ...value.basicAuth, username: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="密码">
                <Input.Password
                  placeholder="Basic Auth密码"
                  value={value.basicAuth.password || ''}
                  onChange={(e) => handleCombinedChange('basicAuth', { ...value.basicAuth, password: e.target.value })}
                />
              </Form.Item>
            </div>
          )}

          {/* 自定义请求头配置 */}
          <Form.Item label="自定义请求头" valuePropName="checked">
            <Switch
              checked={value?.type === 'combined' && !!value.customHeaders}
              onChange={(checked) => {
                if (checked) {
                  handleCombinedChange('customHeaders', [{ name: '', value: '' }]);
                } else {
                  handleCombinedChange('customHeaders', undefined);
                }
              }}
            />
            <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
              启用自定义请求头
            </span>
          </Form.Item>

          {value?.type === 'combined' && value.customHeaders !== undefined && (
            <div style={{ marginLeft: 24 }}>
              {value.customHeaders.map((header, index) => (
                <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Input 
                    placeholder="请求头名称" 
                    style={{ width: 200 }}
                    value={header.name || ''}
                    onChange={(e) => {
                      const headers = [...value.customHeaders!];
                      headers[index] = { ...headers[index], name: e.target.value };
                      handleCombinedChange('customHeaders', headers);
                    }}
                  />
                  <Input 
                    placeholder="请求头值" 
                    style={{ width: 250 }}
                    value={header.value || ''}
                    onChange={(e) => {
                      const headers = [...value.customHeaders!];
                      headers[index] = { ...headers[index], value: e.target.value };
                      handleCombinedChange('customHeaders', headers);
                    }}
                  />
                  <MinusCircleOutlined onClick={() => {
                    const headers = [...value.customHeaders!];
                    headers.splice(index, 1);
                    handleCombinedChange('customHeaders', headers.length > 0 ? headers : [{ name: '', value: '' }]);
                  }} />
                </Space>
              ))}
              <Button 
                type="dashed" 
                onClick={() => {
                  const headers = [...(value.customHeaders || [])];
                  headers.push({ name: '', value: '' });
                  handleCombinedChange('customHeaders', headers);
                }} 
                block 
                icon={<PlusOutlined />}
                style={{ marginTop: 8 }}
              >
                添加自定义请求头
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AuthConfigComponent; 