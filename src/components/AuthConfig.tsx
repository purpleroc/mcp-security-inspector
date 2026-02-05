import React from 'react';
import { Form, Input, Switch, Card, Space, Button } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { AuthConfig } from '../types/mcp';
import { useI18n } from '../hooks/useI18n';

interface AuthConfigProps {
  value?: AuthConfig;
  onChange?: (value: AuthConfig) => void;
}

// 验证字符串是否只包含 ISO-8859-1 字符（HTTP 请求头要求）
const isValidHeaderString = (str: string): boolean => {
  if (!str) return true;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    // ISO-8859-1 字符范围: 0-255
    if (charCode > 255) {
      return false;
    }
  }
  return true;
};

const AuthConfigComponent: React.FC<AuthConfigProps> = ({ value, onChange }) => {
  const { t } = useI18n();
  const authEnabled = value?.type === 'combined';

  const handleAuthToggle = (enabled: boolean) => {
    if (enabled) {
      onChange?.({
        type: 'combined'
      });
    } else {
      onChange?.({ type: 'none' });
    }
  };

  const handleCombinedChange = (section: 'apiKey' | 'urlParams' | 'customHeaders' | 'basicAuth', data: any) => {
    if (value?.type === 'combined') {
      onChange?.({ 
        ...value, 
        [section]: data
      });
    }
  };

  return (
    <Card title={t.config.authentication} size="small" style={{ marginBottom: 16 }}>
      <Form.Item label={t.auth.combinedMode} valuePropName="checked">
        <Switch
          checked={authEnabled}
          onChange={handleAuthToggle}
        />
        <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--text-secondary)' }}>
          {authEnabled ? t.auth.enableAuthMode : t.auth.none}
        </span>
      </Form.Item>

      {authEnabled && (
        <div>
          <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-success)', marginBottom: '4px' }}>
              {t.auth.combinedMode}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {t.auth.combinedModeDesc}
            </div>
          </div>

          {/* API Key 配置 */}
          <Form.Item label={t.auth.enableApiKey} valuePropName="checked">
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
            <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--text-secondary)' }}>
              {t.auth.enableApiKey}
            </span>
          </Form.Item>

          {value?.type === 'combined' && value.apiKey && (
            <div style={{ marginLeft: 24, marginBottom: 16 }}>
              <Form.Item label={t.auth.apiKeyLabel} required>
                <Input.Password
                  placeholder={t.auth.apiKeyPlaceholder}
                  value={value.apiKey.apiKey || ''}
                  onChange={(e) => handleCombinedChange('apiKey', { ...value.apiKey, apiKey: e.target.value })}
                />
              </Form.Item>
              <Form.Item label={t.auth.headerName}>
                <Input
                  placeholder={t.auth.headerNamePlaceholder}
                  value={value.apiKey.headerName || 'Authorization'}
                  onChange={(e) => handleCombinedChange('apiKey', { ...value.apiKey, headerName: e.target.value })}
                />
              </Form.Item>
              <Form.Item label={t.auth.prefix}>
                <Input
                  placeholder={t.auth.prefixPlaceholder}
                  value={value.apiKey.prefix || 'Bearer '}
                  onChange={(e) => handleCombinedChange('apiKey', { ...value.apiKey, prefix: e.target.value })}
                />
              </Form.Item>
            </div>
          )}

          {/* URL 参数配置 */}
          <Form.Item label={t.auth.enableUrlParams} valuePropName="checked">
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
            <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--text-secondary)' }}>
              {t.auth.enableUrlParams}
            </span>
          </Form.Item>

          {value?.type === 'combined' && value.urlParams !== undefined && (
            <div style={{ marginLeft: 24, marginBottom: 16 }}>
              {value.urlParams.map((param, index) => (
                <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Input 
                    placeholder={t.auth.paramName} 
                    style={{ width: 150 }}
                    value={param.name || ''}
                    onChange={(e) => {
                      const params = [...value.urlParams!];
                      params[index] = { ...params[index], name: e.target.value };
                      handleCombinedChange('urlParams', params);
                    }}
                  />
                  <Input 
                    placeholder={t.auth.paramValue} 
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
                {t.auth.addParam}
              </Button>
            </div>
          )}

          {/* Basic Auth 配置 */}
          <Form.Item label={t.auth.basic} valuePropName="checked">
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
            <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--text-secondary)' }}>
              {t.auth.basic}
            </span>
          </Form.Item>

          {value?.type === 'combined' && value.basicAuth && (
            <div style={{ marginLeft: 24, marginBottom: 16 }}>
              <Form.Item label={t.auth.username}>
                <Input
                  placeholder={t.auth.usernamePlaceholder}
                  value={value.basicAuth.username || ''}
                  onChange={(e) => handleCombinedChange('basicAuth', { ...value.basicAuth, username: e.target.value })}
                />
              </Form.Item>
              <Form.Item label={t.auth.password}>
                <Input.Password
                  placeholder={t.auth.passwordPlaceholder}
                  value={value.basicAuth.password || ''}
                  onChange={(e) => handleCombinedChange('basicAuth', { ...value.basicAuth, password: e.target.value })}
                />
              </Form.Item>
            </div>
          )}

          {/* 自定义请求头配置 */}
          <Form.Item label={t.auth.enableCustomHeaders} valuePropName="checked">
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
            <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--text-secondary)' }}>
              {t.auth.enableCustomHeaders}
            </span>
          </Form.Item>

          {value?.type === 'combined' && value.customHeaders !== undefined && (
            <div style={{ marginLeft: 24 }}>
              {value.customHeaders.map((header, index) => {
                const nameValid = isValidHeaderString(header.name || '');
                const valueValid = isValidHeaderString(header.value || '');
                const hasError = !nameValid || !valueValid;
                
                return (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Space style={{ display: 'flex' }} align="baseline">
                      <Input 
                        placeholder={t.auth.headerName} 
                        style={{ width: 200 }}
                        status={!nameValid ? 'error' : undefined}
                        value={header.name || ''}
                        onChange={(e) => {
                          const headers = [...value.customHeaders!];
                          headers[index] = { ...headers[index], name: e.target.value };
                          handleCombinedChange('customHeaders', headers);
                        }}
                      />
                      <Input 
                        placeholder={t.auth.headerValue} 
                        style={{ width: 250 }}
                        status={!valueValid ? 'error' : undefined}
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
                    {hasError && (
                      <div style={{ color: 'var(--color-error)', fontSize: '12px', marginTop: 4 }}>
                        {t.auth.headerInvalidChars}
                      </div>
                    )}
                  </div>
                );
              })}
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
                {t.auth.custom}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AuthConfigComponent; 