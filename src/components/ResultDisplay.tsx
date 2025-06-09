import React from 'react';
import { Card, Typography, Alert, Empty, Spin } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MCPToolResult, MCPResourceContent } from '../types/mcp';

const { Text, Paragraph } = Typography;

const ResultDisplay: React.FC = () => {
  const { lastResult, lastError, isLoading } = useSelector((state: RootState) => state.mcp);

  if (isLoading) {
    return (
      <Card title="执行结果" style={{ marginTop: 16 }}>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>正在执行...</p>
        </div>
      </Card>
    );
  }

  if (lastError) {
    return (
      <Card title="执行结果" style={{ marginTop: 16 }}>
        <Alert
          message="执行失败"
          description={lastError}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  if (!lastResult) {
    return (
      <Card title="执行结果" style={{ marginTop: 16 }}>
        <Empty description="暂无执行结果" />
      </Card>
    );
  }

  const renderToolResult = (result: MCPToolResult) => {
    return (
      <div>
        {result.isError && (
          <Alert
            message="工具执行错误"
            type="error"
            style={{ marginBottom: 16 }}
          />
        )}
        
        {result.content.map((content, index) => (
          <div key={index} style={{ marginBottom: 16 }}>
            <Text strong>内容类型: {content.type}</Text>
            
            {content.type === 'text' && content.text && (
              <div style={{ marginTop: 8 }}>
                <pre className="code-block">
                  {content.text}
                </pre>
              </div>
            )}
            
            {content.type === 'image' && content.data && (
              <div style={{ marginTop: 8 }}>
                <img 
                  src={`data:${content.mimeType || 'image/png'};base64,${content.data}`}
                  alt="Result"
                  style={{ maxWidth: '100%', maxHeight: 300 }}
                />
              </div>
            )}
            
            {content.type === 'resource' && (
              <div style={{ marginTop: 8 }}>
                <Text>资源类型: {content.mimeType}</Text>
                {content.text && (
                  <pre className="code-block" style={{ marginTop: 8 }}>
                    {content.text}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderResourceContent = (result: MCPResourceContent) => {
    return (
      <div>
        <Paragraph>
          <Text strong>URI:</Text> {result.uri}
        </Paragraph>
        <Paragraph>
          <Text strong>MIME类型:</Text> {result.mimeType || '未知'}
        </Paragraph>
        
        {result.text && (
          <div>
            <Text strong>内容:</Text>
            <pre className="code-block" style={{ marginTop: 8 }}>
              {result.text}
            </pre>
          </div>
        )}
        
        {result.blob && (
          <div>
            <Text strong>二进制数据:</Text>
            <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5' }}>
              <Text type="secondary">
                数据长度: {result.blob.length} 字符
              </Text>
            </div>
          </div>
        )}
      </div>
    );
  };

  const isToolResult = (result: any): result is MCPToolResult => {
    return result && typeof result === 'object' && Array.isArray(result.content);
  };

  return (
    <Card title="执行结果" style={{ marginTop: 16 }}>
      {isToolResult(lastResult) 
        ? renderToolResult(lastResult)
        : renderResourceContent(lastResult as MCPResourceContent)
      }
    </Card>
  );
};

export default ResultDisplay; 