import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ToastProvider } from './context/ToastContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AccessibilityProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  </StrictMode>,
);

