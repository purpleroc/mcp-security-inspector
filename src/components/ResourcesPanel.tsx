import React, { useEffect } from 'react';
import { Card, List, Button, Alert, Empty, Typography } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { 
  fetchResources, 
  setSelectedResource, 
  readResource 
} from '../store/mcpSlice';
import { MCPResource } from '../types/mcp';
import ResultDisplay from './ResultDisplay';

const { Text } = Typography;

const ResourcesPanel: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    resources, 
    selectedResource, 
    isLoading, 
    lastError 
  } = useSelector((state: RootState) => state.mcp);

  useEffect(() => {
    dispatch(fetchResources() as any);
  }, [dispatch]);

  const handleResourceSelect = (resource: MCPResource) => {
    dispatch(setSelectedResource(resource));
  };

  const handleResourceRead = async () => {
    if (!selectedResource) return;
    
    try {
      await dispatch(readResource({ 
        resource: selectedResource 
      }) as any).unwrap();
    } catch (error) {
      console.error('Resource read failed:', error);
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {lastError && (
        <Alert 
          message="错误" 
          description={lastError} 
          type="error" 
          closable 
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title="可用资源" loading={isLoading}>
        {resources.length === 0 ? (
          <Empty description="暂无可用资源" />
        ) : (
          <List
            dataSource={resources}
            renderItem={(resource) => (
              <List.Item
                className={`tool-card ${selectedResource?.uri === resource.uri ? 'selected' : ''}`}
                onClick={() => handleResourceSelect(resource)}
                style={{ 
                  cursor: 'pointer',
                  padding: 12,
                  border: selectedResource?.uri === resource.uri ? '2px solid #1890ff' : '1px solid #f0f0f0',
                  borderRadius: 8,
                  marginBottom: 8
                }}
              >
                <List.Item.Meta
                  title={resource.name || resource.uri}
                  description={
                    <div>
                      <div>{resource.description || '无描述'}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        URI: {resource.uri}
                      </Text>
                      {resource.mimeType && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            类型: {resource.mimeType}
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {selectedResource && (
        <Card title={`资源详情: ${selectedResource.name || selectedResource.uri}`} size="small" style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <p><strong>URI:</strong> {selectedResource.uri}</p>
            <p><strong>名称:</strong> {selectedResource.name || '无'}</p>
            <p><strong>描述:</strong> {selectedResource.description || '无'}</p>
            <p><strong>MIME类型:</strong> {selectedResource.mimeType || '未知'}</p>
          </div>
          
          <Button 
            type="primary" 
            onClick={handleResourceRead}
            loading={isLoading}
          >
            读取资源
          </Button>
        </Card>
      )}

      <ResultDisplay />
    </div>
  );
};

export default ResourcesPanel; 