import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter, matchPath } from 'react-router-dom';
import App from './App';
import { appRoutes } from './routes';
import './index.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

if (root.hasAttribute('data-ssr')) {
  // Preload the matched route chunk first so hydration does not flash the loading fallback.
  const match = appRoutes.find((r) => matchPath(r.path, window.location.pathname));
  void (match ? match.load() : Promise.resolve()).finally(() => hydrateRoot(root, app));
} else {
  createRoot(root).render(app);
}
