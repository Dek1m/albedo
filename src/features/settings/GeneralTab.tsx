import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { changeUsername } from '../../application/profile/changeUsername';
import { saveMe } from '../../application/profile/saveMe';
import { uploadAvatar } from '../../application/profile/uploadAvatar';
import { useAuthStore } from '../../auth/AuthStore';
import type { ChipDisplayMode } from '../../domain/chipDisplayMode';
import { chipLabel } from '../../domain/user';
import { humanMessage } from '../../api/errors';
import { Avatar } from '../../shared/ui/Avatar';
import { toast } from '../../shared/toast/toastStore';
import { COUNTRIES, formatPhone, phonePayload, type Country } from '../../shared/ui/phone';
import { selectDisplayMode } from './displayMutex';

const schema = z.object({
  nickname: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string(),
  phone: z.string(),
  username: z.string().min(1, 'Username is required'),
  password: z.string(),
  userPrompt: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function GeneralTab(): ReactElement | null {
  const profile = useAuthStore((state) => state.profile);
  const [mode, setMode] = useState<ChipDisplayMode>(profile?.chipDisplayMode ?? 'nickname');
  const [country, setCountry] = useState<Country>(COUNTRIES[0] as Country);
  const [phoneDisplay, setPhoneDisplay] = useState(profile?.phone ? formatPhone(profile.phone, COUNTRIES[0] as Country) : '');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const nickname = watch('nickname');
  const firstName = watch('firstName');
  const lastName = watch('lastName');

  const hasNickname = nickname.trim().length > 0;
  const hasFullName = firstName.trim().length > 0 && lastName.trim().length > 0;

  const onPhoneChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatPhone(raw, country);
      setPhoneDisplay(formatted);
      setValue('phone', phonePayload(formatted), { shouldDirty: true });
    },
    [country, setValue],
  );

  const onCountryChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const next = COUNTRIES.find((c) => c.code === e.target.value) ?? (COUNTRIES[0] as Country);
      setCountry(next);
      setPhoneDisplay((prev) => {
        const digits = prev.replace(/\D/g, '');
        const formatted = formatPhone(digits, next);
        setValue('phone', phonePayload(formatted), { shouldDirty: true });
        return formatted;
      });
    },
    [setValue],
  );

  if (!profile) {
    return null;
  }

  const onAvatar = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      await uploadAvatar(file);
      toast('Avatar updated', 'ok');
    } catch (err) {
      toast(humanMessage(err));
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
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast(parsed.error.issues[0]?.message ?? 'Check fields');
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
          toast('Current password required to change username');
          return;
        }
        await changeUsername(parsed.data.username, parsed.data.password);
      }
      toast('Saved', 'ok');
    } catch (err) {
      toast(humanMessage(err));
    }
  });

  return (
    <form className="albedo-settings-form" onSubmit={onSubmit} noValidate>
      <div className="albedo-settings-avatar">
        <Avatar label={chipLabel({ ...profile, chipDisplayMode: mode })} src={profile.avatarUrl} size={56} />
        <label className="btn btn-albedo-primary btn-sm">
          Upload
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onAvatar} />
        </label>
      </div>

      {/* Nickname */}
      <div className="albedo-settings-row">
        <div className="flex-grow-1">
          <label className="form-label" htmlFor="nickname">
            Nickname
          </label>
          <input id="nickname" className="form-control form-control-sm" {...register('nickname')} />
        </div>
        <label className="form-check albedo-settings-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={mode === 'nickname'}
            disabled={!hasNickname}
            onChange={() => setMode(selectDisplayMode('nickname'))}
          />
          <span className="form-check-label">display</span>
        </label>
      </div>

      {/* First / Last name */}
      <div className="albedo-settings-row">
        <div className="flex-grow-1 d-flex gap-2">
          <div className="flex-grow-1">
            <label className="form-label" htmlFor="firstName">
              First name *
            </label>
            <input id="firstName" className="form-control form-control-sm" {...register('firstName')} />
          </div>
          <div className="flex-grow-1">
            <label className="form-label" htmlFor="lastName">
              Last name *
            </label>
            <input id="lastName" className="form-control form-control-sm" {...register('lastName')} />
          </div>
        </div>
        <label className="form-check albedo-settings-check">
          <input
            className="form-check-input"
            type="checkbox"
            checked={mode === 'full_name'}
            disabled={!hasFullName}
            onChange={() => setMode(selectDisplayMode('full_name'))}
          />
          <span className="form-check-label">display</span>
        </label>
      </div>

      {/* Email */}
      <label className="form-label" htmlFor="email">
        Email
      </label>
      <input id="email" type="email" className="form-control form-control-sm" {...register('email')} />

      {/* Phone */}
      <label className="form-label" htmlFor="phone">
        Phone
      </label>
      <div className="albedo-phone-row">
        <select className="form-control form-control-sm albedo-phone-country" value={country.code} onChange={onCountryChange}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <input
          id="phone"
          className="form-control form-control-sm"
          value={phoneDisplay}
          onChange={onPhoneChange}
          placeholder={country.placeholder}
          maxLength={18}
        />
      </div>

      {/* Username + Password */}
      <div className="albedo-settings-row">
        <div className="flex-grow-1">
          <label className="form-label" htmlFor="username">
            Username *
          </label>
          <input id="username" className="form-control form-control-sm" autoComplete="username" {...register('username')} />
        </div>
        <div className="flex-grow-1">
          <label className="form-label" htmlFor="password">
            Password (to change username)
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

      {/* Prompt */}
      <label className="form-label" htmlFor="userPrompt">
        System prompt
      </label>
      <textarea id="userPrompt" className="form-control form-control-sm" rows={3} {...register('userPrompt')} />
      <label className="btn btn-sm albedo-ghost-btn align-self-start">
        Upload .txt / .md
        <input type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={onPromptFile} />
      </label>

      <button className="btn btn-sm btn-albedo-primary" type="submit" disabled={isSubmitting}>
        Save
      </button>
    </form>
  );
}
