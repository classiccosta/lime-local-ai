import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { LocaleProvider } from './i18n/LocaleProvider.jsx';
import { dropLegacyPrefs } from './lib/prefs.js';
import './index.css';

dropLegacyPrefs();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
);
