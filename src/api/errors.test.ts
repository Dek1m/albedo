import { describe, expect, it } from 'vitest';
import { ApiError, humanMessage } from './errors';

describe('humanMessage', () => {
  it('maps VALIDATION and AUTH_ERROR', () => {
    expect(humanMessage(new ApiError('VALIDATION', 'Invalid page cursor'))).toBe('Invalid request');
    expect(humanMessage(new ApiError('AUTH_ERROR', 'Authentication required'))).toBe('Sign-in failed');
  });

  it('falls back for TASK_FAILED', () => {
    expect(humanMessage(new ApiError('TASK_FAILED', 'TypeError: unexpected keyword'))).toBe(
      'Something went wrong',
    );
  });
});
