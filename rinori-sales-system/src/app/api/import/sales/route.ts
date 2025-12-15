
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { convertSkuToParentCode } from '@/lib/csv-parser';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number((session.user as any).id);

    try {
        const body = await request.json();
        const { targetYm, mode, rows, comment, salesChannelId } = body;

        // Validation
        if (!targetYm || !mode || !rows || !Array.isArray(rows) || !salesChannelId) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }

        // Get Tax Rate
        // Logic: SELECT rate FROM tax_rates WHERE start_ym <= targetYm ORDER BY start_ym DESC LIMIT 1
        const taxRateRecord = await prisma.taxRate.findFirst({
            where: { startYm: { lte: targetYm } },
            orderBy: { startYm: 'desc' },
        });

        if (!taxRateRecord) {
            // Fallback or Error? Spec says "Error (税率未設定)".
            // Default to 10% if no data? No, strict compliance.
            return NextResponse.json({ error: `税率が設定されていません (対象年月: ${targetYm})` }, { status: 400 });
        }
        const taxRate = taxRateRecord.rate; // e.g. 0.10

        // Start Transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create Import History
            const importHistory = await tx.importHistory.create({
                data: {
                    importType: 'sales',
                    targetYm,
                    importMode: mode,
                    comment,
                    recordCount: rows.length,
                    importedByUserId: userId,
                    importedAt: new Date(),
                    salesChannelId: Number(salesChannelId), // V1.4
                }
            });

            // 2. Handle Overwrite Mode
            if (mode === 'overwrite') {
                await tx.salesRecord.deleteMany({
                    where: {
                        periodYm: targetYm,
                        salesChannelId: Number(salesChannelId) // V1.4: Only delete same channel
                    }
                });
            }

            let insertedCount = 0;
            let newCandidatesCount = 0;

            // 3. Process Rows
            // Pre-fetch all products to minimize DB calls?
            // With 1000 rows, fetching all products (assuming < 10000 products) is efficient.
            const allProducts = await tx.product.findMany();
            const productMap = new Map<string, typeof allProducts[0]>();
            allProducts.forEach((p: { productCode: string }) => productMap.set(p.productCode, p as any));

            for (const row of rows) {
                const { productCode: sku, quantity, salesAmount税込, productName } = row;

                // SKU -> Parent Code
                const parentCode = convertSkuToParentCode(sku);

                const product = productMap.get(parentCode);

                // Check Product Existence
                if (!product) {
                    // Add to New Product Candidates
                    await tx.newProductCandidate.upsert({
                        where: {
                            productCode_sampleSku: {
                                productCode: parentCode,
                                sampleSku: sku
                            }
                        },
                        update: {
                            productName: productName,
                            // status remains as is (e.g. pending)
                        },
                        create: {
                            productCode: parentCode,
                            sampleSku: sku,
                            productName: productName,
                            status: 'pending',
                        }
                    });
                    newCandidatesCount++;
                    continue; // Skip sales recording
                }

                // Check Management Status
                if (product.managementStatus === 'unmanaged') {
                    continue; // Skip
                }

                // Calc Logic
                // 税別金額 = 税込金額 ÷ (1 + 税率) -> Round HALF_UP (Math.round)
                const salesAmountExclTax = Math.round(salesAmount税込 / (1 + taxRate));

                // 原価 = マスタ原価 * 数量
                const costExclTax = Math.round((product.costExclTax || 0) * quantity);

                // 粗利
                const grossProfit = salesAmountExclTax - costExclTax;

                await tx.salesRecord.create({
                    data: {
                        productCode: parentCode,
                        periodYm: targetYm,
                        salesDate: new Date(targetYm + "-01"), // Default to 1st of month
                        quantity,
                        salesAmountExclTax,
                        costAmountExclTax: costExclTax,
                        grossProfit,
                        importHistoryId: importHistory.id,
                        createdByUserId: userId,
                        salesChannelId: Number(salesChannelId), // V1.4
                    }
                });
                insertedCount++;
            }

            // Update record count in history if needed to match ACTUAL inserted?
            // Spec 1.7 says "record_count" is "取込件数". Usually input count or success count.
            // Let's update it to inserted count so it matches "Sales Records Created".
            // But if we want to know how many rows were in CSV, we use input count.
            // Let's update to insertedCount.
            await tx.importHistory.update({
                where: { id: importHistory.id },
                data: { recordCount: insertedCount }
            });

            return { insertedCount, newCandidatesCount };
        }, {
            maxWait: 10000,
            timeout: 20000
        });

        return NextResponse.json({ success: true, ...result });

    } catch (error) {
        console.error('Import Error:', error);
        return NextResponse.json({ error: 'Import failed: ' + (error as Error).message }, { status: 500 });
    }
}
