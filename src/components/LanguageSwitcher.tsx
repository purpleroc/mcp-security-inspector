import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useI18n } from '../hooks/useI18n';
import { LANGUAGE_OPTIONS, Language } from '../i18n';

interface LanguageSwitcherProps {
  size?: 'small' | 'middle' | 'large';
  showIcon?: boolean;
  style?: React.CSSProperties;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  size = 'small',
  showIcon = true,
  style
}) => {
  const { language, changeLanguage } = useI18n();

  const handleLanguageChange = (value: Language) => {
    changeLanguage(value);
  };

  return (
    <Space style={style}>
      {showIcon && <GlobalOutlined />}
      <Select
        value={language}
        onChange={handleLanguageChange}
        size={size}
        style={{ width: 100 }}
        options={LANGUAGE_OPTIONS}
      />
    </Space>
  );
};

export default LanguageSwitcher; 