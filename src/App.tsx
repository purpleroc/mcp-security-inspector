import React, { useState, useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { Layout, Tabs, Space } from 'antd';
import { HistoryOutlined, SettingOutlined, AppstoreOutlined } from '@ant-design/icons';
import { store, RootState } from './store';
import ConfigPanel from './components/ConfigPanel';
import MCPExplorer from './components/MCPExplorer';
import HistoryPanel from './components/HistoryPanel';
import MCPListPanel from './components/MCPListPanel';
import LanguageSwitcher from './components/LanguageSwitcher';
import { MCPServerConfig } from './types/mcp';
import { useI18n } from './hooks/useI18n';

const { Header, Content, Sider } = Layout;

const AppContent: React.FC = () => {
  const { t } = useI18n();
  const [selectedConfig, setSelectedConfig] = useState<MCPServerConfig | null>(null);
  const [activeTab, setActiveTab] = useState('config');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const connectionStatus = useSelector((state: RootState) => state.mcp.connectionStatus);

  // 监听连接状态，连接成功后自动切换到浏览器页面
  useEffect(() => {
    if (connectionStatus === 'connected') {
      setActiveTab('explorer');
    }
  }, [connectionStatus]);

  // 处理配置加载
  const handleConfigLoad = (config: MCPServerConfig) => {
    setSelectedConfig(config);
    setActiveTab('config'); // 切换到配置页面
  };

  // 处理配置保存后刷新列表
  const handleConfigSaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const tabItems = [
    {
      key: 'config',
      label: (
        <span>
          <SettingOutlined />
          {t.tabs.config}
        </span>
      ),
      children: <ConfigPanel onConfigLoad={handleConfigLoad} selectedConfig={selectedConfig} onConfigSaved={handleConfigSaved} />
    },
    {
      key: 'explorer',
      label: (
        <span>
          <AppstoreOutlined />
          {t.tabs.explorer}
        </span>
      ),
      children: <MCPExplorer />
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          {t.tabs.history}
        </span>
      ),
      children: <HistoryPanel />
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        borderBottom: '1px solid #f0f0f0',
        padding: '0 24px',
        height: 64,
        lineHeight: '64px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: '#1890ff'
        }}>
          {t.app.title}
        </h1>
        <Space size="large">
          <span style={{ fontSize: '12px', color: '#666' }}>
            {t.app.description}
          </span>
          <LanguageSwitcher />
        </Space>
      </Header>
      
      <Layout>
        <Sider width={250} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: '16px' }}>
            <MCPListPanel 
              onConfigLoad={handleConfigLoad}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </Sider>
        
        <Content style={{ padding: '24px', background: '#fff' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ height: '100%' }}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App; 