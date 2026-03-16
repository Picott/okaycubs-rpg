import { NextRequest, NextResponse } from 'next/server';
import { getCubsForWallet, getAllOkayCubs } from '@/lib/cubs';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  try {
    const cubs = wallet
      ? await getCubsForWallet(wallet)
      : await getAllOkayCubs();
    return NextResponse.json(cubs);
  } catch {
    return NextResponse.json([]);
  }
}
