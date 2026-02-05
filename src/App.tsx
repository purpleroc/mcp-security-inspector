import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Layout, Tabs, Space, Badge, Button, Tooltip } from 'antd';
import { HistoryOutlined, SettingOutlined, AppstoreOutlined, RobotOutlined, SafetyOutlined, BulbOutlined, BulbFilled } from '@ant-design/icons';
import { RootState } from './store';
import ConfigPanel from './components/ConfigPanel';
import MCPExplorer from './components/MCPExplorer';
import HistoryPanel from './components/HistoryPanel';
import MCPListPanel from './components/MCPListPanel';
import LanguageSwitcher from './components/LanguageSwitcher';
import LLMConfig from './components/LLMConfig';
import SecurityPanel from './components/SecurityPanel';
import { MCPServerConfig } from './types/mcp';
import { useI18n } from './hooks/useI18n';
import './index.css';

// 版本号
const APP_VERSION = '2.1.0';

// 主题Hook
const useTheme = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('mcp-theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mcp-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
};

const { Header, Content, Sider } = Layout;

const App: React.FC = () => {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [selectedConfig, setSelectedConfig] = useState<MCPServerConfig | null>(null);
  const [activeTab, setActiveTab] = useState('config');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const connectionStatus = useSelector((state: RootState) => state.mcp.connectionStatus);
  
  // 获取工具、资源、提示的数量
  const { tools, resources, resourceTemplates, prompts } = useSelector((state: RootState) => state.mcp);
  const totalCount = tools.length + resources.length + resourceTemplates.length + prompts.length;

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
        <Space>
          <AppstoreOutlined />
          <span>{t.tabs.explorer}</span>
          {connectionStatus === 'connected' && totalCount > 0 && (
            <Badge 
              count={totalCount} 
              style={{ 
                backgroundColor: '#ff4d4f',
                fontSize: '10px',
                height: '18px',
                minWidth: '18px',
                lineHeight: '18px'
              }}
            />
          )}
        </Space>
      ),
      children: <MCPExplorer />
    },
    {
      key: 'security',
      label: (
        <span>
          <SafetyOutlined />
          {t.tabs.security}
        </span>
      ),
      children: <SecurityPanel />
    },
    {
      key: 'llm',
      label: (
        <span>
          <RobotOutlined />
          {t.tabs.llm}
        </span>
      ),
      children: <LLMConfig />
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
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 24px',
        height: 56,
        lineHeight: '56px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <SafetyOutlined style={{ fontSize: '22px' }} />
          {t.app.title}
        </h1>
        <Space size="middle">
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {t.app.description}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            v{APP_VERSION}
          </span>
          <Tooltip title={theme === 'dark' ? t.theme?.lightMode || 'Light Mode' : t.theme?.darkMode || 'Dark Mode'}>
            <Button
              type="text"
              icon={theme === 'dark' ? <BulbOutlined /> : <BulbFilled />}
              onClick={toggleTheme}
              style={{ color: 'var(--text-secondary)' }}
            />
          </Tooltip>
          <LanguageSwitcher />
        </Space>
      </Header>

      <Layout>
        <Sider
          width={260}
          style={{
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            overflow: 'auto'
          }}
        >
          <div style={{ padding: '16px' }}>
            <MCPListPanel
              onConfigLoad={handleConfigLoad}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </Sider>

        <Content style={{ padding: '20px', background: 'var(--bg-primary)', overflow: 'auto' }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default App; 