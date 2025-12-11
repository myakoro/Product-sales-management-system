
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// SKU → 親コード変換関数（仕様書 01_システム概要とDB設計.md 4章準拠）
function convertSkuToParentCode(sku: string): string {
    const trimmedSku = sku.trim();

    // Rule 1: RINO- 形式
    // パターン: RINO- で始まり、その後に英数字が続く
    // 例: RINO-FR010-X-BLK → RINO-FR010
    const rule1Match = trimmedSku.match(/^(RINO-[A-Z0-9]+)/);
    if (rule1Match) {
        console.log(`[SKU変換] Rule1適用: ${sku} → ${rule1Match[1]}`);
        return rule1Match[1];
    }

    // Rule 2: RINO 形式（ハイフン無し）
    // パターン: RINO + 英字 + 数字3〜4桁
    // 例: RINODO002BLK → RINODO002
    const rule2Match = trimmedSku.match(/^(RINO[A-Z]+[0-9]{3,4})/);
    if (rule2Match) {
        console.log(`[SKU変換] Rule2適用: ${sku} → ${rule2Match[1]}`);
        return rule2Match[1];
    }

    // Rule 3: その他
    // SKUをそのまま親コードとして使用
    console.log(`[SKU変換] Rule3適用: ${sku} → ${trimmedSku}`);
    return trimmedSku;
}

// CSVのカラム定義（柔軟に対応するための候補リスト）
const COL_MAPPING = {
    productCode: ['商品コード', '商品ｺｰﾄﾞ', 'product_code', 'code', '品番', '商品コード（SKU）'],
    productName: ['商品名', 'product_name', 'name', '品名'],
    date: ['受注日', 'order_date', 'date', '売上日'],
    quantity: ['受注数', 'quantity', 'qty', '数量'],
    amount: ['小計', '商品計', 'amount', 'price', '売上金額', '売上金額（税込）', '金額']
};

export async function POST(request: Request) {
    console.log('[売上CSV取込] 処理開始');
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const targetYm = formData.get('targetYm') as string;
        const importMode = formData.get('importMode') as string;
        const comment = formData.get('comment') as string || '';

        console.log('[売上CSV取込] パラメータ:', { targetYm, importMode, fileName: file?.name });

        if (!file || !targetYm || !importMode) {
            return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let decodedText = new TextDecoder('utf-8').decode(buffer);
        let parsedData: any[] = [];

        const parseResult = Papa.parse(decodedText, { header: true, skipEmptyLines: true });

        const headers = parseResult.meta.fields || [];
        const hasCode = COL_MAPPING.productCode.some(c => headers.includes(c));

        if (!hasCode) {
            decodedText = new TextDecoder('shift-jis').decode(buffer);
            const retryResult = Papa.parse(decodedText, { header: true, skipEmptyLines: true });
            if (retryResult.meta.fields && COL_MAPPING.productCode.some(c => retryResult.meta.fields!.includes(c))) {
                parsedData = retryResult.data;
            } else {
                parsedData = parseResult.data;
            }
        } else {
            parsedData = parseResult.data;
        }

        console.log('[売上CSV取込] CSV解析完了:', parsedData.length, '行');

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: '認証されていません' }, { status: 401 });
        }

        // session.user is typed as { name, email, image } by default
        // But our authOptions adds { id, role }
        const user = session.user as any;
        const userId = parseInt(user.id, 10);

        const findCol = (row: any, candidates: string[]) => {
            for (const c of candidates) {
                if (row[c] !== undefined && row[c] !== null && row[c] !== '') return row[c];
            }
            return null;
        };

        const recordsToCreate: any[] = [];
        // 新商品候補用のデータ構造（仕様書準拠）
        const newProductCandidates: Map<string, { sku: string, name: string | null }> = new Map();

        console.log('[売上CSV取込] 商品マスタ取得中');
        const allProducts = await prisma.product.findMany();
        const productMap = new Map(allProducts.map(p => [p.productCode, p]));
        console.log('[売上CSV取込] 商品マスタ件数:', allProducts.length);

        for (const row of parsedData) {
            const originalSku = findCol(row, COL_MAPPING.productCode);
            if (!originalSku) continue;

            // SKU → 親コード変換
            const parentCode = convertSkuToParentCode(originalSku);
            const productName = findCol(row, COL_MAPPING.productName);

            const product = productMap.get(parentCode);
            if (!product) {
                // 新商品候補として記録（重複排除）
                if (!newProductCandidates.has(parentCode)) {
                    newProductCandidates.set(parentCode, {
                        sku: originalSku,
                        name: productName
                    });
                }
                continue;
            }

            // 管理ステータスチェック
            if (product.managementStatus === '管理外') {
                console.log('[売上CSV取込] 管理外商品をスキップ:', parentCode);
                continue;
            }

            const rawDate = findCol(row, COL_MAPPING.date);
            const dateObj = rawDate ? new Date(rawDate) : new Date();

            const qty = parseInt(findCol(row, COL_MAPPING.quantity) || '0', 10);
            const amt = parseFloat(findCol(row, COL_MAPPING.amount) || '0');

            if (qty === 0 && amt === 0) continue;

            const cost = product.costExclTax * qty;
            const gross = amt - cost;

            recordsToCreate.push({
                productCode: parentCode,
                periodYm: targetYm,
                salesDate: dateObj,
                quantity: qty,
                salesAmountExclTax: amt,
                costAmountExclTax: cost,
                grossProfit: gross,
                createdByUserId: userId
            });
        }

        console.log('[売上CSV取込] データ準備完了:', {
            validRecords: recordsToCreate.length,
            newCandidates: newProductCandidates.size
        });

        console.log('[売上CSV取込] トランザクション開始');
        await prisma.$transaction(async (tx) => {
            // 新商品候補を登録（仕様書準拠: product_code, sample_sku, product_name）
            if (newProductCandidates.size > 0) {
                console.log('[売上CSV取込] 新商品候補チェック中');
                const candidateCodes = Array.from(newProductCandidates.keys());
                const existingCandidates = await tx.newProductCandidate.findMany({
                    where: { productCode: { in: candidateCodes } },
                    select: { productCode: true }
                });
                const existingSet = new Set(existingCandidates.map(c => c.productCode));

                for (const [parentCode, data] of newProductCandidates.entries()) {
                    if (!existingSet.has(parentCode)) {
                        console.log('[売上CSV取込] 新商品候補登録:', {
                            parentCode,
                            sku: data.sku,
                            name: data.name
                        });
                        await tx.newProductCandidate.create({
                            data: {
                                productCode: parentCode,
                                sampleSku: data.sku,
                                productName: data.name,
                                status: 'pending'
                            }
                        });
                    }
                }
            }

            console.log('[売上CSV取込] 履歴作成中');
            const history = await tx.importHistory.create({
                data: {
                    importType: 'sales',
                    targetYm: targetYm,
                    importMode: importMode,
                    comment: comment,
                    recordCount: recordsToCreate.length,
                    importedByUserId: parseInt(user.id)
                }
            });

            if (importMode === 'overwrite') {
                console.log('[売上CSV取込] 既存データ削除中:', targetYm);
                await tx.salesRecord.deleteMany({
                    where: { periodYm: targetYm }
                });
            }

            console.log('[売上CSV取込] 売上レコード登録中:', recordsToCreate.length);
            for (const record of recordsToCreate) {
                await tx.salesRecord.create({
                    data: {
                        ...record,
                        importHistoryId: history.id
                    }
                });
            }
        });

        console.log('[売上CSV取込] トランザクション完了');

        const skippedCodes = Array.from(newProductCandidates.keys());

        if (recordsToCreate.length === 0 && skippedCodes.length > 0) {
            return NextResponse.json({
                success: true,
                count: 0,
                skippedCodes,
                message: `マスタ未登録の商品が${skippedCodes.length}件検出されました。「新商品候補一覧」から登録を行ってください。`
            });
        }

        return NextResponse.json({
            success: true,
            count: recordsToCreate.length,
            skippedCodes
        });

    } catch (error: any) {
        console.error('[売上CSV取込] エラー発生:', error);
        console.error('[売上CSV取込] エラースタック:', error.stack);
        return NextResponse.json({
            error: 'ファイル取込中にエラーが発生しました: ' + (error.message || error)
        }, { status: 500 });
    }
}
