'use client';

import { useState } from 'react';
import Link from 'next/link';

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

export default function BudgetVsActualPage() {
    const [startYm, setStartYm] = useState('');
    const [endYm, setEndYm] = useState('');
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<ProductResult[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);

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
        if (rate >= 100) return '#28a745'; // 緑
        if (rate >= 80) return '#ffc107'; // 黄
        return '#dc3545'; // 赤
    };

    const getAchievementBgColor = (rate: number): string => {
        if (rate >= 100) return '#d4edda'; // 薄緑
        if (rate >= 80) return '#fff3cd'; // 薄黄
        return '#f8d7da'; // 薄赤
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
                    ← ダッシュボードに戻る
                </Link>
            </div>

            <h1 style={{ marginBottom: '2rem' }}>予算 vs 実績 (SC-11)</h1>

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
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            開始年月 <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                            type="month"
                            value={startYm}
                            onChange={(e) => setStartYm(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            終了年月 <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                            type="month"
                            value={endYm}
                            onChange={(e) => setEndYm(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
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
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                            全体サマリー
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#666' }}>
                                    数量
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.95rem' }}>
                                    <div style={{ fontWeight: '500' }}>予算:</div>
                                    <div>{summary.totalBudgetQuantity.toLocaleString()}個</div>
                                    <div style={{ fontWeight: '500' }}>実績:</div>
                                    <div>{summary.totalActualQuantity.toLocaleString()}個</div>
                                    <div style={{ fontWeight: '600' }}>達成率:</div>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '1.1rem',
                                        color: getAchievementColor(summary.totalQuantityAchievementRate)
                                    }}>
                                        {summary.totalQuantityAchievementRate.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#666' }}>
                                    売上（税別）
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.95rem' }}>
                                    <div style={{ fontWeight: '500' }}>予算:</div>
                                    <div>¥{Math.round(summary.totalBudgetSales).toLocaleString()}</div>
                                    <div style={{ fontWeight: '500' }}>実績:</div>
                                    <div>¥{Math.round(summary.totalActualSales).toLocaleString()}</div>
                                    <div style={{ fontWeight: '600' }}>達成率:</div>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '1.1rem',
                                        color: getAchievementColor(summary.totalSalesAchievementRate)
                                    }}>
                                        {summary.totalSalesAchievementRate.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#666' }}>
                                    粗利（税別）
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.95rem' }}>
                                    <div style={{ fontWeight: '500' }}>予算:</div>
                                    <div>¥{Math.round(summary.totalBudgetGrossProfit).toLocaleString()}</div>
                                    <div style={{ fontWeight: '500' }}>実績:</div>
                                    <div>¥{Math.round(summary.totalActualGrossProfit).toLocaleString()}</div>
                                    <div style={{ fontWeight: '600' }}>達成率:</div>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '1.1rem',
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
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                            商品別一覧（{products.length}件）
                        </h2>

                        {products.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                                予算が設定されている商品がありません
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>商品コード</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>商品名</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>予算数量</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>実績数量</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>数量達成率</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>予算売上</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>実績売上</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>売上達成率</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>予算粗利</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>実績粗利</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>粗利達成率</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((product) => (
                                            <tr key={product.productCode} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: '500' }}>{product.productCode}</td>
                                                <td style={{ padding: '0.75rem' }}>{product.productName}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{product.budgetQuantity.toLocaleString()}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{product.actualQuantity.toLocaleString()}</td>
                                                <td style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'right',
                                                    fontWeight: '600',
                                                    backgroundColor: getAchievementBgColor(product.quantityAchievementRate),
                                                    color: getAchievementColor(product.quantityAchievementRate)
                                                }}>
                                                    {product.quantityAchievementRate.toFixed(1)}%
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>¥{Math.round(product.budgetSales).toLocaleString()}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>¥{Math.round(product.actualSales).toLocaleString()}</td>
                                                <td style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'right',
                                                    fontWeight: '600',
                                                    backgroundColor: getAchievementBgColor(product.salesAchievementRate),
                                                    color: getAchievementColor(product.salesAchievementRate)
                                                }}>
                                                    {product.salesAchievementRate.toFixed(1)}%
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>¥{Math.round(product.budgetGrossProfit).toLocaleString()}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>¥{Math.round(product.actualGrossProfit).toLocaleString()}</td>
                                                <td style={{
                                                    padding: '0.75rem',
                                                    textAlign: 'right',
                                                    fontWeight: '600',
                                                    backgroundColor: getAchievementBgColor(product.grossProfitAchievementRate),
                                                    color: getAchievementColor(product.grossProfitAchievementRate)
                                                }}>
                                                    {product.grossProfitAchievementRate.toFixed(1)}%
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
