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
      console.error('加载安全检测历史失败:', error);
      message.error('加载历史记录失败');
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
        return { icon: <CheckCircleOutlined />, color: 'green', text: '已完成' };
      case 'failed':
        return { icon: <CloseCircleOutlined />, color: 'red', text: '失败' };
      case 'cancelled':
        return { icon: <PauseCircleOutlined />, color: 'orange', text: '已取消' };
      default:
        return { icon: <ExclamationCircleOutlined />, color: 'default', text: '未知' };
    }
  };

  // 删除历史记录
  const handleDeleteRecord = (id: string) => {
    try {
      securityHistoryStorage.deleteSecurityRecord(id);
      setHistoryRecords(prev => prev.filter(record => record.id !== id));
      message.success('删除成功');
    } catch (error) {
      console.error('删除历史记录失败:', error);
      message.error('删除失败');
    }
  };

  // 清空所有历史记录
  const handleClearAllHistory = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有安全检测历史记录吗？此操作不可恢复。',
      onOk: () => {
        try {
          securityHistoryStorage.clearSecurityHistory();
          setHistoryRecords([]);
          message.success('已清空所有历史记录');
        } catch (error) {
          console.error('清空历史记录失败:', error);
          message.error('清空失败');
        }
      }
    });
  };

  // 恢复历史记录
  const handleRestoreRecord = (record: SecurityHistoryRecord) => {
    if (onRestoreRecord) {
      onRestoreRecord(record);
      message.success('已恢复检测记录');
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
      
      message.success('导出成功');
    } catch (error) {
      console.error('导出历史记录失败:', error);
      message.error('导出失败');
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
      title: '服务器名称',
      dataIndex: 'serverName',
      key: 'serverName',
      render: (name: string, record: SecurityHistoryRecord) => (
        <Space>
          <Text strong>{name}</Text>
          {record.serverConfig.host && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.serverConfig.host}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '检测类型',
      dataIndex: 'scanType',
      key: 'scanType',
      render: (scanType: string) => (
        <Tag color="green">
          主动扫描
        </Tag>
      ),
    },
    {
      title: '整体风险',
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
        
        return <Tag color="default">无数据</Tag>;
      },
    },
    {
      title: '问题统计',
      dataIndex: 'report',
      key: 'issueCount',
      render: (report: any, record: SecurityHistoryRecord) => {
        if (report?.summary) {
          return (
            <Space direction="vertical" size="small">
              <Text>总计: {report.summary.totalIssues}</Text>
              {report.summary.criticalIssues > 0 && <Text type="danger">严重: {report.summary.criticalIssues}</Text>}
              {report.summary.highIssues > 0 && <Text type="warning">高危: {report.summary.highIssues}</Text>}
            </Space>
          );
        }
        
        return <Text>无数据</Text>;
      },
    },
    {
      title: '状态',
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
      title: '检测时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: number) => (
        <Text>{new Date(timestamp).toLocaleString()}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: SecurityHistoryRecord) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="link" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="恢复记录">
            <Button 
              type="link" 
              icon={<ReloadOutlined />} 
              onClick={() => handleRestoreRecord(record)}
              disabled={connectionStatus !== 'connected'}
            />
          </Tooltip>
          <Tooltip title="删除记录">
            <Popconfirm
              title="确认删除"
              description="确定要删除这条历史记录吗？"
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
        title={`检测详情 - ${selectedRecord.serverName}`}
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setShowDetailModal(false)}>
            关闭
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
            恢复记录
          </Button>
        ]}
      >
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="服务器名称" value={selectedRecord.serverName} />
            </Col>
            <Col span={8}>
              <Statistic title="检测类型" value="主动扫描" />
            </Col>
            <Col span={8}>
              <Statistic title="检测状态" value={getStatusInfo(selectedRecord.status).text} />
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="检测时间" value={new Date(selectedRecord.timestamp).toLocaleString()} />
            </Col>
            <Col span={8}>
              <Statistic title="持续时间" value={selectedRecord.duration ? `${Math.round(selectedRecord.duration / 1000)}秒` : '未知'} />
            </Col>
            <Col span={8}>
              <Statistic 
                title="整体风险" 
                value={selectedRecord.report?.overallRisk || '无数据'}
                valueStyle={{ color: selectedRecord.report?.overallRisk ? getRiskLevelColor(selectedRecord.report.overallRisk) : undefined }}
              />
            </Col>
          </Row>

          {selectedRecord.errorMessage && (
            <Alert
              type="error"
              message="错误信息"
              description={selectedRecord.errorMessage}
              style={{ marginBottom: 16 }}
            />
          )}

          {selectedRecord.scanType === 'active' && selectedRecord.report && (
            <div>
              <Title level={5}>检测结果统计</Title>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Statistic title="工具检测" value={selectedRecord.report.toolResults.length} />
                </Col>
                <Col span={6}>
                  <Statistic title="提示检测" value={selectedRecord.report.promptResults.length} />
                </Col>
                <Col span={6}>
                  <Statistic title="资源检测" value={selectedRecord.report.resourceResults.length} />
                </Col>
                <Col span={6}>
                  <Statistic title="总问题数" value={selectedRecord.report.summary.totalIssues} />
                </Col>
              </Row>

              <Title level={5}>风险分布</Title>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="严重问题" value={selectedRecord.report.summary.criticalIssues} valueStyle={{ color: '#ff4d4f' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="高危问题" value={selectedRecord.report.summary.highIssues} valueStyle={{ color: '#ff7a45' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="中等问题" value={selectedRecord.report.summary.mediumIssues} valueStyle={{ color: '#ffa940' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="低危问题" value={selectedRecord.report.summary.lowIssues} valueStyle={{ color: '#52c41a' }} />
                </Col>
              </Row>
            </div>
          )}



          <Title level={5}>检测配置</Title>
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
                  <HistoryOutlined /> 检测历史
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
                  刷新
                </Button>
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={handleExportHistory}
                  disabled={historyRecords.length === 0}
                >
                  导出
                </Button>
                <Button 
                  icon={<ClearOutlined />} 
                  danger
                  onClick={handleClearAllHistory}
                  disabled={historyRecords.length === 0}
                >
                  清空
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {historyRecords.length === 0 ? (
          <Empty 
            description="暂无检测历史记录"
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
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
            }}
          />
        )}
      </Card>

      {renderDetailModal()}
    </div>
  );
};

export default SecurityHistoryPanel; 