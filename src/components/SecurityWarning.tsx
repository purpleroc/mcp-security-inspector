import React from 'react';
import { Alert, List, Typography } from 'antd';
import { WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { SecurityCheckResult } from '../types/mcp';

const { Text } = Typography;

interface SecurityWarningProps {
  securityCheck: SecurityCheckResult;
  style?: React.CSSProperties;
}

const SecurityWarning: React.FC<SecurityWarningProps> = ({ securityCheck, style }) => {
  const { level, warnings, recommendations } = securityCheck;

  const getAlertType = () => {
    switch (level) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'info';
    }
  };

  const getTitle = () => {
    switch (level) {
      case 'critical':
        return '严重安全风险';
      case 'high':
        return '高安全风险';
      case 'medium':
        return '中等安全风险';
      case 'low':
        return '低安全风险';
      default:
        return '安全检查';
    }
  };

  return (
    <Alert
      message={getTitle()}
      type={getAlertType()}
      icon={level === 'low' ? <InfoCircleOutlined /> : <WarningOutlined />}
      style={style}
      description={
        <div>
          {warnings.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Text strong>安全警告:</Text>
              <List
                size="small"
                dataSource={warnings}
                renderItem={(warning) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Text type="danger">• {warning}</Text>
                  </List.Item>
                )}
              />
            </div>
          )}
          
          {recommendations.length > 0 && (
            <div>
              <Text strong>建议:</Text>
              <List
                size="small"
                dataSource={recommendations}
                renderItem={(recommendation) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Text>• {recommendation}</Text>
                  </List.Item>
                )}
              />
            </div>
          )}
        </div>
      }
    />
  );
};

export default SecurityWarning; 