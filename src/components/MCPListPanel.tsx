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
  Empty,
  Modal,
  Alert,
  Tag
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
import { McpConfigParseResult } from '../utils/mcpConfigParser';
import { useI18n } from '../hooks/useI18n';

const { Text } = Typography;

interface SavedConfig extends MCPServerConfig {
  createdAt?: number;
  updatedAt?: number;
}

interface MCPListPanelProps {
  onConfigLoad?: (config: MCPServerConfig) => void;
  selectedConfig?: MCPServerConfig | null;
  refreshTrigger?: number;
}

const MCPListPanel: React.FC<MCPListPanelProps> = ({ onConfigLoad, selectedConfig, refreshTrigger }) => {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<McpConfigParseResult | null>(null);
  
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

  const isSelectedConfig = (config: MCPServerConfig) => {
    return selectedConfig?.name === config.name;
  };

  const handleConfigSelect = (config: MCPServerConfig) => {
    onConfigLoad?.(config);
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

  const getSourceLabel = (source?: string) => {
    if (!source) return '';
    const key = source as keyof typeof t.config.mcpConfigIO.sources;
    return t.config.mcpConfigIO.sources[key] || t.config.mcpConfigIO.sources.unknown;
  };

  const getSkipReasonLabel = (reason: string) => {
    const key = reason as keyof typeof t.config.mcpConfigIO.skipReasons;
    return t.config.mcpConfigIO.skipReasons[key] || reason;
  };

  // 预览导入（仅远程 MCP，过滤本地 stdio）
  const handleImport = async (file: File) => {
    const preview = await storage.previewImportFile(file);

    if (preview.configs.length === 0) {
      if (preview.skipped.length > 0) {
        message.warning(t.config.mcpConfigIO.stdioSkipped.replace('{count}', String(preview.skipped.length)));
      } else {
        message.error(t.errors.importFailed);
      }
      return false;
    }

    setImportPreview(preview);
    setImportModalOpen(true);
    return false;
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    const imported = storage.mergeConfigs(importPreview.configs);
    let msg = t.config.mcpConfigIO.importedMultiple.replace('{count}', String(imported));
    if (importPreview.skipped.length > 0) {
      msg += ` ${t.config.mcpConfigIO.skippedCount.replace('{count}', String(importPreview.skipped.length))}`;
    }
    message.success(msg);
    loadSavedConfigs();
    setImportModalOpen(false);
    setImportPreview(null);
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
            <Tooltip title={t.config.importConfigsTooltip}>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={handleImport}
              >
                <Button
                  type="text"
                  icon={<UploadOutlined />}
                  size="small"
                />
              </Upload>
            </Tooltip>
            <Tooltip title={t.config.exportConfigsTooltip}>
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                size="small"
                disabled={savedConfigs.length === 0}
              />
            </Tooltip>
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
              const isSelected = isSelectedConfig(config);
              const borderColor = isConnected
                ? 'var(--color-success)'
                : isSelected
                  ? 'var(--color-primary)'
                  : 'var(--border-color)';
              const backgroundColor = isConnected
                ? 'var(--color-success-bg)'
                : isSelected
                  ? 'var(--color-primary-bg)'
                  : 'var(--bg-elevated)';
              return (
                <List.Item
                  key={config.name}
                  onClick={() => handleConfigSelect(config)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor,
                    border: `1px solid ${borderColor}`,
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
                      e.currentTarget.style.backgroundColor = backgroundColor;
                      e.currentTarget.style.borderColor = borderColor;
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

      <Modal
        title={t.config.mcpConfigIO.importPreview}
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false);
          setImportPreview(null);
        }}
        onOk={handleConfirmImport}
        okText={t.config.mcpConfigIO.confirmImport}
        cancelText={t.common.cancel}
        width={520}
      >
        {importPreview && (
          <>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={t.config.mcpConfigIO.detectedSource.replace(
                '{source}',
                getSourceLabel(importPreview.source)
              )}
            />
            {importPreview.skipped.length > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={t.config.mcpConfigIO.skippedCount.replace(
                  '{count}',
                  String(importPreview.skipped.length)
                )}
                description={
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                    {importPreview.skipped.map((s) => (
                      <li key={s.name}>
                        <strong>{s.name}</strong> — {getSkipReasonLabel(s.reason)}
                      </li>
                    ))}
                  </ul>
                }
              />
            )}
            <List
              size="small"
              header={t.config.mcpConfigIO.remoteServersToImport.replace(
                '{count}',
                String(importPreview.configs.length)
              )}
              dataSource={importPreview.configs}
              renderItem={(config) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{config.name}</span>
                        <Tag color="blue">{config.transport}</Tag>
                        {config.auth?.type === 'combined' && (
                          <Tag color="orange">{t.auth.combined}</Tag>
                        )}
                      </Space>
                    }
                    description={`${config.host}${config.ssePath || ''}`}
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default MCPListPanel; 