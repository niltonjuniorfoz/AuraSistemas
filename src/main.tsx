import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './storefront-fixes.css';
import './storefront-banner-restore.css';
import i18n from './pages/store/i18n';
import {StorefrontMobileHeaderBehavior} from './pages/store/StorefrontMobileHeaderBehavior';
import {StorefrontBannerFramingBehavior} from './pages/store/StorefrontBannerFramingBehavior';

function LanguageReactiveApp() {
  const [, setLanguageVersion] = useState(0);

  useEffect(() => {
    const onLanguageChanged = (language: string) => {
      document.documentElement.lang = language || 'pt';
      setLanguageVersion((value) => value + 1);
    };

    i18n.on('languageChanged', onLanguageChanged);
    onLanguageChanged(i18n.resolvedLanguage || i18n.language || 'pt');
    return () => { i18n.off('languageChanged', onLanguageChanged); };
  }, []);

  return (
    <>
      <StorefrontMobileHeaderBehavior />
      <StorefrontBannerFramingBehavior />
      <App />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageReactiveApp />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // O app continua funcionando mesmo se o navegador bloquear o service worker.
    });
  });
}
