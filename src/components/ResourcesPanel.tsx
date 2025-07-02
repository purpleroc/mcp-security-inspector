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
import { useI18n } from '../hooks/useI18n';

const { Text } = Typography;

const ResourcesPanel: React.FC = () => {
  const { t } = useI18n();
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
          message={t.common.error} 
          description={lastError} 
          type="error" 
          closable 
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title={t.resources.title} loading={isLoading}>
        {resources.length === 0 ? (
          <Empty description={t.resources.noResources} />
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
                      <div>{resource.description || t.resources.resourceName}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t.resources.resourceUri}: {resource.uri}
                      </Text>
                      {resource.mimeType && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t.resources.mimeType}: {resource.mimeType}
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
        <Card title={`${t.resources.resourceName}: ${selectedResource.name || selectedResource.uri}`} size="small" style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <p><strong>{t.resources.resourceUri}:</strong> {selectedResource.uri}</p>
            <p><strong>{t.resources.resourceName}:</strong> {selectedResource.name || t.resources.resourceName}</p>
            <p><strong>{t.tools.description}:</strong> {selectedResource.description || t.resources.resourceName}</p>
            <p><strong>{t.resources.mimeType}:</strong> {selectedResource.mimeType || t.auth.none}</p>
          </div>
          
          <Button 
            type="primary" 
            onClick={handleResourceRead}
            loading={isLoading}
          >
            {t.resources.readResource}
          </Button>
        </Card>
      )}

      <ResultDisplay />
    </div>
  );
};

export default ResourcesPanel; 