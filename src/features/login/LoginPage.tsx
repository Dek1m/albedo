import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../auth/AuthStore';
import { LoginForm } from './LoginForm';
import type { LoginValues } from './LoginForm';

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const markAuthenticated = useAuthStore((state) => state.markAuthenticated);
  const created = Boolean((location.state as { created?: boolean } | null)?.created);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let cancelled = false;
    authApi
      .needsBootstrap()
      .then((needed) => {
        if (!cancelled && needed) {
          navigate('/bootstrap', { replace: true });
        }
      })
      .catch(() => {
        // бэк недоступен — остаёмся на форме
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const onSubmit = async (values: LoginValues): Promise<void> => {
    await authApi.login(values.username, values.password);
    const profile = await authApi.getMe();
    markAuthenticated(profile);
    navigate('/', { replace: true });
  };

  return (
    <main className="albedo-stage">
      <section className="albedo-auth-card">
        <h1 className="albedo-brand">Albedo</h1>
        {created ? <p className="albedo-auth-hint">Админ создан. Войдите.</p> : null}
        <LoginForm onSubmit={onSubmit} />
      </section>
    </main>
  );
}
