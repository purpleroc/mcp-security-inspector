import React from 'react';
import { 
  Card, 
  List, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Popconfirm,
  Empty,
  Pagination
} from 'antd';
import { 
  DeleteOutlined, 
  ClockCircleOutlined, 
  ToolOutlined, 
  DatabaseOutlined, 
  BulbOutlined,
  WarningOutlined,
  ClearOutlined 
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { deleteHistoryItem, clearHistory } from '../store/mcpSlice';
import { MCPCallHistory } from '../types/mcp';
import { useI18n } from '../hooks/useI18n';

const { Text, Paragraph } = Typography;

const HistoryPanel: React.FC = () => {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const { history } = useSelector((state: RootState) => state.mcp);

  const handleDeleteItem = (id: string) => {
    dispatch(deleteHistoryItem(id));
  };

  const handleClearHistory = () => {
    dispatch(clearHistory());
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tool':
        return <ToolOutlined />;
      case 'resource':
        return <DatabaseOutlined />;
      case 'prompt':
        return <BulbOutlined />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tool':
        return 'blue';
      case 'resource':
        return 'green';
      case 'prompt':
        return 'orange';
      default:
        return 'default';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderHistoryItem = (item: MCPCallHistory) => {
    const hasError = item.error;
    const hasWarnings = item.securityWarnings && item.securityWarnings.length > 0;

    return (
      <List.Item
        key={item.id}
        style={{
          padding: 16,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          marginBottom: 8,
          backgroundColor: hasError ? '#fff2f0' : '#fff'
        }}
        actions={[
          <Popconfirm
            title={t.history.confirmDelete}
            onConfirm={() => handleDeleteItem(item.id)}
            okText={t.common.delete}
            cancelText={t.common.cancel}
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        ]}
      >
        <List.Item.Meta
          title={
            <Space>
              <Tag 
                icon={getTypeIcon(item.type)} 
                color={getTypeColor(item.type)}
              >
                {item.type.toUpperCase()}
              </Tag>
              <Text strong>{item.name}</Text>
              {hasError && <Tag color="red">{t.common.error}</Tag>}
              {hasWarnings && (
                <Tag color="orange" icon={<WarningOutlined />}>
                  {t.security.warning}
                </Tag>
              )}
            </Space>
          }
          description={
            <div style={{ fontSize: 12, width: '100%' }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space>
                  <ClockCircleOutlined />
                  <Text type="secondary">{formatTime(item.timestamp)}</Text>
                  {item.duration && (
                    <Text type="secondary">{t.history.duration}: {item.duration}ms</Text>
                  )}
                </Space>
                
                {item.parameters && Object.keys(item.parameters).length > 0 && (
                  <div style={{ width: '100%', display: 'block' }}>
                    <Text type="secondary">{t.history.parameters}</Text>
                    <div style={{
                      marginTop: 8,
                      backgroundColor: '#f5f5f5',
                      padding: 8,
                      borderRadius: 4,
                      border: '1px solid #d9d9d9',
                      minHeight: 80,
                      maxHeight: 300,
                      overflow: 'auto',
                      width: '100%',
                      display: 'block',
                      boxSizing: 'border-box'
                    }}>
                      <pre style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        fontSize: '11px',
                        lineHeight: '1.4',
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                        padding: '4px',
                        width: '100%',
                        minWidth: '100%',
                        display: 'block',
                        boxSizing: 'border-box'
                      }}>
                        {JSON.stringify(item.parameters, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {hasError && (
                  <div>
                    <Text type="danger">{t.common.error}: {item.error}</Text>
                  </div>
                )}
                
                {hasWarnings && (
                  <div>
                    <Text type="warning">{t.history.securityWarnings}:</Text>
                    <ul style={{ paddingLeft: 16, margin: '4px 0' }}>
                      {item.securityWarnings!.map((warning, index) => (
                        <li key={index}>
                          <Text type="warning" style={{ fontSize: 11 }}>
                            {warning}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {item.result && !hasError && (
                  <div style={{ marginTop: 8, width: '100%' }}>
                    <details style={{ width: '100%' }}>
                      <summary style={{ cursor: 'pointer' }}>
                        <Text type="secondary">{t.history.result}</Text>
                      </summary>
                      <div style={{
                        marginTop: 8,
                        backgroundColor: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        border: '1px solid #d9d9d9',
                        minHeight: 80,
                        maxHeight: 300,
                        overflow: 'auto',
                        width: '100%'
                      }}>
                        <pre style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          fontSize: '10px',
                          lineHeight: '1.3',
                          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                          width: '100%',
                          minWidth: '100%'
                        }}>
                          {JSON.stringify(item.result, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}
              </Space>
            </div>
          }
        />
      </List.Item>
    );
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Card 
        title={t.history.title} 
        extra={
          history.length > 0 && (
            <Popconfirm
              title={t.history.confirmClear}
              onConfirm={handleClearHistory}
              okText={t.common.clear}
              cancelText={t.common.cancel}
            >
              <Button 
                type="text" 
                danger 
                icon={<ClearOutlined />}
                size="small"
              >
                {t.history.clearAll}
              </Button>
            </Popconfirm>
          )
        }
      >
        {history.length === 0 ? (
          <Empty description={t.history.noHistory} />
        ) : (
          <div>
            <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 12 }}>
              共 {history.length} 条记录
            </Paragraph>
            
            <List
              dataSource={history}
              renderItem={renderHistoryItem}
              pagination={
                history.length > 10 ? {
                  pageSize: 10,
                  size: 'small',
                  showSizeChanger: false,
                  showQuickJumper: true
                } : false
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default HistoryPanel;