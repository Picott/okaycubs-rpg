import fs from 'fs';
import path from 'path';

export interface Cub {
  id: string;
  name: string;
  image: string;
  number: number;
}

const HELIUS_KEY = process.env.HELIUS_KEY || 'b5292800-573a-40c5-9104-fa505b84baa9';
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
const IPFS_GATEWAY = 'https://nftstorage.link/ipfs/';

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
  const nameStr  = (meta.name as string) || `Cub #${index}`;
  const num      = parseInt(nameStr.replace(/\D/g, '')) || index + 1;

  return {
    id:     (nft.id as string) || String(index),
    name:   nameStr,
    image,
    number: num,
  };
}

// Fetch cubs owned by a specific wallet
export async function getCubsForWallet(walletAddress: string): Promise<Cub[]> {
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

  // Fallback: search by name
  const res = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 'search', method: 'searchAssets',
      params: { tokenType: 'nonFungible', name: 'Okay Cub', page, limit },
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
      id: `demo-${i + 1}`, name: `Cub #${String(i + 1).padStart(4, '0')}`, image: '', number: i + 1,
    }));
  }

  return files.map((file, i) => {
    const base = path.basename(file, path.extname(file));
    const num  = parseInt(base.replace(/\D/g, '')) || i + 1;
    return { id: base, name: `Cub #${String(num).padStart(4, '0')}`, image: `/cubs/${file}`, number: num };
  }).sort((a, b) => a.number - b.number);
}
