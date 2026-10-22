import { describe, expect, it } from 'vitest';
import { formatElapsed, nextTickIn } from './formatElapsed';

const s = 1000;
const m = 60 * s;
const h = 60 * m;

describe('formatElapsed', () => {
  it.each([
    [0, ''],
    [999, ''],
    [-5 * s, ''],
    [Number.NaN, ''],
    [1 * s, '1s'],
    [34 * s + 900, '34s'],
    [59 * s + 999, '59s'],
    [1 * m, '1m 00s'],
    [1 * m + 23 * s, '1m 23s'],
    [9 * m + 59 * s + 999, '9m 59s'],
    [10 * m, '10m'],
    [23 * m + 59 * s, '23m'],
    [59 * m + 59 * s, '59m'],
    [1 * h, '1h 00m'],
    [1 * h + 2 * m + 30 * s, '1h 02m'],
    [12 * h + 34 * m, '12h 34m'],
  ])('%i ms → %j', (ms, expected) => {
    expect(formatElapsed(ms)).toBe(expected);
  });
});

describe('nextTickIn', () => {
  it('lands on the next whole second while seconds are shown', () => {
    expect(nextTickIn(0)).toBe(s);
    expect(nextTickIn(1250)).toBe(750);
    expect(nextTickIn(9 * m + 59 * s + 500)).toBe(500);
  });

  it('lands on the next whole minute once seconds are dropped', () => {
    expect(nextTickIn(10 * m)).toBe(m);
    expect(nextTickIn(10 * m + 15 * s)).toBe(45 * s);
  });

  it('treats a clock that went backwards as zero', () => {
    expect(nextTickIn(-300)).toBe(s);
  });
});
