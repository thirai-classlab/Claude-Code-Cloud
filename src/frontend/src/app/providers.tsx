'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { ToastContainer } from '@/components/common/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const { theme, language } = useUIStore();
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const initI18n = async () => {
      if (i18n.isInitialized) {
        await i18n.changeLanguage(language);
      }
      setIsI18nReady(true);
    };
    initI18n();
  }, [language]);

  useEffect(() => {
    if (isI18nReady && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, isI18nReady]);

  if (!isI18nReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
      <ToastContainer />
    </I18nextProvider>
  );
}
