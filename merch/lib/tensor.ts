import type { Cub } from './cubs';

const TENSOR_GQL     = 'https://api.tensor.so/graphql';
const OKAYCUBS_SLUG  = 'okay_cubs';

async function tensorGql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  const key = process.env.TENSOR_API_KEY;
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
interface TensorUserNfts {
  userNfts: Array<{
    mint: { onchainId: string; name: string; imageUri: string };
  }>;
}

export async function getCubsForWalletTensor(wallet: string): Promise<Cub[] | null> {
  const data = await tensorGql<TensorUserNfts>(
    `query UserNfts($owner: String!, $slugs: [String!]!) {
      userNfts(owner: $owner, slugs: $slugs) {
        mint { onchainId name imageUri }
      }
    }`,
    { owner: wallet, slugs: [OKAYCUBS_SLUG] },
  );

  if (!data?.userNfts) return null;

  return data.userNfts.map((n, i) => {
    const name        = n.mint?.name || `OkayCub #${i + 1}`;
    const numFromName = parseInt(name.replace(/\D/g, ''));
    return {
      id:     n.mint?.onchainId || `tensor-${i}`,
      name,
      image:  n.mint?.imageUri  || '',
      number: numFromName       || i + 1,
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
