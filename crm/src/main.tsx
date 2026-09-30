import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// Auto-reload when dynamic module chunk loading fails due to a new deployment
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Preload error detected (stale deployment chunk). Auto-reloading page...', event);
  const now = Date.now();
  const lastReload = parseInt(sessionStorage.getItem('last_chunk_reload') || '0', 10);
  if (now - lastReload > 8000) {
    sessionStorage.setItem('last_chunk_reload', String(now));
    window.location.reload();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
