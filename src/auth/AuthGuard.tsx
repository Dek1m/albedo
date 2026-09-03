import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Navigate } from 'react-router';
import { authApi } from '../api/authApi';
import { BrandMark } from '../features/shell/BrandMark';
import { useAuthStore } from './AuthStore';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps): ReactElement {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profile = useAuthStore((state) => state.profile);
  const markAuthenticated = useAuthStore((state) => state.markAuthenticated);
  const [restoreFailed, setRestoreFailed] = useState(false);

  useEffect(() => {
    if (isAuthenticated && profile) {
      return;
    }
    let cancelled = false;
    authApi
      .getMe()
      .then((me) => {
        if (!cancelled) {
          markAuthenticated(me);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRestoreFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profile, markAuthenticated]);

  if (isAuthenticated && profile) {
    return <>{children}</>;
  }
  if (!restoreFailed) {
    return (
      <main className="albedo-stage">
        <BrandMark as="h1" />
      </main>
    );
  }
  return <Navigate to="/login" replace />;
}
