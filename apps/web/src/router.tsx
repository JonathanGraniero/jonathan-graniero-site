import { createBrowserRouter, type RouteObject } from 'react-router';
import { Layout } from './components/Layout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { RouteErrorPage } from './pages/RouteErrorPage.tsx';

/**
 * Every route except the landing page is code-split. Markdown rendering,
 * form validation and the whole admin area load only when needed.
 */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'blog',
        lazy: async () => ({ Component: (await import('./pages/BlogPage.tsx')).BlogPage }),
      },
      {
        path: 'blog/:slug',
        lazy: async () => ({ Component: (await import('./pages/PostPage.tsx')).PostPage }),
      },
      {
        path: 'about',
        lazy: async () => ({ Component: (await import('./pages/AboutPage.tsx')).AboutPage }),
      },
      {
        path: 'projects',
        lazy: async () => ({ Component: (await import('./pages/ProjectsPage.tsx')).ProjectsPage }),
      },
      {
        path: 'contact',
        lazy: async () => ({ Component: (await import('./pages/ContactPage.tsx')).ContactPage }),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'admin',
    errorElement: <RouteErrorPage />,
    lazy: async () => ({ Component: (await import('./admin/AdminLayout.tsx')).AdminLayout }),
    children: [
      {
        path: 'login',
        lazy: async () => ({ Component: (await import('./admin/LoginPage.tsx')).LoginPage }),
      },
      {
        lazy: async () => ({ Component: (await import('./admin/RequireAuth.tsx')).RequireAuth }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('./admin/PostsListPage.tsx')).PostsListPage,
            }),
          },
          {
            path: 'posts/new',
            lazy: async () => ({
              Component: (await import('./admin/PostEditorPage.tsx')).PostEditorPage,
            }),
          },
          {
            path: 'posts/:id',
            lazy: async () => ({
              Component: (await import('./admin/PostEditorPage.tsx')).PostEditorPage,
            }),
          },
          {
            path: 'messages',
            lazy: async () => ({
              Component: (await import('./admin/MessagesPage.tsx')).MessagesPage,
            }),
          },
          {
            path: 'profile',
            lazy: async () => ({
              Component: (await import('./admin/ProfileEditorPage.tsx')).ProfileEditorPage,
            }),
          },
        ],
      },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
