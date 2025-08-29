import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ServiceProvider } from '@/context/ServiceContext';
import { services } from '@/composition-root';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ServiceProvider services={services}>
      <App />
    </ServiceProvider>
  </StrictMode>,
);