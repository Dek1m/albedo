import { useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { changeUsername } from '../../application/profile/changeUsername';
import { saveMe } from '../../application/profile/saveMe';
import { uploadAvatar } from '../../application/profile/uploadAvatar';
import { useAuthStore } from '../../auth/AuthStore';
import type { ChipDisplayMode } from '../../domain/chipDisplayMode';
import { chipLabel } from '../../domain/user';
import { Avatar } from '../../shared/ui/Avatar';
import { selectDisplayMode } from './displayMutex';

const schema = z.object({
  nickname: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  username: z.string().min(1),
  password: z.string(),
  userPrompt: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function GeneralTab(): ReactElement | null {
  const profile = useAuthStore((state) => state.profile);
  const [mode, setMode] = useState<ChipDisplayMode>(profile?.chipDisplayMode ?? 'nickname');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      nickname: profile?.nickname ?? '',
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      username: profile?.username ?? '',
      password: '',
      userPrompt: profile?.userPrompt ?? '',
    },
  });

  if (!profile) {
    return null;
  }

  const onAvatar = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    setError(null);
    try {
      await uploadAvatar(file);
      setOk('Аватар обновлён');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить аватар');
    }
  };

  const onPromptFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setValue('userPrompt', reader.result);
      }
    };
    reader.readAsText(file);
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setOk(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Проверьте поля');
      return;
    }
    try {
      await saveMe({
        nickname: parsed.data.nickname,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        user_prompt: parsed.data.userPrompt,
        chip_display_mode: mode,
      });
      if (parsed.data.username !== profile.username) {
        if (!parsed.data.password) {
          setError('Для смены логина нужен текущий пароль');
          return;
        }
        await changeUsername(parsed.data.username, parsed.data.password);
      }
      setOk('Сохранено');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  });

  return (
    <form className="albedo-settings-form" onSubmit={onSubmit} noValidate>
      <div className="albedo-settings-avatar">
        <Avatar label={chipLabel({ ...profile, chipDisplayMode: mode })} src={profile.avatarUrl} size={56} />
        <label className="btn btn-albedo-primary btn-sm">
          Загрузить
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onAvatar} />
        </label>
      </div>

      <div className="albedo-settings-row">
        <div className="flex-grow-1">
          <label className="form-label" htmlFor="nickname">
            Никнейм
          </label>
          <input id="nickname" className="form-control form-control-sm" {...register('nickname')} />
        </div>
        <label className="form-check albedo-settings-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={mode === 'nickname'}
            onChange={() => setMode(selectDisplayMode('nickname'))}
          />
          <span className="form-check-label">отображать</span>
        </label>
      </div>

      <div className="albedo-settings-row">
        <div className="flex-grow-1 d-flex gap-2">
          <div className="flex-grow-1">
            <label className="form-label" htmlFor="firstName">
              Firstname
            </label>
              <input id="firstName" className="form-control form-control-sm" {...register('firstName')} />
          </div>
          <div className="flex-grow-1">
            <label className="form-label" htmlFor="lastName">
              Lastname
            </label>
              <input id="lastName" className="form-control form-control-sm" {...register('lastName')} />
          </div>
        </div>
        <label className="form-check albedo-settings-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={mode === 'full_name'}
            onChange={() => setMode(selectDisplayMode('full_name'))}
          />
          <span className="form-check-label">отображать</span>
        </label>
      </div>

      <label className="form-label" htmlFor="email">
        E-mail
      </label>
      <input id="email" type="email" className="form-control form-control-sm" {...register('email')} />

      <label className="form-label" htmlFor="phone">
        Телефон
      </label>
      <input id="phone" className="form-control form-control-sm" {...register('phone')} />

      <div className="albedo-settings-row">
        <div className="flex-grow-1">
          <label className="form-label" htmlFor="username">
            Логин
          </label>
          <input id="username" className="form-control form-control-sm" autoComplete="username" {...register('username')} />
        </div>
        <div className="flex-grow-1">
          <label className="form-label" htmlFor="password">
            Пароль (для смены логина)
          </label>
          <input
            id="password"
            type="password"
            className="form-control form-control-sm"
            autoComplete="current-password"
            {...register('password')}
          />
        </div>
      </div>

      <label className="form-label" htmlFor="userPrompt">
        Пользовательский промпт
      </label>
      <textarea id="userPrompt" className="form-control form-control-sm" rows={3} {...register('userPrompt')} />
      <label className="btn btn-sm albedo-ghost-btn align-self-start">
        Загрузить .txt / .md
        <input type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={onPromptFile} />
      </label>

      {error ? <p className="albedo-auth-error">{error}</p> : null}
      {ok ? <p className="albedo-auth-hint">{ok}</p> : null}

      <button className="btn btn-sm btn-albedo-primary" type="submit" disabled={isSubmitting}>
        Сохранить
      </button>
    </form>
  );
}
