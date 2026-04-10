import fs from 'fs';
import path from 'path';
import { getCubsForWalletTensor } from './tensor';

export interface Cub {
  id: string;
  name: string;
  image: string;
  number: number;
  rarity?: string;
  traits?: Record<string, string>;
}

const HELIUS_KEY = process.env.HELIUS_KEY;
const HELIUS_RPC = HELIUS_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`
  : 'https://api.mainnet-beta.solana.com'; // public fallback (rate-limited)
const IPFS_GATEWAY = 'https://nftstorage.link/ipfs/';

// Known OkayCubs IPFS CID — used for featured/sample cubs shown to non-holders
const CUBS_CID = 'QmZsTzg9Y88239r1uU2zkvdBYooJZNteu5NuUwLcFQYoqf';

// A curated set of OkayCubs shown when a visitor hasn't connected a wallet.
// Numbers confirmed present in the collection from on-chain data.
export const FEATURED_CUBS: Cub[] = [
    1,   42,  100,  150,  200,  250,  300,  350,  400,  450,
  500,  550,  600,  650,  700,  777,  800,  900, 1000, 1100,
 1200, 1300, 1400, 1456, 1500, 1600, 1700, 1800, 1900, 1999,
 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 2944,
 3000, 3100, 3200, 3300, 3400, 3500, 3620, 3700, 3800, 3900,
 4000, 4100, 4200, 4300, 4400, 4444, 4500, 4600, 4700, 4898,
].map(n => ({
  id:     `featured-${n}`,
  name:   `OkayCub #${n}`,
  image:  `${IPFS_GATEWAY}${CUBS_CID}/${n}.png`,
  number: n,
}));

function toHttpUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('ipfs://')) return IPFS_GATEWAY + url.slice(7);
  if (url.startsWith('ar://')) return 'https://arweave.net/' + url.slice(5);
  const cdnIpfs = url.match(/cdn-cgi\/image\/+https?:\/\/[^/]+\/ipfs\/(.+)/);
  if (cdnIpfs) return IPFS_GATEWAY + cdnIpfs[1];
  const cdnOther = url.match(/cdn-cgi\/image\/+(https?:\/\/.+)/);
  if (cdnOther) return cdnOther[1];
  const knownGw = url.match(/https?:\/\/(?:ipfs\.io|cloudflare-ipfs\.com|gateway\.ipfs\.io)\/ipfs\/(.+)/);
  if (knownGw) return IPFS_GATEWAY + knownGw[1];
  if (!url.startsWith('http://') && !url.startsWith('https://')) return '';
  return url;
}

function isOkayCub(nft: Record<string, unknown>): boolean {
  const content = nft.content as Record<string, unknown> | undefined;
  const meta    = (content?.metadata as Record<string, string> | undefined) || {};
  const name    = (meta.name || '').toLowerCase();
  const uri     = ((content?.json_uri as string) || '').toLowerCase();
  const groups  = (nft.grouping as Array<Record<string, unknown>>) || [];

  const nameMatch = name.includes('cub') || name.includes('okay');
  const uriMatch  = uri.includes('cub') || uri.includes('okay') || uri.includes('testlaunchmynft');
  const collMatch = groups.some(g => {
    const collMeta = (g.collection_metadata as Record<string, string> | undefined) || {};
    const collName = (collMeta.name || '').toLowerCase();
    const symbol   = (collMeta.symbol || '').toLowerCase();
    return collName.includes('cub') || collName.includes('okay') ||
           symbol.includes('cub')   || symbol.includes('okay');
  });
  return nameMatch || uriMatch || collMatch;
}

function nftToCub(nft: Record<string, unknown>, index: number): Cub {
  const content  = nft.content as Record<string, unknown> | undefined;
  const meta     = (content?.metadata as Record<string, unknown> | undefined) || {};
  const files    = (content?.files as Array<Record<string, string>>) || [];
  const links    = (content?.links as Record<string, string> | undefined) || {};
  const imgFile  = files.find(f => f.mime?.startsWith('image'));
  const rawUrl   = imgFile?.cdn_uri || imgFile?.uri || links?.image || files[0]?.cdn_uri || files[0]?.uri || '';
  const image    = toHttpUrl(rawUrl);
  // Try name first ("OkayCub #2944" → 2944), then image filename ("/2944.png" → 2944)
  const nameStr     = (meta.name as string) || '';
  const numFromName = parseInt(nameStr.replace(/\D/g, ''));
  const numFromFile = parseInt(rawUrl.match(/\/(\d+)\.(?:png|jpe?g|gif|webp)(?:[?#]|$)/i)?.[1] ?? '');
  const num         = numFromName || numFromFile || index + 1;
  // Use the real number in the displayed name so it always matches RPG numbering
  const displayName = nameStr || `OkayCub #${num}`;

  return {
    id:     (nft.id as string) || String(index),
    name:   displayName,
    image,
    number: num,
  };
}

// Fetch cubs owned by a specific wallet
export async function getCubsForWallet(walletAddress: string): Promise<Cub[]> {
  // Try Tensor first — richer metadata, no pagination needed
  const tensorCubs = await getCubsForWalletTensor(walletAddress);
  if (tensorCubs && tensorCubs.length > 0) return tensorCubs;

  // Fall back to Helius DAS API
  let page = 1;
  const all: Record<string, unknown>[] = [];

  while (true) {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 'get-nfts', method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page, limit: 1000,
          displayOptions: {
            showFungible: false, showNativeBalance: false,
            showUnverifiedCollections: true, showCollectionMetadata: true,
          },
        },
      }),
    });
    const data = await res.json() as { result?: { items?: Record<string, unknown>[] } };
    const items = data?.result?.items || [];
    all.push(...items);
    if (items.length < 1000) break;
    page++;
  }

  const cubs = all.filter(isOkayCub);
  if (cubs.length > 0) return cubs.slice(0, 50).map(nftToCub);

  // Fallback: return all real NFTs if none matched the OkayCubs filter
  return all
    .filter(n => {
      const iface   = (n.interface as string) || '';
      const content = n.content as Record<string, unknown> | undefined;
      const meta    = (content?.metadata as Record<string, string> | undefined) || {};
      const name    = meta.name || '';
      const files   = (content?.files as Array<Record<string, string>>) || [];
      const links   = (content?.links as Record<string, string> | undefined) || {};
      const hasImg  = !!(links?.image || files.find(f => f.mime?.startsWith('image')));
      const isNFT   = ['V1_NFT', 'ProgrammableNFT', 'MplCoreAsset', 'Custom'].includes(iface);
      return isNFT && hasImg && !name.startsWith('🎁');
    })
    .slice(0, 50)
    .map(nftToCub);
}

// Fetch OkayCubs from the full collection (for browse-without-wallet mode)
export async function getAllOkayCubs(page = 1, limit = 50): Promise<Cub[]> {
  const collectionAddress = process.env.OKAYCUBS_COLLECTION_ADDRESS;

  if (collectionAddress) {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 'get-collection', method: 'getAssetsByGroup',
        params: { groupKey: 'collection', groupValue: collectionAddress, page, limit },
      }),
    });
    const data = await res.json() as { result?: { items?: Record<string, unknown>[] } };
    const items = data?.result?.items || [];
    return items.map(nftToCub);
  }

  // Fallback: search by name — OkayCubs use "OkayCub" (no space)
  const res = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 'search', method: 'searchAssets',
      params: { tokenType: 'nonFungible', name: 'OkayCub', page, limit },
    }),
  });
  const data = await res.json() as { result?: { items?: Record<string, unknown>[] } };
  const items = data?.result?.items || [];
  return items.map(nftToCub);
}

// Local file fallback (development)
export function getLocalCubs(): Cub[] {
  const cubsDir = path.join(process.cwd(), 'public', 'cubs');
  let files: string[] = [];
  try {
    files = fs.readdirSync(cubsDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));
  } catch { /* directory missing */ }

  if (files.length === 0) {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `demo-${i + 1}`, name: `OkayCub #${i + 1}`, image: '', number: i + 1,
    }));
  }

  return files.map((file, i) => {
    const base = path.basename(file, path.extname(file));
    const num  = parseInt(base.replace(/\D/g, '')) || i + 1;
    return { id: base, name: `OkayCub #${num}`, image: `/cubs/${file}`, number: num };
  }).sort((a, b) => a.number - b.number);
}
