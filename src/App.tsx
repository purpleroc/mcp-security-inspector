import React, { useState, useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { Layout, Tabs } from 'antd';
import { HistoryOutlined, SettingOutlined, AppstoreOutlined } from '@ant-design/icons';
import { store, RootState } from './store';
import ConfigPanel from './components/ConfigPanel';
import MCPExplorer from './components/MCPExplorer';
import HistoryPanel from './components/HistoryPanel';
import MCPListPanel from './components/MCPListPanel';
import { MCPServerConfig } from './types/mcp';


const { Header, Content, Sider } = Layout;

const AppContent: React.FC = () => {
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
          配置
        </span>
      ),
      children: <ConfigPanel onConfigLoad={handleConfigLoad} selectedConfig={selectedConfig} onConfigSaved={handleConfigSaved} />
    },
    {
      key: 'explorer',
      label: (
        <span>
          <AppstoreOutlined />
          MCP浏览器
        </span>
      ),
      children: <MCPExplorer />
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          历史记录
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
        lineHeight: '64px'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '20px', 
          fontWeight: 'bold',
          color: '#1890ff'
        }}>
          MCP Security Inspector
        </h1>
      </Header>
      
      <Layout style={{ height: 'calc(100vh - 64px)' }}>
        <Sider 
          width={300} 
          style={{ 
            background: '#fff',
            borderRight: '1px solid #f0f0f0'
          }}
        >
          <MCPListPanel onConfigLoad={handleConfigLoad} refreshTrigger={refreshTrigger} />
        </Sider>
        
        <Content style={{ padding: 0 }}>
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ height: '100%' }}
            tabBarStyle={{ 
              paddingLeft: 24,
              paddingRight: 24,
              marginBottom: 0,
              background: '#fafafa'
            }}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App; 