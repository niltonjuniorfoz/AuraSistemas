import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './storefront-fixes.css';
import i18n from './pages/store/i18n';

function LanguageReactiveApp() {
  const [, setLanguageVersion] = useState(0);

  useEffect(() => {
    const onLanguageChanged = (language: string) => {
      document.documentElement.lang = language || 'pt';
      // Alguns navegadores mobile mantinham trechos do DOM sem atualizar até
      // o próximo reload. O i18next já troca o idioma; este tick força o shell
      // React inteiro a reconciliar os textos imediatamente, sem remontar o app.
      setLanguageVersion((value) => value + 1);
    };

    i18n.on('languageChanged', onLanguageChanged);
    onLanguageChanged(i18n.resolvedLanguage || i18n.language || 'pt');
    return () => { i18n.off('languageChanged', onLanguageChanged); };
  }, []);

  return <App />;
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
