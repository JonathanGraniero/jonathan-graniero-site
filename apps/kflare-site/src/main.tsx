import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { PAGES, type PageName } from './pages.ts';
import './index.css';

const root = document.getElementById('root')!;
const Page = PAGES[(root.dataset.page ?? 'home') as PageName];
const page = (
  <StrictMode>
    <Page />
  </StrictMode>
);

// Built pages arrive pre-rendered (scripts/prerender.mjs); the dev server's don't.
if (root.firstElementChild) hydrateRoot(root, page);
else createRoot(root).render(page);
