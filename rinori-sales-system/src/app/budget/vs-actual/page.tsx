'use client';

import { useState } from 'react';
import Link from 'next/link';
import PeriodNavigator from '@/components/PeriodNavigator';

type ProductResult = {
    productCode: string;
    productName: string;
    budgetQuantity: number;
    actualQuantity: number;
    quantityAchievementRate: number;
    budgetSales: number;
    actualSales: number;
    salesAchievementRate: number;
    budgetCost: number;
    actualCost: number;
    budgetGrossProfit: number;
    actualGrossProfit: number;
    grossProfitAchievementRate: number;
};

type Summary = {
    totalBudgetQuantity: number;
    totalActualQuantity: number;
    totalQuantityAchievementRate: number;
    totalBudgetSales: number;
    totalActualSales: number;
    totalSalesAchievementRate: number;
    totalBudgetCost: number;
    totalActualCost: number;
    totalBudgetGrossProfit: number;
    totalActualGrossProfit: number;
    totalGrossProfitAchievementRate: number;
};

// 商品コードの並び順を制御するための優先度関数
// RINO-FR 系 → RINOBG → RINO-SY → その他 の順に優先
function getProductCodePriority(code: string): number {
    if (code.startsWith('RINO-FR')) return 1;
    if (code.startsWith('RINOBG')) return 2;
    if (code.startsWith('RINO-SY')) return 3;
    return 4;
}

type SortKey = keyof ProductResult;

export default function BudgetVsActualPage() {
    const getDateString = (date: Date) => date.toISOString().slice(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStr = getDateString(lastMonthDate);

    const [startYm, setStartYm] = useState(lastMonthStr);
    const [endYm, setEndYm] = useState(lastMonthStr);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<ProductResult[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('productCode');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [hideZeroRows, setHideZeroRows] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!startYm || !endYm) {
            alert('開始年月と終了年月を入力してください');
            return;
        }

        setLoading(true);
        try {
            // API 側の periodYm（sales_records.period_ym / monthly_budgets.period_ym）は "YYYY-MM" 形式なので
            // ここでも type="month" の値（YYYY-MM）をそのまま渡す
            const res = await fetch(`/api/budget/vs-actual?startYm=${startYm}&endYm=${endYm}`);

            if (res.ok) {
                const data = await res.json();
                setProducts(data.products);
                setSummary(data.summary);
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || 'データ取得に失敗しました'));
            }
        } catch (error) {
            console.error('データ取得エラー:', error);
            alert('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const getAchievementColor = (rate: number): string => {
        if (rate >= 100) return '#28a745';
        if (rate >= 80) return '#ffc107';
        return '#dc3545';
    };

    const getAchievementBgColor = (rate: number): string => {
        if (rate >= 100) return '#d4edda';
        if (rate >= 80) return '#fff3cd';
        return '#f8d7da';
    };

    const getSortIcon = (key: SortKey) => {
        if (sortKey !== key) return '⇅';
        return sortDirection === 'desc' ? '↓' : '↑';
    };

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortKey === key && sortDirection === 'asc') {
            direction = 'desc';
        }
        setSortKey(key);
        setSortDirection(direction);
    };

    const filteredProducts = hideZeroRows
        ? products.filter(p =>
            p.budgetQuantity !== 0 ||
            p.actualQuantity !== 0 ||
            p.budgetSales !== 0 ||
            p.actualSales !== 0
        )
        : products;

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (sortKey === 'productCode') {
            const pa = getProductCodePriority(a.productCode);
            const pb = getProductCodePriority(b.productCode);
            if (pa !== pb) {
                return sortDirection === 'asc' ? pa - pb : pb - pa;
            }
            const comp = a.productCode.localeCompare(b.productCode);
            return sortDirection === 'asc' ? comp : -comp;
        }

        const av = a[sortKey];
        const bv = b[sortKey];

        if (typeof av === 'number' && typeof bv === 'number') {
            return sortDirection === 'asc' ? av - bv : bv - av;
        }

        const sa = String(av);
        const sb = String(bv);
        const comp = sa.localeCompare(sb);
        return sortDirection === 'asc' ? comp : -comp;
    });

    return (
        <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
                    ← ダッシュボードに戻る
                </Link>
            </div>

            <h1 style={{ marginBottom: '2rem' }}>商品予算 vs 商品実績 (SC-11)</h1>

            <form onSubmit={handleSubmit} style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                    期間選択
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                    <div style={{ gridColumn: '1 / 3' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            期間設定 <span style={{ color: 'red' }}>*</span>
                        </label>
                        <PeriodNavigator
                            startYm={startYm}
                            endYm={endYm}
                            onChange={(start, end) => {
                                setStartYm(start);
                                setEndYm(end);
                            }}
                        />
                    </div>


                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.5rem 2rem',
                            backgroundColor: loading ? '#ccc' : '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        {loading ? '読込中...' : '表示'}
                    </button>
                </div>
            </form>

            {summary && (
                <>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginBottom: '2rem'
                    }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                            全体サマリー
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#666' }}>
                                    数量
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '1.25rem' }}>
                                    <div style={{ fontWeight: '500' }}>予算:</div>
                                    <div>{summary.totalBudgetQuantity.toLocaleString()}個</div>
                                    <div style={{ fontWeight: '500' }}>実績:</div>
                                    <div>{summary.totalActualQuantity.toLocaleString()}個</div>
                                    <div style={{ fontWeight: '600' }}>達成率:</div>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '1.4rem',
                                        color: getAchievementColor(summary.totalQuantityAchievementRate)
                                    }}>
                                        {summary.totalQuantityAchievementRate.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#666' }}>
                                    売上（税別）
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '1.25rem' }}>
                                    <div style={{ fontWeight: '500' }}>予算:</div>
                                    <div>¥{Math.round(summary.totalBudgetSales).toLocaleString()}</div>
                                    <div style={{ fontWeight: '500' }}>実績:</div>
                                    <div>¥{Math.round(summary.totalActualSales).toLocaleString()}</div>
                                    <div style={{ fontWeight: '600' }}>達成率:</div>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '1.4rem',
                                        color: getAchievementColor(summary.totalSalesAchievementRate)
                                    }}>
                                        {summary.totalSalesAchievementRate.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#666' }}>
                                    粗利（税別）
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '1.25rem' }}>
                                    <div style={{ fontWeight: '500' }}>予算:</div>
                                    <div>¥{Math.round(summary.totalBudgetGrossProfit).toLocaleString()}</div>
                                    <div style={{ fontWeight: '500' }}>実績:</div>
                                    <div>¥{Math.round(summary.totalActualGrossProfit).toLocaleString()}</div>
                                    <div style={{ fontWeight: '600' }}>達成率:</div>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '1.4rem',
                                        color: getAchievementColor(summary.totalGrossProfitAchievementRate)
                                    }}>
                                        {summary.totalGrossProfitAchievementRate.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                                商品別一覧（{sortedProducts.length}件）
                            </h2>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={hideZeroRows}
                                    onChange={(e) => setHideZeroRows(e.target.checked)}
                                    style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                                />
                                予算・実績がどちらも0の商品を非表示
                            </label>
                        </div>

                        {products.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '1.25rem' }}>
                                予算が設定されている商品がありません
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border-2 border-neutral-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gradient-to-r from-[#00214d] to-[#002855] text-white">
                                        <tr>
                                            <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('productCode')}>
                                                <div className="flex items-center gap-2">
                                                    <span>商品コード</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('productCode')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-left cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('productName')}>
                                                <div className="flex items-center gap-2">
                                                    <span>商品名</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('productName')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('budgetQuantity')}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>予算数量</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('budgetQuantity')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('actualQuantity')}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>実績数量</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('actualQuantity')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('quantityAchievementRate')}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>数量達成率</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('quantityAchievementRate')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('budgetSales')}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>予算売上</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('budgetSales')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('actualSales')}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>実績売上</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('actualSales')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('salesAchievementRate')}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>売上達成率</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('salesAchievementRate')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('budgetGrossProfit')}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>予算粗利</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('budgetGrossProfit')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('actualGrossProfit')}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>実績粗利</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('actualGrossProfit')}</span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('grossProfitAchievementRate')}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>粗利達成率</span>
                                                    <span className="text-[#d4af37]">{getSortIcon('grossProfitAchievementRate')}</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {sortedProducts.map((product) => (
                                            <tr key={product.productCode} className="hover:bg-neutral-50 transition-colors">
                                                <td className="px-4 py-4 font-mono font-semibold text-[#00214d]">{product.productCode}</td>
                                                <td className="px-4 py-4 text-neutral-700">{product.productName}</td>
                                                <td className="px-4 py-4 text-right text-neutral-600">{product.budgetQuantity.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-semibold text-neutral-800">{product.actualQuantity.toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="flex-1 max-w-[80px] h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-500 ${
                                                                    product.quantityAchievementRate >= 100 ? 'bg-green-500' :
                                                                    product.quantityAchievementRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${Math.min(product.quantityAchievementRate, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-bold text-sm ${
                                                            product.quantityAchievementRate >= 100 ? 'text-green-600' :
                                                            product.quantityAchievementRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                                                        }`}>
                                                            {product.quantityAchievementRate.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right text-neutral-600">¥{Math.round(product.budgetSales).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-semibold text-neutral-800">¥{Math.round(product.actualSales).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="flex-1 max-w-[80px] h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-500 ${
                                                                    product.salesAchievementRate >= 100 ? 'bg-green-500' :
                                                                    product.salesAchievementRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${Math.min(product.salesAchievementRate, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-bold text-sm ${
                                                            product.salesAchievementRate >= 100 ? 'text-green-600' :
                                                            product.salesAchievementRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                                                        }`}>
                                                            {product.salesAchievementRate.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right text-neutral-600">¥{Math.round(product.budgetGrossProfit).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-semibold text-neutral-800">¥{Math.round(product.actualGrossProfit).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="flex-1 max-w-[80px] h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-500 ${
                                                                    product.grossProfitAchievementRate >= 100 ? 'bg-green-500' :
                                                                    product.grossProfitAchievementRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${Math.min(product.grossProfitAchievementRate, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-bold text-sm ${
                                                            product.grossProfitAchievementRate >= 100 ? 'text-green-600' :
                                                            product.grossProfitAchievementRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                                                        }`}>
                                                            {product.grossProfitAchievementRate.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
