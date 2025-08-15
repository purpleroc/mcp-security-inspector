import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import { store } from './store';
import App from './App';
import './index.css';
import { i18n, Language } from './i18n';

const AppWithI18n: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => i18n.getCurrentLanguage());
  const [antdLocale, setAntdLocale] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // 动态加载初始语言包
    const loadInitialLocale = async () => {
      try {
        const localeModule = await i18n.getAntdLocale();
        if (isMounted) {
          setAntdLocale(localeModule.default);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load locale:', error);
        if (isMounted) {
          setIsLoaded(true); // 即使失败也要设置为已加载，使用默认值
        }
      }
    };
    
    loadInitialLocale();

    const handleLanguageChange = async (newLanguage: Language) => {
      if (isMounted) {
        setLanguage(newLanguage);
        try {
          const localeModule = await i18n.getAntdLocale();
          if (isMounted) {
            setAntdLocale(localeModule.default);
          }
        } catch (error) {
          console.error('Failed to load locale:', error);
        }
      }
    };

    i18n.addLanguageChangeListener(handleLanguageChange);

    return () => {
      isMounted = false;
      i18n.removeLanguageChangeListener(handleLanguageChange);
    };
  }, []);

  // 在语言包加载完成前显示加载状态
  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Provider store={store}>
      <ConfigProvider locale={antdLocale}>
        <App />
      </ConfigProvider>
    </Provider>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AppWithI18n />
  </React.StrictMode>
); 