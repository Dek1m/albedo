import { describe, expect, it } from 'vitest';
import { ApiError, humanMessage } from './errors';

describe('humanMessage', () => {
  it('maps VALIDATION and AUTH_ERROR', () => {
    expect(humanMessage(new ApiError('VALIDATION', 'Invalid page cursor'))).toBe('Invalid request');
    expect(humanMessage(new ApiError('AUTH_ERROR', 'Authentication required'))).toBe('Sign-in failed');
  });

  it('maps notification codes', () => {
    expect(humanMessage(new ApiError('QUERY_FAILED', 'IndeterminateDatatype'))).toBe(
      'Could not load notifications',
    );
    expect(humanMessage(new ApiError('NOTIFICATION_ERROR', 'boom'))).toBe(
      'Could not load notifications',
    );
  });

  it('falls back for TASK_FAILED', () => {
    expect(humanMessage(new ApiError('TASK_FAILED', 'TypeError: unexpected keyword'))).toBe(
      'Request failed',
    );
  });

  it('maps NOT_IMPLEMENTED', () => {
    expect(humanMessage(new ApiError('NOT_IMPLEMENTED', 'stub'))).toBe('Not implemented yet');
  });

  it('shows server FORBIDDEN human unless technical or empty', () => {
    expect(humanMessage(new ApiError('FORBIDDEN', 'Module has loaded dependents'))).toBe(
      'Module has loaded dependents',
    );
    expect(humanMessage(new ApiError('FORBIDDEN', ''))).toBe('You do not have permission');
    expect(humanMessage(new ApiError('FORBIDDEN', 'Internal error'))).toBe(
      'You do not have permission',
    );
  });
});
