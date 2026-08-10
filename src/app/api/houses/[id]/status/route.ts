import { NextRequest, NextResponse } from 'next/server';
import db, { setupDb } from '@/lib/db';

/**
 * PATCH /api/houses/[id]/status
 * 
 * Updates the CRM status of a specific house.
 * Performs an upsert (INSERT ON CONFLICT DO UPDATE) in the house_crm table.
 * 
 * Request Body:
 * - status: 'new' | 'favorite' | 'call' | 'viewing' | 'archived'
 */
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
    // Upsert CRM record
    await setupDb();
    await db.execute({
      sql: `
      INSERT INTO house_crm (house_id, status, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(house_id) DO UPDATE SET
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `,
      args: [houseId, status]
    });

    return NextResponse.json({ success: true, house_id: houseId, status });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
