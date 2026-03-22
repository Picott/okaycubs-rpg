import { NextRequest, NextResponse } from 'next/server';
import { getCubsForWalletTensor, getCollectionFloorTensor } from '@/lib/tensor';

// GET /api/tensor?wallet=<addr>
// Returns: { isHolder, cubCount, floor (SOL), cubs[] }
// floor is included in every response (no wallet needed) so the RPG can show it too.
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');

  const [floor, cubs] = await Promise.all([
    getCollectionFloorTensor(),
    wallet ? getCubsForWalletTensor(wallet) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    isHolder: cubs !== null && cubs.length > 0,
    cubCount: cubs?.length ?? 0,
    floor,
    cubs:     cubs ?? [],
  });
}
