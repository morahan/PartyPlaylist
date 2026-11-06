import {
  alignmentOffset, countIn, estimateClockOffset, pauseCorrections, shouldSuggestTapAlignment, tapPeriod, tapPhase,
} from './sync';

// Taps every `period` ms starting at `start`, with deterministic jitter.
function taps(start: number, period: number, n = 8, jitter = [0, 12, -9, 6, -14, 3, 10, -5]) {
  return Array.from({ length: n }, (_, i) => start + i * period + jitter[i % jitter.length]);
}

test('clock offset uses the fastest round trip', () => {
  // Remote clock is 1000 ms ahead. Second sample sat in a queue for 300 ms.
  const { offsetMs, uncertaintyMs } = estimateClockOffset([
    { t0: 0, t1: 1020, t2: 1021, t3: 41 },
    { t0: 100, t1: 1420, t2: 1421, t3: 441 },
  ]);
  expect(offsetMs).toBeCloseTo(1000, 0);
  expect(uncertaintyMs).toBe(20);
});

test('count-in ticks lead up to the press', () => {
  expect(countIn(10_000, 500, 3)).toEqual({ ticks: [8500, 9000, 9500], pressAt: 10_000 });
});

test('tap alignment is only suggested beyond two seconds', () => {
  expect(shouldSuggestTapAlignment(1500)).toBe(false);
  expect(shouldSuggestTapAlignment(-2500)).toBe(true);
});

test('tempo and phase survive jitter and a missed beat', () => {
  const t = taps(50_120, 500).filter((_, i) => i !== 4);
  const periodMs = tapPeriod(t);
  expect(Math.abs(periodMs - 500)).toBeLessThan(5);
  expect(Math.abs(tapPhase(t, periodMs, 50_000) - 120)).toBeLessThan(15);
});

test('rejects too few taps or taps over ten seconds', () => {
  expect(() => tapPeriod([0, 500, 1000])).toThrow();
  expect(() => tapPeriod(taps(0, 2000, 8))).toThrow('too long');
});

test('listener 180 ms ahead is measured within the 100 ms target', () => {
  // Being ahead means hearing (and tapping) each beat earlier.
  const ref = taps(70_000, 500);
  const mine = taps(70_000 - 180, 500, 8, [5, -10, 8, 0, -6, 11, -3, 4]);
  expect(Math.abs(alignmentOffset(ref, mine) - 180)).toBeLessThan(30);
});

test('coarse estimate resolves whole-beat ambiguity', () => {
  const ref = taps(70_000, 500);
  const mine = taps(70_000 - 2180, 500);
  expect(Math.abs(alignmentOffset(ref, mine, 2000) - 2180)).toBeLessThan(30);
});

test('only listeners ahead of the slowest pause', () => {
  expect(pauseCorrections({ A: 1200, B: 0, C: 20, D: 450 })).toEqual({ A: 1200, D: 450 });
});
