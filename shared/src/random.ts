/**
 * Small seeded PRNG (mulberry32). The generator state lives in the game state so every
 * action stays a pure function of its inputs, which keeps games replayable and lets the
 * full state be stored in Firestore.
 */
export function nextRandom(seed: number): [value: number, nextSeed: number] {
  const nextSeed = (seed + 0x6d2b79f5) | 0;
  let t = nextSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, nextSeed];
}

/** Fisher-Yates shuffle driven by the seeded generator. */
export function shuffle<T>(items: readonly T[], seed: number): [shuffled: T[], nextSeed: number] {
  const result = [...items];
  let current = seed;
  for (let n = result.length - 1; n > 0; n--) {
    const [value, next] = nextRandom(current);
    current = next;
    const k = Math.floor(value * (n + 1));
    [result[k], result[n]] = [result[n], result[k]];
  }
  return [result, current];
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
