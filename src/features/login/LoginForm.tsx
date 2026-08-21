import { useState } from 'react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '../../api/errors';

const loginSchema = z.object({
  username: z.string().min(1, 'Введите имя пользователя'),
  password: z.string().min(1, 'Введите пароль'),
});

export type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (values: LoginValues) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps): ReactElement {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { username: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    const parsed = loginSchema.safeParse(values);
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
      await onSubmit(parsed.data);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Не удалось войти');
    }
  });

  return (
    <form className="albedo-auth-form" onSubmit={submit} noValidate>
      <label className="form-label" htmlFor="username">
        Имя пользователя
      </label>
      <input
        id="username"
        className="form-control"
        autoComplete="username"
        {...register('username')}
      />
      {errors.username ? <p className="albedo-auth-error">{errors.username.message}</p> : null}

      <label className="form-label" htmlFor="password">
        Пароль
      </label>
      <input
        id="password"
        type="password"
        className="form-control"
        autoComplete="current-password"
        {...register('password')}
      />
      {errors.password ? <p className="albedo-auth-error">{errors.password.message}</p> : null}

      {formError ? <p className="albedo-auth-error">{formError}</p> : null}

      <button className="btn btn-albedo-primary w-100" type="submit" disabled={isSubmitting}>
        Войти
      </button>
    </form>
  );
}
