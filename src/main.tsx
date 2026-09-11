import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { isFounderEmail, FOUNDER_EMAIL } from './utils/storage.ts';

if (typeof window !== 'undefined') {
  (window as any).isFounderEmail = isFounderEmail;
  (window as any).FOUNDER_EMAIL = FOUNDER_EMAIL;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
