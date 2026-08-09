import { NextRequest, NextResponse } from 'next/server';
import { syncOLX, syncOLXAllPages } from '@/lib/olx';
import { syncDomRia, isDomRiaConfigured } from '@/lib/domria';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, deal_type, page, mode } = body;

    const dealType = deal_type === 'rent' ? 'rent' : 'sale';

    if (source === 'olx') {
      if (mode === 'full') {
        // Full sync: scrape all available pages
        const result = await syncOLXAllPages(dealType);
        return NextResponse.json({
          success: result.success,
          message: result.message,
          inserted: result.totalInserted,
          total_found: result.totalFound,
          pages_scraped: result.pagesScraped,
        });
      } else {
        // Single page sync
        const pageNum = page ? parseInt(page, 10) : 1;
        const result = await syncOLX(dealType, pageNum);
        if (!result.success) {
          return NextResponse.json({ error: result.message }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: `Синхронізовано ${result.count} будинків з OLX (стор. ${pageNum})`,
          inserted: result.count,
          total_found: result.totalAdsFound,
          has_more: result.hasMore,
        });
      }
    } else if (source === 'domria') {
      if (!isDomRiaConfigured()) {
        return NextResponse.json({
          error: 'DOM.RIA API ключ не налаштований. Додайте DOMRIA_API_KEY до .env.local',
        }, { status: 400 });
      }

      const pageNum = page ? parseInt(page, 10) : 0;
      const result = await syncDomRia(dealType, pageNum);

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Синхронізовано ${result.count} будинків з DOM.RIA`,
        inserted: result.count,
        total_found: result.totalAdsFound,
      });
    } else {
      return NextResponse.json({ error: 'Невірне джерело. Використовуйте olx або domria.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
