import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        console.log('[商品CSV登録・更新] 処理開始');

        const body = await request.json();
        const { comment, newProducts, updateProducts } = body;

        if (!newProducts && !updateProducts) {
            return NextResponse.json(
                { error: '登録・更新する商品が選択されていません' },
                { status: 400 }
            );
        }

        const newCount = newProducts?.length || 0;
        const updateCount = updateProducts?.length || 0;

        console.log(`[商品CSV登録・更新] 新規: ${newCount}件, 更新: ${updateCount}件`);

        // トランザクション開始
        await prisma.$transaction(async (tx) => {
            // 新規商品を登録
            if (newProducts && newProducts.length > 0) {
                for (const product of newProducts) {
                    await tx.product.create({
                        data: {
                            productCode: product.productCode,
                            productName: product.productName,
                            salesPriceExclTax: product.salesPriceExclTax,
                            costExclTax: product.costExclTax,
                            productType: 'own', // デフォルト: 自社
                            managementStatus: 'managed' // デフォルト: 管理中
                        }
                    });
                }
                console.log(`[商品CSV登録・更新] 新規登録完了: ${newProducts.length}件`);
            }

            // 既存商品を更新
            if (updateProducts && updateProducts.length > 0) {
                for (const product of updateProducts) {
                    await tx.product.update({
                        where: { productCode: product.productCode },
                        data: {
                            productName: product.newProductName,
                            salesPriceExclTax: product.newSalesPriceExclTax,
                            costExclTax: product.newCostExclTax
                        }
                    });
                }
                console.log(`[商品CSV登録・更新] 更新完了: ${updateProducts.length}件`);
            }

            // 取込履歴を登録
            // デフォルトユーザーを取得または作成
            let user = await tx.user.findFirst();
            if (!user) {
                user = await tx.user.create({
                    data: {
                        username: 'admin',
                        passwordHash: 'dummy', // ダミーパスワード
                        role: 'master'
                    }
                });
            }

            await tx.importHistory.create({
                data: {
                    importType: 'products',
                    targetYm: null,
                    importMode: null,
                    comment: comment || null,
                    recordCount: newCount + updateCount,
                    importedByUserId: user.id,
                    importedAt: new Date()
                }
            });

            console.log('[商品CSV登録・更新] 取込履歴登録完了');
        });

        console.log('[商品CSV登録・更新] トランザクション完了');

        return NextResponse.json({
            success: true,
            newCount,
            updateCount
        });

    } catch (error: any) {
        console.error('[商品CSV登録・更新] エラー発生:', error);
        return NextResponse.json(
            { error: '登録・更新に失敗しました: ' + error.message },
            { status: 500 }
        );
    }
}
