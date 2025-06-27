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
  DatabaseOutlined
} from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { connectToServer } from '../store/mcpSlice';
import { storage } from '../utils/storage';
import { MCPServerConfig } from '../types/mcp';

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
  const dispatch = useDispatch();
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

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

  // 连接到指定配置
  const handleConnect = async (config: MCPServerConfig) => {
    setLoading(config.name);
    try {
      await dispatch(connectToServer(config) as any).unwrap();
      message.success(`已连接到 ${config.name}`);
      
      // 通知父组件配置已加载
      if (onConfigLoad) {
        onConfigLoad(config);
      }
    } catch (error) {
      message.error(`连接失败: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  // 删除配置
  const handleDelete = (name: string) => {
    const success = storage.deleteMCPConfig(name);
    if (success) {
      message.success('配置已删除');
      loadSavedConfigs();
    } else {
      message.error('删除配置失败');
    }
  };

  // 导出所有配置
  const handleExport = () => {
    const success = storage.exportAllConfigs();
    if (success) {
      message.success('配置已导出');
    } else {
      message.error('导出配置失败');
    }
  };

  // 导入配置
  const handleImport = async (file: File) => {
    const success = await storage.importConfigs(file);
    if (success) {
      message.success('配置导入成功');
      loadSavedConfigs();
    } else {
      message.error('导入配置失败');
    }
    return false; // 阻止默认上传行为
  };

  // 格式化时间
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 获取认证类型标签
  const getAuthTag = (auth?: any) => {
    if (!auth || auth.type === 'none') {
      return <Tag color="default">无认证</Tag>;
    }
    
    switch (auth.type) {
      case 'url_params':
        return <Tag color="blue">URL参数</Tag>;
      case 'headers':
        return <Tag color="green">请求头</Tag>;
      default:
        return <Tag color="default">未知</Tag>;
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Card 
        title={
          <Space>
            <DatabaseOutlined />
            已保存的MCP配置
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
                title="导入配置"
              />
            </Upload>
            <Button 
              type="text" 
              icon={<DownloadOutlined />}
              onClick={handleExport}
              size="small"
              title="导出配置"
              disabled={savedConfigs.length === 0}
            />
          </Space>
        }
        bodyStyle={{ padding: '8px' }}
      >
        {savedConfigs.length === 0 ? (
          <Empty 
            description="暂无保存的配置"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ margin: '20px 0' }}
          />
        ) : (
          <List
            size="small"
            dataSource={savedConfigs}
            renderItem={(config) => (
              <List.Item
                key={config.name}
                style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '4px'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: '13px' }}>
                        {config.name}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {config.host}
                      </Text>
                    </div>
                    <Space direction="vertical" size={2} style={{ alignItems: 'flex-end' }}>
                      <Space size={4}>
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlayCircleOutlined />}
                          onClick={() => handleConnect(config)}
                          loading={loading === config.name}
                          style={{ fontSize: '11px' }}
                        >
                          连接
                        </Button>
                        <Popconfirm
                          title="确定删除此配置？"
                          onConfirm={() => handleDelete(config.name)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            danger
                            style={{ fontSize: '11px' }}
                          />
                        </Popconfirm>
                      </Space>
                    </Space>
                  </div>
                  
                  <div style={{ marginBottom: '4px' }}>
                    {getAuthTag(config.auth)}
                  </div>
                  
                  {config.updatedAt && (
                    <Tooltip title={`更新时间: ${formatTime(config.updatedAt)}`}>
                      <Text type="secondary" style={{ fontSize: '10px' }}>
                        <ClockCircleOutlined style={{ marginRight: '2px' }} />
                        {formatTime(config.updatedAt)}
                      </Text>
                    </Tooltip>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default MCPListPanel; 