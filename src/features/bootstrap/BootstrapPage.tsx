import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { authApi } from '../../api/authApi';
import { humanMessage } from '../../api/errors';
import { toast } from '../../shared/toast/toastStore';
import { ToastView } from '../../shared/toast/ToastView';
import { BrandMark } from '../shell/BrandMark';

const bootstrapSchema = z.object({
  username: z.string().min(1, 'Enter username'),
  password: z.string().min(1, 'Enter password'),
  email: z.string().optional(),
});

type BootstrapValues = z.infer<typeof bootstrapSchema>;

export function BootstrapPage(): ReactElement {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BootstrapValues>({
    defaultValues: { username: '', password: '', email: '' },
  });

  useEffect(() => {
    let cancelled = false;
    authApi
      .needsBootstrap()
      .then((needed) => {
        if (!cancelled && !needed) {
          navigate('/login', { replace: true });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast(humanMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const onSubmit = handleSubmit(async (values) => {
    const parsed = bootstrapSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'username' || field === 'password') {
          setError(field, { message: issue.message });
        }
      }
      return;
    }
    try {
      await authApi.bootstrap(parsed.data);
      navigate('/login', { state: { created: true }, replace: true });
    } catch (error) {
      toast(humanMessage(error));
    }
  });

  return (
    <main className="albedo-stage">
      <section className="albedo-auth-card">
        <BrandMark as="h1" />
        <p className="albedo-auth-hint">Создание первого администратора</p>
        <form className="albedo-auth-form" onSubmit={onSubmit} noValidate>
          <label className="form-label" htmlFor="bootstrap-username">
            Имя пользователя
          </label>
          <input
            id="bootstrap-username"
            className="form-control form-control-sm"
            autoComplete="username"
            {...register('username')}
          />
          {errors.username ? <p className="albedo-auth-error">{errors.username.message}</p> : null}

          <label className="form-label" htmlFor="bootstrap-password">
            Пароль
          </label>
          <input
            id="bootstrap-password"
            type="password"
            className="form-control form-control-sm"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password ? <p className="albedo-auth-error">{errors.password.message}</p> : null}

          <label className="form-label" htmlFor="bootstrap-email">
            Email (необязательно)
          </label>
          <input
            id="bootstrap-email"
            type="email"
            className="form-control form-control-sm"
            autoComplete="email"
            {...register('email')}
          />

          <button className="btn btn-sm btn-albedo-primary w-100" type="submit" disabled={isSubmitting}>
            Создать
          </button>
        </form>
      </section>
      <ToastView />
    </main>
  );
}
