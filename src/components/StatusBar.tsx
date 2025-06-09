import React from 'react';
import { Space, Typography } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const { Text } = Typography;

const StatusBar: React.FC = () => {
  const { connectionStatus, serverConfig } = useSelector((state: RootState) => state.mcp);

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中...';
      case 'disconnected':
        return '未连接';
      case 'error':
        return '连接错误';
      default:
        return '未知状态';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#52c41a';
      case 'connecting':
        return '#1890ff';
      case 'disconnected':
        return '#d9d9d9';
      case 'error':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  return (
    <Space size="small">
      <span 
        className={`status-indicator ${connectionStatus}`}
        style={{ backgroundColor: getStatusColor() }}
      />
      <Text style={{ fontSize: 12 }}>
        {getStatusText()}
        {serverConfig && ` - ${serverConfig.name}`}
      </Text>
    </Space>
  );
};

export default StatusBar; 