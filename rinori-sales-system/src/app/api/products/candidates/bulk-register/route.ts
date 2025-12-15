import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            candidateIds,
            defaultSalesPriceExclTax,
            defaultCostExclTax,
            productType,
            managementStatus
        } = body;

        // Validation
        if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
            return NextResponse.json({ error: '候補が選択されていません' }, { status: 400 });
        }

        if (defaultSalesPriceExclTax === undefined || defaultCostExclTax === undefined) {
            return NextResponse.json({ error: '販売価格と原価を入力してください' }, { status: 400 });
        }

        console.log(`[一括登録] 処理開始: ${candidateIds.length}件`);

        // Fetch candidates
        const candidates = await prisma.newProductCandidate.findMany({
            where: {
                id: { in: candidateIds },
                status: 'pending' // Only process pending candidates
            }
        });

        if (candidates.length === 0) {
            return NextResponse.json({ error: '有効な候補が見つかりません' }, { status: 400 });
        }

        // Transaction
        const result = await prisma.$transaction(async (tx) => {
            let registeredCount = 0;

            for (const candidate of candidates) {
                // Upsert product
                await tx.product.upsert({
                    where: { productCode: candidate.productCode },
                    update: {
                        productName: candidate.productName || `商品 ${candidate.productCode}`,
                        salesPriceExclTax: defaultSalesPriceExclTax,
                        costExclTax: defaultCostExclTax,
                        productType: productType || 'own',
                        managementStatus: managementStatus || 'managed'
                    },
                    create: {
                        productCode: candidate.productCode,
                        productName: candidate.productName || `商品 ${candidate.productCode}`,
                        salesPriceExclTax: defaultSalesPriceExclTax,
                        costExclTax: defaultCostExclTax,
                        productType: productType || 'own',
                        managementStatus: managementStatus || 'managed'
                    }
                });

                // Update candidate status
                await tx.newProductCandidate.update({
                    where: { id: candidate.id },
                    data: { status: 'registered' }
                });

                registeredCount++;
            }

            console.log(`[一括登録] 登録完了: ${registeredCount}件`);
            return registeredCount;
        });

        return NextResponse.json({
            success: true,
            registeredCount: result
        });

    } catch (error: any) {
        console.error('[一括登録] エラー:', error);
        return NextResponse.json(
            { error: '一括登録に失敗しました: ' + error.message },
            { status: 500 }
        );
    }
}
