import { NextResponse } from 'next/server';
import { REGIONS } from '@/lib/geo';

export async function GET() {
  return NextResponse.json({ regions: REGIONS });
}
