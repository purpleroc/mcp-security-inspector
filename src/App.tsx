import React from 'react';
import { Provider } from 'react-redux';
import { Layout, Tabs } from 'antd';
import { HistoryOutlined, SettingOutlined, AppstoreOutlined } from '@ant-design/icons';
import { store } from './store';
import ConfigPanel from './components/ConfigPanel';
import MCPExplorer from './components/MCPExplorer';
import HistoryPanel from './components/HistoryPanel';


const { Header, Content } = Layout;

const App: React.FC = () => {
  const tabItems = [
    {
      key: 'config',
      label: (
        <span>
          <SettingOutlined />
          配置
        </span>
      ),
      children: <ConfigPanel />
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
    <Provider store={store}>
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
        
        <Content style={{ padding: 0 }}>
          <Tabs 
            defaultActiveKey="config"
            items={tabItems}
            style={{ height: 'calc(100vh - 64px)' }}
            tabBarStyle={{ 
              paddingLeft: 24,
              paddingRight: 24,
              marginBottom: 0,
              background: '#fafafa'
            }}
          />
        </Content>
      </Layout>
    </Provider>
  );
};

export default App; 