import { NextRequest, NextResponse } from 'next/server';

// Internal routes (catalog probing, store info, order listing) need ADMIN_KEY: send it as the
// x-admin-key header or ?key= query. With no ADMIN_KEY configured the routes simply do not exist.
export function requireAdmin(req: NextRequest): NextResponse | null {
  const expected = (process.env.ADMIN_KEY || '').trim();   // tolerate a stray space/newline from the dashboard paste
  if (!expected) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const given = (req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('key') || '').trim();
  if (given.length !== expected.length || given !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}
