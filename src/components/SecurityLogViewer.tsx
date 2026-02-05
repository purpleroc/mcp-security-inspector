import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Tag,
  Typography,
  Space,
  Timeline,
  Badge,
  Button,
  Modal,
  Collapse,
  Alert,
  Switch,
  Tooltip
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useI18n } from '../hooks/useI18n';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

export interface SecurityLogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error' | 'step';
  phase: 'init' | 'tool_analysis' | 'prompt_analysis' | 'resource_analysis' | 'test_generation' | 'test_execution' | 'evaluation' | 'summary';
  title: string;
  message: string;
  details?: any;
  progress?: number;
  duration?: number;
  metadata?: {
    toolName?: string;
    testCase?: string;
    riskLevel?: string;
    securityStatus?: string;
  };
}

interface SecurityLogViewerProps {
  logs: SecurityLogEntry[];
  isScanning: boolean;
  onClearLogs: () => void;
  onExportLogs: () => void;
}

const SecurityLogViewer: React.FC<SecurityLogViewerProps> = ({
  logs,
  isScanning,
  onClearLogs,
  onExportLogs
}) => {
  const { t } = useI18n();
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SecurityLogEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新日志
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLogIcon = (type: SecurityLogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: 'var(--color-warning)' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: 'var(--color-error)' }} />;
      case 'step':
        return <ClockCircleOutlined style={{ color: 'var(--color-primary)' }} />;
      default:
        return <InfoCircleOutlined style={{ color: 'var(--text-muted)' }} />;
    }
  };

  const getLogColor = (type: SecurityLogEntry['type']) => {
    switch (type) {
      case 'success': return 'var(--color-success-bg)';
      case 'warning': return 'var(--color-warning-bg)';
      case 'error': return 'var(--color-error-bg)';
      case 'step': return 'var(--color-info-bg)';
      default: return 'var(--bg-elevated)';
    }
  };

  const getPhaseText = (phase: SecurityLogEntry['phase']) => {
    return t.security.phases[phase] || phase;
  };

  const getRiskLevelTag = (level?: string) => {
    if (!level) return null;
    
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      critical: 'magenta'
    };
    
    return (
      <Tag color={colors[level as keyof typeof colors] || 'default'}>
        {level.toUpperCase()}
      </Tag>
    );
  };

  const getSecurityStatusTag = (status?: string) => {
    if (!status) return null;
    
    const configs = {
      SAFE: { color: 'green', text: t.security.securityStatuses.SAFE },
      WARNING: { color: 'orange', text: t.security.securityStatuses.WARNING },
      VULNERABLE: { color: 'red', text: t.security.securityStatuses.VULNERABLE },
      CRITICAL: { color: 'magenta', text: t.security.securityStatuses.CRITICAL }
    };
    
    const config = configs[status as keyof typeof configs];
    if (!config) return <Tag>{status}</Tag>;
    
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
  };

  const showLogDetails = (log: SecurityLogEntry) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  return (
    <Card
      title={
        <Space>
          <Text strong>{t.security.detectionLogs}</Text>
          <Badge
            count={logs.length}
            style={{ backgroundColor: 'var(--color-success)' }}
          />
          {isScanning && (
            <Badge status="processing" text={t.security.scanning} />
          )}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title={t.security.autoScroll}>
            <Switch
              size="small"
              checked={autoScroll}
              onChange={setAutoScroll}
              checkedChildren={t.security.autoScroll}
              unCheckedChildren={t.security.manualScroll}
            />
          </Tooltip>
          <Button 
            size="small" 
            icon={<DownloadOutlined />}
            onClick={onExportLogs}
            disabled={logs.length === 0}
          >
            {t.common.export}
          </Button>
          <Button 
            size="small" 
            icon={<ClearOutlined />}
            onClick={onClearLogs}
            disabled={logs.length === 0 || isScanning}
          >
            {t.common.clear}
          </Button>
        </Space>
      }
      size="small"
    >
      <div
        ref={logContainerRef}
        style={{
          height: '400px',
          overflowY: 'auto',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '8px'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '50px' }}>
            {t.security.noLogsRecord}
          </div>
        ) : (
          <Timeline mode="left" pending={isScanning ? t.security.scanningInProgress : false}>
            {logs.map((log) => (
              <Timeline.Item
                key={log.id}
                dot={getLogIcon(log.type)}
                style={{ backgroundColor: getLogColor(log.type) }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <Space size="small" wrap>
                    <Text strong>{log.title}</Text>
                    <Tag>{getPhaseText(log.phase)}</Tag>
                    {log.metadata?.riskLevel && getRiskLevelTag(log.metadata.riskLevel)}
                    {log.metadata?.securityStatus && getSecurityStatusTag(log.metadata.securityStatus)}
                    {log.duration && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatDuration(log.duration)}
                      </Text>
                    )}
                  </Space>
                  
                  <div style={{ marginTop: '4px' }}>
                    <Text style={{ fontSize: '13px' }}>{log.message}</Text>
                    {/* 统一为所有日志添加详情按钮，即使没有额外details */}
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => showLogDetails(log)}
                      style={{ padding: '0 4px', marginLeft: '8px' }}
                    >
                      {t.security.detailsLabel}
                    </Button>
                  </div>
                  
                  {log.metadata?.toolName && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {t.security.toolLabel}: {log.metadata.toolName}
                    </Text>
                  )}
                  
                  {log.progress !== undefined && (
                    <div style={{ marginTop: '4px', width: '200px' }}>
                      <div
                        style={{
                          height: '4px',
                          backgroundColor: 'var(--bg-elevated)',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            backgroundColor: 'var(--color-primary)',
                            width: `${log.progress}%`,
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </div>

      {/* 详情模态框 */}
      <Modal
        title={selectedLog?.title}
        open={showDetails}
        onCancel={() => setShowDetails(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setShowDetails(false)}>
            {t.security.closeModal}
          </Button>
        ]}
      >
        {selectedLog && (
          <div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>{t.security.phase}：</Text>
                <Tag>{getPhaseText(selectedLog.phase)}</Tag>
              </div>
              
              <div>
                <Text strong>{t.security.time}：</Text>
                <Text>{new Date(selectedLog.timestamp).toLocaleString()}</Text>
              </div>
              
              {selectedLog.duration && (
                <div>
                  <Text strong>{t.security.duration}：</Text>
                  <Text>{formatDuration(selectedLog.duration)}</Text>
                </div>
              )}
              
              <div>
                <Text strong>{t.security.message}：</Text>
                <Paragraph>{selectedLog.message}</Paragraph>
              </div>
              
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <Text strong>{t.security.metadata}：</Text>
                  <Collapse size="small" style={{ marginTop: '8px' }}>
                    <Panel header={t.security.viewDetailInfo} key="metadata">
                      <pre style={{ fontSize: '12px', backgroundColor: 'var(--code-bg)', padding: '8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </Panel>
                  </Collapse>
                </div>
              )}
              
              {selectedLog.details && (
                <div>
                  <Text strong>{t.security.detailData}：</Text>
                  <Collapse size="small" style={{ marginTop: '8px' }}>
                    <Panel header={t.security.viewDetailData} key="details">
                      <pre style={{ fontSize: '12px', backgroundColor: 'var(--code-bg)', padding: '8px', maxHeight: '300px', overflow: 'auto', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                        {typeof selectedLog.details === 'string' 
                          ? selectedLog.details 
                          : JSON.stringify(selectedLog.details, null, 2)
                        }
                      </pre>
                    </Panel>
                  </Collapse>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default SecurityLogViewer; 