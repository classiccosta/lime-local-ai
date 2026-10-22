import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { LocaleProvider } from './i18n/LocaleProvider.jsx';
import { removeLegacyKeys } from './lib/legacyKeys.js';
import './index.css';

removeLegacyKeys();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
);
