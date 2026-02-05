import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Button, 
  Space, 
  Popconfirm, 
  message, 
  Upload, 
  Typography,
  Tooltip,
  Empty
} from 'antd';
import { 
  PlayCircleOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  UploadOutlined,
  DatabaseOutlined,
  DisconnectOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { connectToServer, disconnectFromServer } from '../store/mcpSlice';
import { RootState } from '../store';
import { storage } from '../utils/storage';
import { MCPServerConfig } from '../types/mcp';
import { useI18n } from '../hooks/useI18n';

const { Text } = Typography;

interface SavedConfig extends MCPServerConfig {
  createdAt?: number;
  updatedAt?: number;
}

interface MCPListPanelProps {
  onConfigLoad?: (config: MCPServerConfig) => void;
  refreshTrigger?: number;
}

const MCPListPanel: React.FC<MCPListPanelProps> = ({ onConfigLoad, refreshTrigger }) => {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  
  // 从状态中获取连接信息
  const { connectionStatus, serverConfig } = useSelector((state: RootState) => state.mcp);

  // 加载已保存的配置
  const loadSavedConfigs = () => {
    const configs = storage.getSavedConfigs();
    setSavedConfigs(configs);
  };

  useEffect(() => {
    loadSavedConfigs();
  }, []);

  // 监听刷新触发器
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadSavedConfigs();
    }
  }, [refreshTrigger]);

  // 检查配置是否为当前连接的配置
  const isCurrentConnection = (config: MCPServerConfig) => {
    return connectionStatus === 'connected' && 
           serverConfig &&
           serverConfig.name === config.name &&
           serverConfig.host === config.host &&
           serverConfig.ssePath === config.ssePath;
  };

  // 连接到指定配置
  const handleConnect = async (config: MCPServerConfig) => {
    setLoading(config.name);
    try {
      // 如果当前已连接到其他服务器，先断开连接
      if (connectionStatus === 'connected') {
        console.log(t.config.messages.disconnectSuccess);
        await dispatch(disconnectFromServer() as any).unwrap();
      }
      
      await dispatch(connectToServer(config) as any).unwrap();
      message.success(`${t.success.connected} - ${config.name}`);
      
      // 通知父组件配置已加载
      if (onConfigLoad) {
        onConfigLoad(config);
      }
    } catch (error) {
      message.error(`${t.errors.connectionFailed}: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  // 断开连接
  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectFromServer() as any).unwrap();
      message.success(t.config.messages.disconnectSuccess);
    } catch (error) {
      message.error(`${t.config.messages.disconnectFailed}: ${error}`);
    }
  };

  // 删除配置
  const handleDelete = (name: string) => {
    const success = storage.deleteMCPConfig(name);
    if (success) {
      message.success(t.success.configDeleted);
      loadSavedConfigs();
    } else {
      message.error(t.errors.saveConfigFailed);
    }
  };

  // 导出所有配置
  const handleExport = () => {
    const success = storage.exportAllConfigs();
    if (success) {
      message.success(t.success.exportSuccess);
    } else {
      message.error(t.errors.exportFailed);
    }
  };

  // 导入配置
  const handleImport = async (file: File) => {
    const success = await storage.importConfigs(file);
    if (success) {
      message.success(t.success.importSuccess);
      loadSavedConfigs();
    } else {
      message.error(t.errors.importFailed);
    }
    return false; // 阻止默认上传行为
  };

  // 格式化时间
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
      // 其他日期显示月/日 时:分
      return date.toLocaleDateString('zh-CN', { 
        month: 'numeric', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Card 
        title={
          <Space>
            <DatabaseOutlined />
            {t.config.savedConfigs}
          </Space>
        }
        size="small"
        extra={
          <Space>
            <Upload
              accept=".json"
              showUploadList={false}
              beforeUpload={handleImport}
            >
              <Button 
                type="text" 
                icon={<UploadOutlined />} 
                size="small"
                title={t.config.importConfigs}
              />
            </Upload>
            <Button 
              type="text" 
              icon={<DownloadOutlined />}
              onClick={handleExport}
              size="small"
              title={t.config.exportConfigs}
              disabled={savedConfigs.length === 0}
            />
          </Space>
        }
        bodyStyle={{ padding: '12px' }}
      >
        {savedConfigs.length === 0 ? (
          <Empty 
            description={t.config.noSavedConfigs}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ margin: '20px 0' }}
          />
        ) : (
          <List
            size="small"
            dataSource={savedConfigs}
            split={false}
            style={{ padding: '0' }}
            renderItem={(config) => {
              const isConnected = isCurrentConnection(config);
              return (
                <List.Item
                  key={config.name}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: isConnected ? 'var(--color-success-bg)' : 'var(--bg-elevated)',
                    border: `1px solid ${isConnected ? 'var(--color-success)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isConnected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isConnected) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }
                  }}
                >
                  <div style={{ width: '100%' }}>
                    {/* 服务器名称和状态 */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {config.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {config.host}
                        </div>
                      </div>
                      
                      {/* 连接状态指示器 */}
                      {isConnected && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'var(--color-success)',
                          borderRadius: '50%',
                          marginLeft: '8px'
                        }} />
                      )}
                    </div>

                    {/* 认证信息和操作按钮 */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-end'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {/* 认证标签 */}
                        <div>
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            backgroundColor: config.auth?.type !== 'none' && config.auth?.type ? 'var(--color-primary-bg)' : 'var(--bg-surface)',
                            color: config.auth?.type !== 'none' && config.auth?.type ? 'var(--color-primary)' : 'var(--text-muted)',
                            borderRadius: '3px',
                            border: `1px solid ${config.auth?.type !== 'none' && config.auth?.type ? 'var(--color-primary-border)' : 'var(--border-color)'}`
                          }}>
                            {(() => {
                              if (!config.auth || config.auth.type === 'none') {
                                return t.auth.none;
                              }
                              if (config.auth.type === 'combined') {
                                return t.auth.combined;
                              }
                              return t.auth.none;
                            })()}
                          </span>
                        </div>
                        
                        {/* 时间戳 */}
                        {config.updatedAt && (
                          <div style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)'
                          }}>
                            {formatTime(config.updatedAt)}
                          </div>
                        )}
                      </div>

                      {/* 操作按钮组 */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '2px',
                        opacity: 0.7
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                      }}>
                        {isConnected ? (
                          <Tooltip title={t.common.disconnect}>
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<DisconnectOutlined style={{ fontSize: '12px' }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDisconnect();
                              }}
                              style={{ 
                                minWidth: '28px',
                                height: '28px',
                                padding: '0'
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip title={t.common.connect}>
                            <Button
                              size="small"
                              type="text"
                              icon={<PlayCircleOutlined style={{ fontSize: '12px' }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConnect(config);
                              }}
                              loading={loading === config.name}
                              style={{
                                minWidth: '28px',
                                height: '28px',
                                padding: '0',
                                color: 'var(--color-primary)'
                              }}
                            />
                          </Tooltip>
                        )}
                        
                        <Popconfirm
                          title={t.config.deleteConfig}
                          onConfirm={() => handleDelete(config.name)}
                          okText={t.common.ok}
                          cancelText={t.common.cancel}
                        >
                          <Button
                            size="small"
                            type="text"
                            danger
                            icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              minWidth: '28px',
                              height: '28px',
                              padding: '0'
                            }}
                          />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default MCPListPanel; 