import React from 'react';
import { Space, Typography } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useI18n } from '../hooks/useI18n';

const { Text } = Typography;

const StatusBar: React.FC = () => {
  const { t } = useI18n();
  const { connectionStatus, serverConfig } = useSelector((state: RootState) => state.mcp);

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return t.config.connectionStatus.connected;
      case 'connecting':
        return t.config.connectionStatus.connecting;
      case 'disconnected':
        return t.config.connectionStatus.disconnected;
      case 'error':
        return t.config.connectionStatus.error;
      default:
        return t.config.connectionStatus.disconnected;
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