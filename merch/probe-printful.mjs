// Run: node probe-printful.mjs
// Queries Printful catalog to find the correct product IDs.
// Paste output back to Claude.

const API_KEY = '10Kg7niRX22mCe4pmFDX9pWaBqBFVG2cdmkrtxjV';
const hdrs = { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };

// Candidates:
//   374, 398, 405, 460, 453, 9819, 407, 412  → AOP Wide-Leg Joggers
//   3719, 325, 77, 453, 460                  → OTTO Cap 31-069 DTFilm
//   380                                       → known hoodie (sanity check)
const IDS = [380, 374, 398, 405, 325, 3719, 9819, 77, 453, 460, 407, 412, 440, 450, 470, 480];

async function probe(pid) {
  const [vRes, pRes] = await Promise.all([
    fetch(`https://api.printful.com/products/${pid}`, { headers: hdrs }),
    fetch(`https://api.printful.com/mockup-generator/printfiles/${pid}`, { headers: hdrs }),
  ]);
  const v = await vRes.json();
  const p = await pRes.json();

  const title = v?.result?.product?.title ?? '—';
  const variants = v?.result?.variants ?? [];
  const placements = p?.result?.available_placements ?? {};

  // Group variants by color
  const byColor = {};
  for (const variant of variants) {
    const color = variant.color ?? 'Unknown';
    if (!byColor[color]) byColor[color] = [];
    byColor[color].push({ id: variant.id, size: variant.size ?? 'one-size' });
  }

  return { pid, status: vRes.status, title, placements, byColor };
}

const results = [];
for (const pid of IDS) {
  process.stdout.write(`Probing ${pid}...`);
  try {
    const r = await probe(pid);
    results.push(r);
    console.log(` ${r.status} — ${r.title}`);
  } catch (e) {
    results.push({ pid, status: 0, title: 'ERROR', error: e.message });
    console.log(` ERROR: ${e.message}`);
  }
}

console.log('\n\n====== FULL RESULTS (paste to Claude) ======\n');
console.log(JSON.stringify(results, null, 2));
