import { createBrowserRouter, Navigate } from 'react-router';
import { AuthGuard } from '../auth/AuthGuard';
import { BootstrapPage } from '../features/bootstrap/BootstrapPage';
import { LoginPage } from '../features/login/LoginPage';
import { AppShell } from '../features/shell/AppShell';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/bootstrap', element: <BootstrapPage /> },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
