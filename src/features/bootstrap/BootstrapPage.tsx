import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { authApi } from '../../api/authApi';
import { ApiError } from '../../api/errors';

const bootstrapSchema = z.object({
  username: z.string().min(1, 'Введите имя пользователя'),
  password: z.string().min(1, 'Введите пароль'),
  email: z.string().optional(),
});

type BootstrapValues = z.infer<typeof bootstrapSchema>;

export function BootstrapPage(): ReactElement {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
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
          setFormError(
            error instanceof ApiError ? error.message : 'Не удалось проверить bootstrap',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
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
      const email = parsed.data.email?.trim();
      await authApi.bootstrap({
        username: parsed.data.username,
        password: parsed.data.password,
        ...(email ? { email } : {}),
      });
      navigate('/login', { replace: true, state: { created: true } });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Не удалось создать администратора');
    }
  });

  return (
    <main className="albedo-stage">
      <section className="albedo-auth-card">
        <h1 className="albedo-brand">Albedo</h1>
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

          {formError ? <p className="albedo-auth-error">{formError}</p> : null}

          <button className="btn btn-sm btn-albedo-primary w-100" type="submit" disabled={isSubmitting}>
            Создать
          </button>
        </form>
      </section>
    </main>
  );
}
