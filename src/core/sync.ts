// Playback-sync math, independent of the music service each phone plays from.
// All timestamps are milliseconds. "Shared" time is the party clock that every
// device converts to with its estimated clock offset.

export const TARGET_SYNC_MS = 100;
// Optional tap alignment is only suggested when automatic sync is worse than this.
export const TAP_SUGGEST_THRESHOLD_MS = 2000;
export const TAP_MAX_DURATION_MS = 10_000;
export const MIN_TAPS = 4;
// Pauses shorter than this aren't worth asking a person to make.
export const MIN_CORRECTION_MS = 40;

// One NTP-style round trip: t0 local send, t1 remote receive, t2 remote send, t3 local receive.
export type ClockSample = { t0: number; t1: number; t2: number; t3: number };

// Offset to add to local time to get shared time. Uses the sample with the
// smallest round trip, since queuing delay only ever adds error.
export function estimateClockOffset(samples: ClockSample[]) {
  if (samples.length === 0) throw new Error('Need at least one clock sample');
  const best = samples.reduce((a, b) => (roundTrip(b) < roundTrip(a) ? b : a));
  return {
    offsetMs: (best.t1 - best.t0 + (best.t2 - best.t3)) / 2,
    uncertaintyMs: roundTrip(best) / 2,
  };
}

function roundTrip({ t0, t1, t2, t3 }: ClockSample) {
  return t3 - t0 - (t2 - t1);
}

// Shared-clock times for a rhythmic count-in; the person presses on the beat after the last tick.
export function countIn(startAtMs: number, beatMs = 600, ticks = 3) {
  return {
    ticks: Array.from({ length: ticks }, (_, i) => startAtMs - (ticks - i) * beatMs),
    pressAt: startAtMs,
  };
}

export function shouldSuggestTapAlignment(estimatedErrorMs: number) {
  return Math.abs(estimatedErrorMs) > TAP_SUGGEST_THRESHOLD_MS;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function assertTaps(taps: number[]) {
  if (taps.length < MIN_TAPS) throw new Error(`Need at least ${MIN_TAPS} taps`);
  if (taps[taps.length - 1] - taps[0] > TAP_MAX_DURATION_MS) throw new Error('Taps took too long');
}

// Beat period from taps (shared-clock times): number each tap by beat, which
// tolerates a missed beat, then least-squares fit time against beat number.
export function tapPeriod(taps: number[]) {
  assertTaps(taps);
  const rough = median(taps.slice(1).map((t, i) => t - taps[i]));
  const beats = taps.map((t) => Math.round((t - taps[0]) / rough));
  const meanBeat = beats.reduce((a, b) => a + b, 0) / beats.length;
  const meanTime = taps.reduce((a, b) => a + b, 0) / taps.length;
  let num = 0;
  let den = 0;
  beats.forEach((b, i) => {
    num += (b - meanBeat) * (taps[i] - meanTime);
    den += (b - meanBeat) ** 2;
  });
  return num / den;
}

// Where within the beat the taps land, measured from `originMs`. A circular
// mean, so one sloppy tap near the beat boundary doesn't skew it.
export function tapPhase(taps: number[], periodMs: number, originMs: number) {
  assertTaps(taps);
  let x = 0;
  let y = 0;
  for (const t of taps) {
    const angle = (2 * Math.PI * (t - originMs)) / periodMs;
    x += Math.cos(angle);
    y += Math.sin(angle);
  }
  return (Math.atan2(y, x) / (2 * Math.PI)) * periodMs;
}

// How far ahead (positive) or behind this listener is relative to the reference.
// Taps only resolve offset within half a beat, so `coarseMs` (e.g. from playback
// positions, when a service exposes them) picks the right whole-beat multiple.
export function alignmentOffset(referenceTaps: number[], myTaps: number[], coarseMs = 0) {
  const periodMs = (tapPeriod(referenceTaps) + tapPeriod(myTaps)) / 2;
  const origin = referenceTaps[0];
  const diff = tapPhase(referenceTaps, periodMs, origin) - tapPhase(myTaps, periodMs, origin);
  return diff + Math.round((coarseMs - diff) / periodMs) * periodMs;
}

// Corrections are pause-only: everyone ahead of the furthest-behind listener
// pauses for the difference, so no one has to seek inside another app.
export function pauseCorrections(aheadMsByMember: Record<string, number>) {
  const values = Object.values(aheadMsByMember);
  if (values.length === 0) return {};
  const behind = Math.min(...values);
  const pauses: Record<string, number> = {};
  for (const [id, ahead] of Object.entries(aheadMsByMember)) {
    const pause = Math.round(ahead - behind);
    if (pause >= MIN_CORRECTION_MS) pauses[id] = pause;
  }
  return pauses;
}
