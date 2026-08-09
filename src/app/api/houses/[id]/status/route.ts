import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const houseId = parseInt(id, 10);

  if (isNaN(houseId)) {
    return NextResponse.json({ error: 'Invalid house ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['new', 'favorite', 'call', 'viewing', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Upsert CRM record
    db.prepare(`
      INSERT INTO house_crm (house_id, status, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(house_id) DO UPDATE SET
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `).run(houseId, status);

    return NextResponse.json({ success: true, house_id: houseId, status });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
