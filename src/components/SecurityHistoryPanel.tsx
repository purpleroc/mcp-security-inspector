import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Typography,
  Alert,
  Popconfirm,
  message,
  Empty,
  Tooltip,
  Badge,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  HistoryOutlined,
  ReloadOutlined,
  ClearOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  SecurityHistoryRecord, 
  SecurityRiskLevel,
  MCPServerConfig 
} from '../types/mcp';
import { useI18n } from '../hooks/useI18n';
import { securityHistoryStorage } from '../utils/storage';

const { Title, Text } = Typography;

interface SecurityHistoryPanelProps {
  onRestoreRecord?: (record: SecurityHistoryRecord) => void;
}

const SecurityHistoryPanel: React.FC<SecurityHistoryPanelProps> = ({ onRestoreRecord }) => {
  const { t } = useI18n();
  const connectionStatus = useSelector((state: RootState) => state.mcp.connectionStatus);
  const serverConfig = useSelector((state: RootState) => state.mcp.serverConfig);
  
  const [historyRecords, setHistoryRecords] = useState<SecurityHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SecurityHistoryRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 加载历史记录（仅显示主动扫描）
  const loadHistoryRecords = () => {
    setLoading(true);
    try {
      const allRecords = securityHistoryStorage.getSecurityHistory();
      // 只保留主动扫描的记录
      const activeRecords = allRecords.filter(record => record.scanType === 'active');
      setHistoryRecords(activeRecords);
    } catch (error) {
      console.error(t.security.history.loadHistoryFailed, error);
      message.error(t.security.history.loadHistoryFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryRecords();
  }, []);

  // 获取风险等级颜色
  const getRiskLevelColor = (level: SecurityRiskLevel): string => {
    switch (level) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#ff7a45';
      case 'medium': return '#ffa940';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  // 获取状态图标和颜色
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: <CheckCircleOutlined />, color: 'green', text: t.security.history.completed };
      case 'failed':
        return { icon: <CloseCircleOutlined />, color: 'red', text: t.security.history.failed };
      case 'cancelled':
        return { icon: <PauseCircleOutlined />, color: 'orange', text: t.security.history.cancelled };
      default:
        return { icon: <ExclamationCircleOutlined />, color: 'default', text: t.security.history.unknown };
    }
  };

  // 删除历史记录
  const handleDeleteRecord = (id: string) => {
    try {
      securityHistoryStorage.deleteSecurityRecord(id);
      setHistoryRecords(prev => prev.filter(record => record.id !== id));
      message.success(t.success.itemDeleted);
    } catch (error) {
      console.error(t.security.history.deleteRecordFailed, error);
      message.error(t.errors.deleteFailed);
    }
  };

  // 清空所有历史记录
  const handleClearAllHistory = () => {
    Modal.confirm({
      title: t.security.history.confirmClear,
      content: t.security.history.confirmClearDesc,
      onOk: () => {
        try {
          securityHistoryStorage.clearSecurityHistory();
          setHistoryRecords([]);
          message.success(t.success.historyCleared);
        } catch (error) {
          console.error(t.security.history.clearHistoryFailed, error);
          message.error(t.errors.clearFailed);
        }
      }
    });
  };

  // 恢复历史记录
  const handleRestoreRecord = (record: SecurityHistoryRecord) => {
    if (onRestoreRecord) {
      onRestoreRecord(record);
      message.success(t.security.history.restoreRecordSuccess);
    }
  };

  // 导出历史记录
  const handleExportHistory = () => {
    try {
      const dataStr = JSON.stringify(historyRecords, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `security-history-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      message.success(t.success.exportSuccess);
    } catch (error) {
      console.error(t.security.history.exportHistoryFailed, error);
      message.error(t.errors.exportFailed);
    }
  };

  // 查看记录详情
  const handleViewDetail = (record: SecurityHistoryRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  // 表格列定义
  const columns = [
    {
      title: t.security.history.serverName,
      dataIndex: 'serverName',
      key: 'serverName',
      render: (name: string, record: SecurityHistoryRecord) => (
        <div>
          <div>
            <Text strong>{name}</Text>
          </div>
          {record.serverConfig.host && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              {record.serverConfig.host}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t.security.history.scanType,
      dataIndex: 'scanType',
      key: 'scanType',
      render: (scanType: string) => (
        <Tag color="green">
          {t.security.history.activeScan}
        </Tag>
      ),
    },
    {
      title: t.security.history.overallRisk,
      dataIndex: 'report',
      key: 'overallRisk',
      render: (report: any, record: SecurityHistoryRecord) => {
        if (report?.overallRisk) {
          return (
            <Tag color={getRiskLevelColor(report.overallRisk)}>
              {t.security.riskLevels[report.overallRisk as keyof typeof t.security.riskLevels] || report.overallRisk}
            </Tag>
          );
        }
        
        return <Tag color="default">{t.security.noData}</Tag>;
      },
    },
    {
      title: t.security.history.issueCount,
      dataIndex: 'report',
      key: 'issueCount',
      render: (report: any, record: SecurityHistoryRecord) => {
        if (report?.summary) {
          return (
            <Space direction="vertical" size="small">
              <Text>{t.security.history.totalIssues}: {report.summary.totalIssues}</Text>
              {report.summary.criticalIssues > 0 && <Text type="danger">{t.security.history.criticalIssues}: {report.summary.criticalIssues}</Text>}
              {report.summary.highIssues > 0 && <Text type="warning">{t.security.history.highIssues}: {report.summary.highIssues}</Text>}
            </Space>
          );
        }
        
        return <Text>{t.security.noData}</Text>;
      },
    },
    {
      title: t.security.history.status,
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: SecurityHistoryRecord) => {
        const statusInfo = getStatusInfo(status);
        return (
          <Space>
            <Tag color={statusInfo.color} icon={statusInfo.icon}>
              {statusInfo.text}
            </Tag>
            {record.duration && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {Math.round(record.duration / 1000)}s
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: t.security.history.scanTime,
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: number) => (
        <Text>{new Date(timestamp).toLocaleString()}</Text>
      ),
    },
    {
      title: t.security.history.actions,
      key: 'actions',
      render: (_: any, record: SecurityHistoryRecord) => (
        <Space>
                      <Tooltip title={t.security.history.viewDetail}>
            <Button 
              type="link" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
                      <Tooltip title={t.security.history.restoreRecord}>
            <Button 
              type="link" 
              icon={<ReloadOutlined />} 
              onClick={() => handleRestoreRecord(record)}
              disabled={connectionStatus !== 'connected'}
            />
          </Tooltip>
                      <Tooltip title={t.security.history.deleteRecord}>
            <Popconfirm
                              title={t.security.history.confirmDelete}
                description={t.security.history.confirmDeleteDesc}
              onConfirm={() => handleDeleteRecord(record.id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 渲染详情模态框
  const renderDetailModal = () => {
    if (!selectedRecord) return null;

    return (
      <Modal
        title={`${t.security.history.scanDetail} - ${selectedRecord.serverName}`}
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setShowDetailModal(false)}>
            {t.common.close}
          </Button>,
          <Button 
            key="restore" 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={() => {
              handleRestoreRecord(selectedRecord);
              setShowDetailModal(false);
            }}
            disabled={connectionStatus !== 'connected'}
          >
            {t.security.history.restoreRecord}
          </Button>
        ]}
      >
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title={t.security.history.serverName} value={selectedRecord.serverName} />
            </Col>
            <Col span={8}>
              <Statistic title={t.security.history.scanType} value={t.security.history.activeScan} />
            </Col>
            <Col span={8}>
              <Statistic title={t.security.history.status} value={getStatusInfo(selectedRecord.status).text} />
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title={t.security.history.scanTime} value={new Date(selectedRecord.timestamp).toLocaleString()} />
            </Col>
            <Col span={8}>
              <Statistic title={t.security.history.duration} value={selectedRecord.duration ? `${Math.round(selectedRecord.duration / 1000)}${t.security.history.seconds}` : t.security.history.unknown} />
            </Col>
            <Col span={8}>
              <Statistic 
                title={t.security.history.overallRisk} 
                value={selectedRecord.report?.overallRisk || t.security.noData}
                valueStyle={{ color: selectedRecord.report?.overallRisk ? getRiskLevelColor(selectedRecord.report.overallRisk) : undefined }}
              />
            </Col>
          </Row>

          {selectedRecord.errorMessage && (
            <Alert
              type="error"
              message={t.security.history.errorMessage}
              description={selectedRecord.errorMessage}
              style={{ marginBottom: 16 }}
            />
          )}

          {selectedRecord.scanType === 'active' && selectedRecord.report && (
            <div>
              <Title level={5}>{t.security.history.detectionResults}</Title>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Statistic title={t.security.history.toolDetection} value={selectedRecord.report.toolResults.length} />
                </Col>
                <Col span={6}>
                  <Statistic title={t.security.history.promptDetection} value={selectedRecord.report.promptResults.length} />
                </Col>
                <Col span={6}>
                  <Statistic title={t.security.history.resourceDetection} value={selectedRecord.report.resourceResults.length} />
                </Col>
                <Col span={6}>
                  <Statistic title={t.security.history.totalIssues} value={selectedRecord.report.summary.totalIssues} />
                </Col>
              </Row>

              <Title level={5}>{t.security.history.riskDistribution}</Title>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title={t.security.history.criticalIssues} value={selectedRecord.report.summary.criticalIssues} valueStyle={{ color: '#ff4d4f' }} />
                </Col>
                <Col span={6}>
                  <Statistic title={t.security.history.highIssues} value={selectedRecord.report.summary.highIssues} valueStyle={{ color: '#ff7a45' }} />
                </Col>
                <Col span={6}>
                  <Statistic title={t.security.history.mediumIssues} value={selectedRecord.report.summary.mediumIssues} valueStyle={{ color: '#ffa940' }} />
                </Col>
                <Col span={6}>
                  <Statistic title={t.security.history.lowIssues} value={selectedRecord.report.summary.lowIssues} valueStyle={{ color: '#52c41a' }} />
                </Col>
              </Row>
            </div>
          )}



          <Title level={5}>{t.security.history.scanConfig}</Title>
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(selectedRecord.config, null, 2)}
            </pre>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Title level={4} style={{ margin: 0 }}>
                  <HistoryOutlined /> {t.security.history.title}
                </Title>
                <Badge count={historyRecords.length} showZero />
              </Space>
            </Col>
            <Col>
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadHistoryRecords}
                  loading={loading}
                >
                  {t.common.refresh}
                </Button>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={handleExportHistory}
                  disabled={historyRecords.length === 0}
                >
                  {t.common.export}
                </Button>
                <Button 
                  icon={<ClearOutlined />} 
                  danger
                  onClick={handleClearAllHistory}
                  disabled={historyRecords.length === 0}
                >
                  {t.common.clear}
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {historyRecords.length === 0 ? (
          <Empty 
            description={t.security.history.noHistory}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={historyRecords}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${t.common.pageInfo} ${range[0]}-${range[1]} ${t.common.of} ${total} ${t.common.records}`
            }}
          />
        )}
      </Card>

      {renderDetailModal()}
    </div>
  );
};

export default SecurityHistoryPanel; 