import { NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed';

/**
 * POST /api/seed
 * 
 * Populates the database with rich, verified real estate data across all Ukrainian regions.
 */
export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json({
      success: true,
      message: `Базу успішно заповнено: ${result.sales} будинків на продаж та ${result.rent} в оренду!`,
      sales: result.sales,
      rent: result.rent,
      total: result.total,
    });
  } catch (error) {
    console.error('Seed API error:', error);
    return NextResponse.json({ error: 'Помилка заповнення бази даних' }, { status: 500 });
  }
}
