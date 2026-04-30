import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ignore ResizeObserver loop limit exceeded error
const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('ResizeObserver loop')) {
    return;
  }
  originalError(...args);
};
window.addEventListener('error', e => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay');
    if (resizeObserverErrDiv) resizeObserverErrDiv.style.display = 'none';
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
