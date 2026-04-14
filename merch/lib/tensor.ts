import type { Cub } from './cubs';

const TENSOR_GQL     = 'https://api.tensor.so/graphql';
const OKAYCUBS_SLUG  = 'okay_cubs';
// Fallback to the same key used in the public game client
const TENSOR_API_KEY = process.env.TENSOR_API_KEY || 'd682006c-c115-4c1e-a52f-c63e6f8e3e46';

async function tensorGql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  const key = TENSOR_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(TENSOR_GQL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-TENSOR-API-KEY': key },
      body:    JSON.stringify({ query, variables }),
      // Cache floor price for 60s, NFT holdings for 30s — callers override as needed
      next: { revalidate: 30 },
    } as RequestInit);
    const json = await res.json() as { data?: T; errors?: unknown[] };
    if (json.errors) { console.error('[Tensor] errors:', json.errors); return null; }
    return json.data ?? null;
  } catch (e) {
    console.error('[Tensor] fetch failed:', e);
    return null;
  }
}

// ── User holdings ──────────────────────────────────────────────────────────────
interface TensorMintAttr { traitType?: string; trait_type?: string; value: string }
interface TensorUserNfts {
  userNfts: Array<{
    mint: { onchainId: string; name: string; imageUri: string; attributes?: TensorMintAttr[] };
  }>;
}

export async function getCubsForWalletTensor(wallet: string): Promise<Cub[] | null> {
  // Try with attributes for richer metadata; fall back silently if field unsupported
  let data = await tensorGql<TensorUserNfts>(
    `query UserNfts($owner: String!, $slugs: [String!]!) {
      userNfts(owner: $owner, slugs: $slugs) {
        mint { onchainId name imageUri attributes { traitType value } }
      }
    }`,
    { owner: wallet, slugs: [OKAYCUBS_SLUG] },
  );
  if (!data?.userNfts) {
    data = await tensorGql<TensorUserNfts>(
      `query UserNfts($owner: String!, $slugs: [String!]!) {
        userNfts(owner: $owner, slugs: $slugs) {
          mint { onchainId name imageUri }
        }
      }`,
      { owner: wallet, slugs: [OKAYCUBS_SLUG] },
    );
  }

  if (!data?.userNfts) return null;

  return data.userNfts.map((n, i) => {
    const name   = n.mint?.name || `OkayCub #${i + 1}`;
    const num    = parseInt(name.replace(/\D/g, '')) || i + 1;
    const attrs  = n.mint?.attributes || [];
    const traits: Record<string, string> = {};
    attrs.forEach(a => { const k = a.traitType || a.trait_type; if (k) traits[k] = a.value; });
    const tc     = attrs.length;
    const rarity = tc >= 8 ? 'legendary' : tc >= 6 ? 'epic' : tc >= 4 ? 'rare' :
                   tc > 0  ? 'common' :
                   num % 100 === 0 ? 'legendary' : num % 25 === 0 ? 'epic' : num % 5 === 0 ? 'rare' : 'common';
    return {
      id:     n.mint?.onchainId || `tensor-${i}`,
      name,
      image:  n.mint?.imageUri  || '',
      number: num,
      rarity,
      traits,
    };
  });
}

// ── Collection floor price ─────────────────────────────────────────────────────
interface TensorCollStats {
  collectionStats: { floorPrice: string | null };
}

export async function getCollectionFloorTensor(): Promise<number | null> {
  const data = await tensorGql<TensorCollStats>(
    `query Floor($slug: String!) {
      collectionStats(slug: $slug) { floorPrice }
    }`,
    { slug: OKAYCUBS_SLUG },
  );
  const fp = data?.collectionStats?.floorPrice;
  if (!fp) return null;
  return Number(fp) / 1e9; // lamports → SOL
}
