import type { ChipDisplayMode } from '../../domain/chipDisplayMode';

export function selectDisplayMode(next: ChipDisplayMode): ChipDisplayMode {
  return next;
}

export function isMode(current: ChipDisplayMode, candidate: ChipDisplayMode): boolean {
  return current === candidate;
}
