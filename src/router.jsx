import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';

const LoginPage           = lazy(() => import('./pages/LoginPage'));
const DashboardPage       = lazy(() => import('./pages/DashboardPage'));
const ClientesPage        = lazy(() => import('./pages/ClientesPage'));
const ClienteFormPage     = lazy(() => import('./pages/ClienteFormPage'));
const MateriaisPage       = lazy(() => import('./pages/MateriaisPage'));
const MaterialFormPage    = lazy(() => import('./pages/MaterialFormPage'));
const OrcamentosPage      = lazy(() => import('./pages/OrcamentosPage'));
const PrecosPage          = lazy(() => import('./pages/PrecosPage'));
const OrcamentoEditorPage = lazy(() => import('./pages/OrcamentoEditorPage'));
const EmBreve             = lazy(() => import('./pages/EmBreve'));

const fallbackCarregando = (
  <div className="flex items-center justify-center h-screen bg-marble-white">
    <div className="text-slate-500 text-sm">Carregando...</div>
  </div>
);

const lazyEl = (node) => <Suspense fallback={fallbackCarregando}>{node}</Suspense>;

const router = createBrowserRouter(
  [
    { path: '/login', element: lazyEl(<LoginPage />) },
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true,                element: lazyEl(<EmBreve titulo="Início" />) },
        { path: 'dashboard',          element: lazyEl(<DashboardPage />) },
        { path: 'contratos',          element: lazyEl(<EmBreve titulo="Contratos" />) },
        { path: 'clientes',           element: lazyEl(<ClientesPage />) },
        { path: 'clientes/novo',      element: lazyEl(<ClienteFormPage />) },
        { path: 'clientes/:id',       element: lazyEl(<ClienteFormPage />) },
        { path: 'materiais',          element: lazyEl(<MateriaisPage />) },
        { path: 'materiais/novo',     element: lazyEl(<MaterialFormPage />) },
        { path: 'materiais/:id',      element: lazyEl(<MaterialFormPage />) },
        { path: 'orcamentos',         element: lazyEl(<OrcamentosPage />) },
        { path: 'orcamentos/:id',     element: lazyEl(<OrcamentoEditorPage />) },
        { path: 'precos',             element: lazyEl(<PrecosPage />) },
      ],
    },
  ],
  { basename: '/marmore' }
);

export default router;
