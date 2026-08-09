import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * PUT /api/houses/[id]/notes
 * 
 * Updates the custom text notes of a specific house.
 * Performs an upsert (INSERT ON CONFLICT DO UPDATE) in the house_crm table.
 * 
 * Request Body:
 * - notes: string (The text notes to save)
 */
export async function PUT(
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
    const { notes } = body;

    if (typeof notes !== 'string') {
      return NextResponse.json({ error: 'Notes must be a string' }, { status: 400 });
    }

    // Upsert CRM record
    db.prepare(`
      INSERT INTO house_crm (house_id, notes, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(house_id) DO UPDATE SET
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `).run(houseId, notes);

    return NextResponse.json({ success: true, house_id: houseId });
  } catch (error) {
    console.error('Error updating notes:', error);
    return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
  }
}
