import { NextResponse } from 'next/server';
import { getLocalCubs } from '@/lib/cubs';

export async function GET() {
  const cubs = getLocalCubs();
  return NextResponse.json(cubs);
}
