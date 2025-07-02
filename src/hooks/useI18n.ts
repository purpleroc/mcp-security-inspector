import { useState, useEffect } from 'react';
import { i18n, Language, TranslationKey } from '../i18n';

export const useI18n = () => {
  const [language, setLanguageState] = useState<Language>(i18n.getCurrentLanguage());
  const [translations, setTranslations] = useState<TranslationKey>(i18n.t());

  useEffect(() => {
    const handleLanguageChange = (newLanguage: Language) => {
      setLanguageState(newLanguage);
      setTranslations(i18n.t());
    };

    // 添加语言变化监听器
    i18n.addLanguageChangeListener(handleLanguageChange);

    // 清理函数
    return () => {
      i18n.removeLanguageChangeListener(handleLanguageChange);
    };
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    i18n.setLanguage(newLanguage);
  };

  return {
    language,
    t: translations,
    changeLanguage,
  };
}; 