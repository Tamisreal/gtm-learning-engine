// Seeded RNG so every run and every demo is reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Beta sample via two Gamma draws (Marsaglia-Tsang). Used by the split test.
function gamma(rand, k) {
  if (k < 1) return gamma(rand, k + 1) * Math.pow(rand(), 1 / k);
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do {
      const u1 = rand() || 1e-12;
      const u2 = rand();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function betaSample(rand, a, b) {
  const x = gamma(rand, a);
  const y = gamma(rand, b);
  return x / (x + y);
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

module.exports = { mulberry32, betaSample, pick };
