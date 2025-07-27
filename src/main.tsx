import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import { store } from './store';
import App from './App';
import './index.css';
import { i18n, Language } from './i18n';

const AppWithI18n: React.FC = () => {
  const [language, setLanguage] = useState<Language>(i18n.getCurrentLanguage());
  const [antdLocale, setAntdLocale] = useState<any>(null);

  useEffect(() => {
    // 动态加载初始语言包
    const loadInitialLocale = async () => {
      const localeModule = await i18n.getAntdLocale();
      setAntdLocale(localeModule.default);
    };
    
    loadInitialLocale();

    const handleLanguageChange = async (newLanguage: Language) => {
      setLanguage(newLanguage);
      const localeModule = await i18n.getAntdLocale();
      setAntdLocale(localeModule.default);
    };

    i18n.addLanguageChangeListener(handleLanguageChange);

    return () => {
      i18n.removeLanguageChangeListener(handleLanguageChange);
    };
  }, []);

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