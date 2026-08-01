import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, pushRecent } from '../../src/prefs.js';

describe('pushRecent', () => {
  it('puts the newest id first', () => {
    expect(pushRecent(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('moves an id already present rather than duplicating it', () => {
    expect(pushRecent(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
  });

  it('truncates to the limit, dropping the oldest', () => {
    expect(pushRecent(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
  });

  it('accepts an empty history', () => {
    expect(pushRecent([], 'a')).toEqual(['a']);
  });

  it('defaults recentIds to an empty list', () => {
    expect(DEFAULT_PREFS.recentIds).toEqual([]);
  });
});
