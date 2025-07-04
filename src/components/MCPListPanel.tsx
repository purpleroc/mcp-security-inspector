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
  Tag,
  Tooltip,
  Empty
} from 'antd';
import { 
  PlayCircleOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  UploadOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DisconnectOutlined,
  CheckCircleOutlined
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
    return new Date(timestamp).toLocaleString();
  };

  // 获取认证类型标签
  const getAuthTag = (auth?: any) => {
    if (!auth || auth.type === 'none') {
      return <Tag color="default">{t.auth.none}</Tag>;
    }
    
    switch (auth.type) {
      case 'url_params':
        return <Tag color="blue">{t.auth.urlParams}</Tag>;
      case 'headers':
        return <Tag color="green">{t.auth.custom}</Tag>;
      default:
        return <Tag color="default">{t.auth.none}</Tag>;
    }
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
        bodyStyle={{ padding: '8px' }}
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
            renderItem={(config) => {
              const isConnected = isCurrentConnection(config);
              return (
                <List.Item
                  key={config.name}
                  style={{ 
                    padding: '8px 0', 
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: isConnected ? '#f6ffed' : 'transparent',
                    borderRadius: isConnected ? '4px' : '0',
                    marginBottom: isConnected ? '4px' : '0',
                    paddingLeft: isConnected ? '8px' : '0',
                    paddingRight: isConnected ? '8px' : '0',
                    border: isConnected ? '1px solid #b7eb8f' : 'none'
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '4px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Space>
                          <Text strong style={{ fontSize: '13px' }}>
                            {config.name}
                          </Text>
                          {isConnected && (
                            <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: '10px' }}>
                              {t.config.connectionStatus.connected}
                            </Tag>
                          )}
                        </Space>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {config.host}
                        </Text>
                      </div>
                      <Space size="small">
                        {isConnected ? (
                          <Tooltip title={t.common.disconnect}>
                            <Button
                              danger
                              size="small"
                              icon={<DisconnectOutlined />}
                              onClick={handleDisconnect}
                              style={{ fontSize: '11px' }}
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip title={t.common.connect}>
                            <Button
                              type="primary"
                              size="small"
                              icon={<PlayCircleOutlined />}
                              onClick={() => handleConnect(config)}
                              loading={loading === config.name}
                              style={{ fontSize: '11px' }}
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
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{ fontSize: '11px' }}
                          />
                        </Popconfirm>
                      </Space>
                    </div>
                    
                    <div style={{ marginBottom: '4px' }}>
                      {getAuthTag(config.auth)}
                    </div>
                    
                    {(config.createdAt || config.updatedAt) && (
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#999',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <ClockCircleOutlined style={{ fontSize: '10px' }} />
                        {config.updatedAt && formatTime(config.updatedAt)}
                      </div>
                    )}
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