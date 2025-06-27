import React, { useEffect } from 'react';
import { Form, Input, Select, Button, Space, Card, Divider, Switch } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { AuthConfig, AuthType } from '../types/mcp';

interface AuthConfigProps {
  value?: AuthConfig;
  onChange?: (value: AuthConfig) => void;
}

const AuthConfigComponent: React.FC<AuthConfigProps> = ({ value, onChange }) => {
  const authType = value?.type || 'none';

  const handleAuthTypeChange = (type: AuthType) => {
    let newConfig: AuthConfig;
    switch (type) {
      case 'none':
        newConfig = { type: 'none' };
        break;
      case 'url_params':
        newConfig = { type: 'url_params', params: [] };
        break;
      case 'headers':
        newConfig = { 
          type: 'headers', 
          headers: [],
          useBasicAuth: false
        };
        break;
      default:
        newConfig = { type: 'none' };
    }
    onChange?.(newConfig);
  };

  const handleParamsChange = (params: Array<{ name: string; value: string }>) => {
    if (value?.type === 'url_params') {
      onChange?.({ 
        ...value, 
        params: params || []
      });
    }
  };

  const handleHeadersChange = (headers: Array<{ name: string; value: string }>) => {
    if (value?.type === 'headers') {
      onChange?.({ 
        ...value, 
        headers: headers || []
      });
    }
  };

  const handleBasicAuthToggle = (useBasicAuth: boolean) => {
    if (value?.type === 'headers') {
      onChange?.({ 
        ...value, 
        useBasicAuth,
        basicAuthUsername: useBasicAuth ? value.basicAuthUsername || '' : undefined,
        basicAuthPassword: useBasicAuth ? value.basicAuthPassword || '' : undefined
      });
    }
  };

  const handleBasicAuthChange = (field: 'basicAuthUsername' | 'basicAuthPassword', val: string) => {
    if (value?.type === 'headers') {
      onChange?.({ 
        ...value, 
        [field]: val
      });
    }
  };

  return (
    <Card title="认证配置" size="small" style={{ marginBottom: 16 }}>
      <Form.Item label="认证类型">
        <Select
          value={authType}
          onChange={handleAuthTypeChange}
          options={[
            { label: '无认证', value: 'none' },
            { label: 'URL参数认证', value: 'url_params' },
            { label: '请求头认证', value: 'headers' }
          ]}
        />
      </Form.Item>

      {authType === 'url_params' && (
        <div>
          <Form.Item label="URL参数">
            <Form.List
              name={['auth', 'params']}
              initialValue={value?.type === 'url_params' ? value.params : []}
            >
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: '请输入参数名' }]}
                      >
                        <Input 
                          placeholder="参数名" 
                          style={{ width: 150 }}
                          onChange={(e) => {
                            // 实时更新认证配置
                            const params = [...(value?.type === 'url_params' ? value.params : [])];
                            if (params[name]) {
                              params[name] = { ...params[name], name: e.target.value };
                            } else {
                              params[name] = { name: e.target.value, value: '' };
                            }
                            handleParamsChange(params);
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '请输入参数值' }]}
                      >
                        <Input 
                          placeholder="参数值" 
                          style={{ width: 200 }}
                          onChange={(e) => {
                            // 实时更新认证配置
                            const params = [...(value?.type === 'url_params' ? value.params : [])];
                            if (params[name]) {
                              params[name] = { ...params[name], value: e.target.value };
                            } else {
                              params[name] = { name: '', value: e.target.value };
                            }
                            handleParamsChange(params);
                          }}
                        />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => {
                        remove(name);
                        // 同时从认证配置中移除
                        const params = [...(value?.type === 'url_params' ? value.params : [])];
                        params.splice(name, 1);
                        handleParamsChange(params);
                      }} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => {
                      add();
                      // 同时添加到认证配置
                      const params = [...(value?.type === 'url_params' ? value.params : [])];
                      params.push({ name: '', value: '' });
                      handleParamsChange(params);
                    }} block icon={<PlusOutlined />}>
                      添加URL参数
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>
        </div>
      )}

      {authType === 'headers' && (
        <div>
          <Form.Item label="Basic Auth" valuePropName="checked">
            <Switch
              checked={value?.type === 'headers' ? value.useBasicAuth : false}
              onChange={handleBasicAuthToggle}
            />
            <span style={{ marginLeft: 8, fontSize: '12px', color: '#666' }}>
              启用Basic Authentication
            </span>
          </Form.Item>

          {value?.type === 'headers' && value.useBasicAuth && (
            <>
              <Form.Item label="用户名">
                <Input
                  placeholder="Basic Auth用户名"
                  value={value.basicAuthUsername || ''}
                  onChange={(e) => handleBasicAuthChange('basicAuthUsername', e.target.value)}
                />
              </Form.Item>
              <Form.Item label="密码">
                <Input.Password
                  placeholder="Basic Auth密码"
                  value={value.basicAuthPassword || ''}
                  onChange={(e) => handleBasicAuthChange('basicAuthPassword', e.target.value)}
                />
              </Form.Item>
              <Divider style={{ margin: '12px 0' }} />
            </>
          )}

          <Form.Item label="自定义请求头">
            <Form.List
              name={['auth', 'headers']}
              initialValue={value?.type === 'headers' ? value.headers : []}
            >
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: '请输入请求头名称' }]}
                      >
                        <Input 
                          placeholder="请求头名称（如：Authorization）" 
                          style={{ width: 200 }}
                          onChange={(e) => {
                            // 实时更新认证配置
                            const headers = [...(value?.type === 'headers' ? value.headers : [])];
                            if (headers[name]) {
                              headers[name] = { ...headers[name], name: e.target.value };
                            } else {
                              headers[name] = { name: e.target.value, value: '' };
                            }
                            handleHeadersChange(headers);
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '请输入请求头值' }]}
                      >
                        <Input 
                          placeholder="请求头值" 
                          style={{ width: 250 }}
                          onChange={(e) => {
                            // 实时更新认证配置
                            const headers = [...(value?.type === 'headers' ? value.headers : [])];
                            if (headers[name]) {
                              headers[name] = { ...headers[name], value: e.target.value };
                            } else {
                              headers[name] = { name: '', value: e.target.value };
                            }
                            handleHeadersChange(headers);
                          }}
                        />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => {
                        remove(name);
                        // 同时从认证配置中移除
                        const headers = [...(value?.type === 'headers' ? value.headers : [])];
                        headers.splice(name, 1);
                        handleHeadersChange(headers);
                      }} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => {
                      add();
                      // 同时添加到认证配置
                      const headers = [...(value?.type === 'headers' ? value.headers : [])];
                      headers.push({ name: '', value: '' });
                      handleHeadersChange(headers);
                    }} block icon={<PlusOutlined />}>
                      添加自定义请求头
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </Form.Item>
        </div>
      )}
    </Card>
  );
};

export default AuthConfigComponent; 