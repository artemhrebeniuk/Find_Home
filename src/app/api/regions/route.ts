import { NextResponse } from 'next/server';
import { REGIONS } from '@/lib/geo';

/**
 * GET /api/regions
 * 
 * Returns the static list of Ukrainian regions with their geographical bounds.
 * Used to populate the dropdown filters in the UI.
 */
export async function GET() {
  return NextResponse.json({ regions: REGIONS });
}
