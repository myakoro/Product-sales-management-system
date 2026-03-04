
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 商品詳細取得
export async function GET(
    request: Request,
    { params }: { params: { code: string } }
) {
    try {
        const product = await prisma.product.findUnique({
            where: { productCode: params.code },
            include: { category: true },
        });

        if (!product) {
            return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('Failed to fetch product:', error);
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}

// PUT: 商品更新
export async function PUT(
    request: Request,
    { params }: { params: { code: string } }
) {
    try {
        const oldProductCode = params.code;
        const body = await request.json();
        const {
            productCode: newProductCode, // 新しい商品コード（任意）
            productName,
            salesPriceExclTax,
            costExclTax,
            productType,
            managementStatus,
            categoryId,
            asin // V1.51追加
        } = body;

        // 共通の更新データ
        const updateData: any = {
            productName,
            salesPriceExclTax: salesPriceExclTax !== undefined ? Number(salesPriceExclTax) : undefined,
            costExclTax: costExclTax !== undefined ? Number(costExclTax) : undefined,
            productType,
            managementStatus,
            categoryId: categoryId ? Number(categoryId) : null,
            asin: asin !== undefined ? (asin || null) : undefined,
        };

        // ASIN重複チェック
        if (asin) {
            const existingWithAsin = await (prisma.product as any).findFirst({
                where: {
                    asin: asin,
                    NOT: { productCode: oldProductCode }
                }
            });
            if (existingWithAsin) {
                return NextResponse.json({ error: 'このASINは既に他の商品に登録されています' }, { status: 400 });
            }
        }

        // 商品コードが変更される場合の連動更新
        if (newProductCode && newProductCode !== oldProductCode) {
            // 新規コードの重複チェック
            const duplicate = await prisma.product.findUnique({
                where: { productCode: newProductCode }
            });
            if (duplicate) {
                return NextResponse.json({ error: '変更後の商品コードは既に存在します' }, { status: 400 });
            }

            // トランザクションで一括更新
            const updatedProduct = await prisma.$transaction(async (tx) => {
                // 1. 新しいコードの商品を作成（データは引き継ぐ）
                const newProduct = await tx.product.create({
                    data: {
                        ...updateData,
                        productCode: newProductCode,
                    }
                });

                // 2. 関連データのコードを付け替え
                // 売上実績
                await tx.salesRecord.updateMany({
                    where: { productCode: oldProductCode },
                    data: { productCode: newProductCode }
                });

                // 月別予算
                await tx.monthlyBudget.updateMany({
                    where: { productCode: oldProductCode },
                    data: { productCode: newProductCode }
                });

                // 期間予算
                await tx.periodBudget.updateMany({
                    where: { productCode: oldProductCode },
                    data: { productCode: newProductCode }
                });

                // 期間予算履歴
                await tx.periodBudgetHistory.updateMany({
                    where: { productCode: oldProductCode },
                    data: { productCode: newProductCode }
                });

                // 新商品候補
                await tx.newProductCandidate.updateMany({
                    where: { productCode: oldProductCode },
                    data: { productCode: newProductCode }
                });

                // 3. 旧コードの商品の削除
                await tx.product.delete({
                    where: { productCode: oldProductCode }
                });

                return newProduct;
            });

            return NextResponse.json(updatedProduct);
        } else {
            // 商品コードに変更がない場合は通常更新
            const product = await (prisma.product as any).update({
                where: { productCode: oldProductCode },
                data: updateData,
            });
            return NextResponse.json(product);
        }
    } catch (error) {
        console.error('Failed to update product:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

// DELETE: 商品削除
export async function DELETE(
    request: Request,
    { params }: { params: { code: string } }
) {
    try {
        const productCode = params.code;

        // 1. 売上実績のチェック
        const hasSales = await prisma.salesRecord.findFirst({
            where: { productCode }
        });

        if (hasSales) {
            return NextResponse.json({
                error: '売上実績が存在するため削除できません。今後の分析データ保護のため、マスタの「管理外」への変更をご検討ください。'
            }, { status: 400 });
        }

        // 2. 売上実績がない場合、関連データをトランザクションで一括削除
        await prisma.$transaction(async (tx) => {
            // 期間予算履歴の削除
            await tx.periodBudgetHistory.deleteMany({
                where: { productCode }
            });

            // 期間予算の削除
            await tx.periodBudget.deleteMany({
                where: { productCode }
            });

            // 月別予算の削除
            await tx.monthlyBudget.deleteMany({
                where: { productCode }
            });

            // 新商品候補の削除
            await tx.newProductCandidate.deleteMany({
                where: { productCode }
            });

            // 商品マスタの削除
            await tx.product.delete({
                where: { productCode }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete product:', error);
        return NextResponse.json({ error: '削除処理中にエラーが発生しました' }, { status: 500 });
    }
}
