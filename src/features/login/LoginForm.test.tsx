import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/errors';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('shows envelope error message', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError('INVALID_CREDENTIALS', 'Invalid username or password', undefined, 401),
    );
    render(<LoginForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Имя пользователя'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
    await waitFor(() => {
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
    });
  });
});
