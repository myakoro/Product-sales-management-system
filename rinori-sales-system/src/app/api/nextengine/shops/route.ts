
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nextEngineClient } from '@/lib/nextengine';

/**
 * GET /api/nextengine/shops
 * ネクストエンジンから最新の店舗一覧を取得する
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'master') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await nextEngineClient.getShops();

        // デバッグ用ログ
        console.log('[NE Shops] Raw response:', JSON.stringify(data, null, 2));

        // NE APIのレスポンス形式に合わせて整形 (data.data に店舗配列が入る想定)
        const shops = data.data.map((shop: any) => ({
            shopId: parseInt(shop.shop_id),
            shopName: shop.shop_name,
        }));

        console.log('[NE Shops] Formatted shops:', shops);

        return NextResponse.json({ shops });
    } catch (error: any) {
        console.error('[NE Shops] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch shops' }, { status: 500 });
    }
}
