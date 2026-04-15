// Run: node probe-printful.mjs
// Round 2 — narrows down AOP Wide-Leg Joggers and OTTO Cap 31-069

const API_KEY = '10Kg7niRX22mCe4pmFDX9pWaBqBFVG2cdmkrtxjV';
const hdrs = { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

// AOP jogger: near product 470 (AOP bikini) and 400 (AOP Men's Jogger)
// Cap: near product 77 (OTTO snapback), try 50-90 range
const IDS = [
  // Caps near 77
  50, 51, 52, 53, 55, 57, 58, 60, 61, 62, 63, 65, 70, 71, 72, 73, 75, 76, 78, 79, 80, 81, 82,
  // AOP jogger region
  400, 401, 402, 403, 406, 408, 409, 410, 411, 413, 414, 415, 416, 417, 418, 419, 420,
  421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435,
  // Higher AOP range
  455, 456, 457, 458, 459, 461, 462, 463, 464, 465, 466, 467, 468, 469, 471, 472, 473, 474, 475,
];

async function probe(pid) {
  const res = await fetch(`https://api.printful.com/products/${pid}`, { headers: hdrs });
  const data = await res.json();
  const title = data?.result?.product?.title ?? '—';
  const variants = data?.result?.variants ?? [];
  const byColor = {};
  for (const v of variants) {
    const c = v.color ?? 'Unknown';
    if (!byColor[c]) byColor[c] = [];
    byColor[c].push({ id: v.id, size: v.size ?? 'one-size' });
  }
  return { pid, status: res.status, title, byColor };
}

const found = [];
for (const pid of IDS) {
  process.stdout.write(`${pid}...`);
  try {
    const r = await probe(pid);
    if (r.status === 200) {
      found.push(r);
      console.log(` ✓ ${r.title}`);
    } else {
      process.stdout.write(` 404\n`);
    }
  } catch (e) {
    process.stdout.write(` ERR\n`);
  }
}

console.log('\n\n====== FOUND PRODUCTS (paste to Claude) ======\n');
console.log(JSON.stringify(found, null, 2));
