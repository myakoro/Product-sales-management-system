'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import PeriodNavigator from '@/components/PeriodNavigator';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

    // V1.565: 商品選択状態（最大5件）
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [graphData, setGraphData] = useState<any[]>([]);
    const [isGraphOpen, setIsGraphOpen] = useState(true);
    const [graphLoading, setGraphLoading] = useState(false);
    const [showPrevYear, setShowPrevYear] = useState(true);
    const [graphType, setGraphType] = useState<'line' | 'bar'>('line');
    
    // V1.565: 表示項目選択（初期表示：実績売上、予算売上、達成率）
    const [visibleItems, setVisibleItems] = useState({
        actualSales: true,
        budgetSales: true,
        prevYearSales: false,
        achievementRate: true,
        actualQuantity: false,
        budgetQuantity: false
    });

    const toggleVisibleItem = (item: keyof typeof visibleItems) => {
        setVisibleItems(prev => ({ ...prev, [item]: !prev[item] }));
    };

    const colorPalette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

    const handleProductSelect = (productCode: string) => {
        setSelectedProducts(prev => {
            if (prev.includes(productCode)) {
                return prev.filter(code => code !== productCode);
            } else {
                if (prev.length >= 5) {
                    return prev;
                }
                return [...prev, productCode];
            }
        });
    };

    const handleSelectAll = () => {
        setSelectedProducts([]);
    };

    // グラフデータ取得
    const fetchGraphData = async () => {
        if (selectedProducts.length === 0) {
            setGraphData([]);
            return;
        }

        setGraphLoading(true);
        try {
            const ids = selectedProducts.join(',');
            const url = `/api/charts/budget-vs-actual?startYm=${startYm}&endYm=${endYm}&type=product&ids=${ids}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch graph data');
            const result = await res.json();

            const formattedData = result.map((item: any) => {
                const dataPoint: any = { periodYm: item.periodYm };
                item.data.forEach((product: any) => {
                    dataPoint[`actualSales_${product.id}`] = product.actualSales;
                    dataPoint[`budgetSales_${product.id}`] = product.budgetSales;
                    dataPoint[`prevYearSales_${product.id}`] = product.prevYearSales;
                    dataPoint[`achievementRate_${product.id}`] = product.achievementRate;
                    dataPoint[`actualQuantity_${product.id}`] = product.actualQuantity;
                    dataPoint[`budgetQuantity_${product.id}`] = product.budgetQuantity;
                });
                return dataPoint;
            });

            setGraphData(formattedData);
        } catch (err) {
            console.error('グラフデータの取得に失敗しました:', err);
        } finally {
            setGraphLoading(false);
        }
    };

    useEffect(() => {
        if (selectedProducts.length > 0) {
            fetchGraphData();
        } else {
            setGraphData([]);
        }
    }, [selectedProducts, startYm, endYm]);

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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                                商品別一覧（{sortedProducts.length}件）
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '0.9rem', color: '#666' }}>
                                    比較対象: <strong style={{ color: '#0070f3' }}>{selectedProducts.length}</strong> / 5 件選択中
                                </span>
                                {selectedProducts.length > 0 && (
                                    <button
                                        onClick={handleSelectAll}
                                        style={{
                                            padding: '0.25rem 0.75rem',
                                            fontSize: '0.85rem',
                                            backgroundColor: '#f0f0f0',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        全解除
                                    </button>
                                )}
                            </div>
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
                                            <th className="px-4 py-4 text-center font-bold">
                                                <button
                                                    onClick={handleSelectAll}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        padding: '0.25rem 0.5rem',
                                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        color: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    解除
                                                </button>
                                            </th>
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
                                        {sortedProducts.map((p) => {
                                            const isSelected = selectedProducts.includes(p.productCode);
                                            const isDisabled = !isSelected && selectedProducts.length >= 5;
                                            return (
                                                <tr key={p.productCode} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleProductSelect(p.productCode)}
                                                            disabled={isDisabled}
                                                            className="w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 font-mono font-semibold text-[#00214d]">{p.productCode}</td>
                                                    <td className="px-4 py-4 text-neutral-700">{p.productName}</td>
                                                    <td className="px-4 py-4 text-right text-neutral-600">{p.budgetQuantity.toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-right font-semibold text-neutral-800">{p.actualQuantity.toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="flex-1 max-w-[80px] h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all duration-500 ${
                                                                        p.quantityAchievementRate >= 100 ? 'bg-green-500' :
                                                                        p.quantityAchievementRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min(p.quantityAchievementRate, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className={`font-bold text-sm ${
                                                                p.quantityAchievementRate >= 100 ? 'text-green-600' :
                                                                p.quantityAchievementRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                                                            }`}>
                                                                {p.quantityAchievementRate.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-neutral-600">¥{Math.round(p.budgetSales).toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-right font-semibold text-neutral-800">¥{Math.round(p.actualSales).toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="flex-1 max-w-[80px] h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full transition-all duration-500 ${
                                                                        p.salesAchievementRate >= 100 ? 'bg-green-500' :
                                                                        p.salesAchievementRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min(p.salesAchievementRate, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className={`font-bold text-sm ${
                                                                p.salesAchievementRate >= 100 ? 'text-green-600' :
                                                                p.salesAchievementRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                                                            }`}>
                                                                {p.salesAchievementRate.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-neutral-600">¥{Math.round(p.budgetGrossProfit).toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-right font-semibold text-neutral-800">¥{Math.round(p.actualGrossProfit).toLocaleString()}</td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="flex-1 max-w-[80px] h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full transition-all duration-500 ${
                                                                        p.grossProfitAchievementRate >= 100 ? 'bg-green-500' :
                                                                        p.grossProfitAchievementRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min(p.grossProfitAchievementRate, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className={`font-bold text-sm ${
                                                                p.grossProfitAchievementRate >= 100 ? 'text-green-600' :
                                                                p.grossProfitAchievementRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                                                            }`}>
                                                                {p.grossProfitAchievementRate.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* グラフエリア */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginTop: '2rem'
                    }}>
                        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px' }}>
                            <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                                <span style={{ fontWeight: '600' }}>ℹ️ 注意:</span> 予算実績グラフは全販路の合計データを表示します。販路別の予算設定には対応していません。
                            </p>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div 
                                style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    cursor: 'pointer'
                                }}
                                onClick={() => setIsGraphOpen(!isGraphOpen)}
                            >
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {isGraphOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                    予算実績推移グラフ
                                </h2>
                            </div>
                            {isGraphOpen && selectedProducts.length > 0 && (
                                <div style={{ marginTop: '1rem' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.75rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={showPrevYear}
                                                onChange={(e) => setShowPrevYear(e.target.checked)}
                                                style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>昨年対比を表示</span>
                                        </label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => setGraphType('line')}
                                                style={{
                                                    padding: '0.375rem 1rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    backgroundColor: graphType === 'line' ? '#00214d' : '#f3f4f6',
                                                    color: graphType === 'line' ? 'white' : '#374151'
                                                }}
                                            >
                                                折れ線
                                            </button>
                                            <button
                                                onClick={() => setGraphType('bar')}
                                                style={{
                                                    padding: '0.375rem 1rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    backgroundColor: graphType === 'bar' ? '#00214d' : '#f3f4f6',
                                                    color: graphType === 'bar' ? 'white' : '#374151'
                                                }}
                                            >
                                                棒
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#4b5563' }}>表示項目:</span>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={visibleItems.actualSales}
                                                onChange={() => toggleVisibleItem('actualSales')}
                                                style={{ width: '0.875rem', height: '0.875rem', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#374151' }}>実績売上</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={visibleItems.budgetSales}
                                                onChange={() => toggleVisibleItem('budgetSales')}
                                                style={{ width: '0.875rem', height: '0.875rem', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#374151' }}>予算売上</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={visibleItems.achievementRate}
                                                onChange={() => toggleVisibleItem('achievementRate')}
                                                style={{ width: '0.875rem', height: '0.875rem', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#374151' }}>達成率(%)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={visibleItems.actualQuantity}
                                                onChange={() => toggleVisibleItem('actualQuantity')}
                                                style={{ width: '0.875rem', height: '0.875rem', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#374151' }}>実績数量</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={visibleItems.budgetQuantity}
                                                onChange={() => toggleVisibleItem('budgetQuantity')}
                                                style={{ width: '0.875rem', height: '0.875rem', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#374151' }}>予算数量</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isGraphOpen && (
                            <div>
                                {selectedProducts.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                                        <svg style={{ width: '5rem', height: '5rem', color: '#d1d5db', margin: '0 auto 1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <p style={{ fontSize: '1.125rem', color: '#4b5563', fontWeight: '500', marginBottom: '0.5rem' }}>比較したい商品を選択してください</p>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>上の表から最大5件まで選択できます</p>
                                    </div>
                                ) : graphLoading ? (
                                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                                        <svg style={{ width: '2.5rem', height: '2.5rem', color: '#0070f3', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                                            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p style={{ color: '#6b7280' }}>グラフを読み込み中...</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={400}>
                                        {graphType === 'line' ? (
                                            <LineChart data={graphData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis 
                                                dataKey="periodYm" 
                                                stroke="#6b7280"
                                                style={{ fontSize: '12px' }}
                                            />
                                            <YAxis 
                                                yAxisId="left"
                                                stroke="#6b7280"
                                                style={{ fontSize: '12px' }}
                                                tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
                                            />
                                            <YAxis 
                                                yAxisId="right"
                                                orientation="right"
                                                stroke="#6b7280"
                                                style={{ fontSize: '12px' }}
                                                tickFormatter={(value) => {
                                                    if (visibleItems.actualQuantity || visibleItems.budgetQuantity) {
                                                        return `${Math.round(value)}`;
                                                    }
                                                    return `${value.toFixed(1)}%`;
                                                }}
                                            />
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '8px',
                                                    padding: '12px'
                                                }}
                                                formatter={(value: any, name: string) => {
                                                    if (name.includes('率') || name.includes('数量')) {
                                                        return name.includes('率') ? `${Number(value).toFixed(1)}%` : `${Number(value).toLocaleString()}個`;
                                                    }
                                                    return `¥${Number(value).toLocaleString()}`;
                                                }}
                                            />
                                            <Legend />
                                            
                                            {selectedProducts.map((productCode, index) => {
                                                const product = products.find(p => p.productCode === productCode);
                                                const color = colorPalette[index % colorPalette.length];
                                                const lightColor = color + '80';
                                                
                                                return (
                                                    <React.Fragment key={productCode}>
                                                        {visibleItems.actualSales && (
                                                            <Line 
                                                                yAxisId="left"
                                                                type="monotone" 
                                                                dataKey={`actualSales_${productCode}`}
                                                                stroke={color}
                                                                strokeWidth={2}
                                                                name={`${product?.productName || productCode} - 実績売上`}
                                                                dot={{ fill: color, r: 4 }}
                                                            />
                                                        )}
                                                        {visibleItems.budgetSales && (
                                                            <Line 
                                                                yAxisId="left"
                                                                type="monotone" 
                                                                dataKey={`budgetSales_${productCode}`}
                                                                stroke={lightColor}
                                                                strokeWidth={2}
                                                                strokeDasharray="5 5"
                                                                name={`${product?.productName || productCode} - 予算売上`}
                                                                dot={{ fill: lightColor, r: 3 }}
                                                            />
                                                        )}
                                                        {visibleItems.prevYearSales && showPrevYear && (
                                                            <Line 
                                                                yAxisId="left"
                                                                type="monotone" 
                                                                dataKey={`prevYearSales_${productCode}`}
                                                                stroke={color}
                                                                strokeWidth={2}
                                                                strokeDasharray="3 3"
                                                                name={`${product?.productName || productCode} - 昨年売上`}
                                                                dot={{ fill: color, r: 3 }}
                                                            />
                                                        )}
                                                        {visibleItems.achievementRate && (
                                                            <Line 
                                                                yAxisId="right"
                                                                type="monotone" 
                                                                dataKey={`achievementRate_${productCode}`}
                                                                stroke={color}
                                                                strokeWidth={2}
                                                                name={`${product?.productName || productCode} - 達成率`}
                                                                dot={{ fill: color, r: 4 }}
                                                            />
                                                        )}
                                                        {visibleItems.actualQuantity && (
                                                            <Line 
                                                                yAxisId="right"
                                                                type="monotone" 
                                                                dataKey={`actualQuantity_${productCode}`}
                                                                stroke={color}
                                                                strokeWidth={2}
                                                                strokeDasharray="2 2"
                                                                name={`${product?.productName || productCode} - 実績数量`}
                                                                dot={{ fill: color, r: 3 }}
                                                            />
                                                        )}
                                                        {visibleItems.budgetQuantity && (
                                                            <Line 
                                                                yAxisId="right"
                                                                type="monotone" 
                                                                dataKey={`budgetQuantity_${productCode}`}
                                                                stroke={lightColor}
                                                                strokeWidth={2}
                                                                strokeDasharray="2 2"
                                                                name={`${product?.productName || productCode} - 予算数量`}
                                                                dot={{ fill: lightColor, r: 2 }}
                                                            />
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </LineChart>
                                        ) : (
                                            <BarChart data={graphData} barCategoryGap="20%" barGap={2}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis 
                                                    dataKey="periodYm" 
                                                    stroke="#6b7280"
                                                    style={{ fontSize: '12px' }}
                                                />
                                                <YAxis 
                                                    yAxisId="left"
                                                    stroke="#6b7280"
                                                    style={{ fontSize: '12px' }}
                                                    tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
                                                />
                                                <YAxis 
                                                    yAxisId="right"
                                                    orientation="right"
                                                    stroke="#6b7280"
                                                    style={{ fontSize: '12px' }}
                                                    tickFormatter={(value) => {
                                                        if (visibleItems.actualQuantity || visibleItems.budgetQuantity) {
                                                            return `${Math.round(value)}`;
                                                        }
                                                        return `${value.toFixed(1)}%`;
                                                    }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '8px',
                                                        padding: '12px'
                                                    }}
                                                    formatter={(value: any, name: string) => {
                                                        if (name.includes('率') || name.includes('数量')) {
                                                            return name.includes('率') ? `${Number(value).toFixed(1)}%` : `${Number(value).toLocaleString()}個`;
                                                        }
                                                        return `¥${Number(value).toLocaleString()}`;
                                                    }}
                                                />
                                                <Legend />
                                                
                                                {selectedProducts.map((productCode, index) => {
                                                    const product = products.find(p => p.productCode === productCode);
                                                    const color = colorPalette[index % colorPalette.length];
                                                    const lightColor = color + '80';
                                                    
                                                    return (
                                                        <React.Fragment key={productCode}>
                                                            {visibleItems.actualSales && (
                                                                <Bar 
                                                                    yAxisId="left"
                                                                    dataKey={`actualSales_${productCode}`}
                                                                    fill={color}
                                                                    name={`${product?.productName || productCode} - 実績売上`}
                                                                />
                                                            )}
                                                            {visibleItems.budgetSales && (
                                                                <Bar 
                                                                    yAxisId="left"
                                                                    dataKey={`budgetSales_${productCode}`}
                                                                    fill={lightColor}
                                                                    name={`${product?.productName || productCode} - 予算売上`}
                                                                />
                                                            )}
                                                            {visibleItems.prevYearSales && showPrevYear && (
                                                                <Bar 
                                                                    yAxisId="left"
                                                                    dataKey={`prevYearSales_${productCode}`}
                                                                    fill={color}
                                                                    name={`${product?.productName || productCode} - 昨年売上`}
                                                                />
                                                            )}
                                                            {visibleItems.achievementRate && (
                                                                <Bar 
                                                                    yAxisId="right"
                                                                    dataKey={`achievementRate_${productCode}`}
                                                                    fill={color}
                                                                    name={`${product?.productName || productCode} - 達成率`}
                                                                />
                                                            )}
                                                            {visibleItems.actualQuantity && (
                                                                <Bar 
                                                                    yAxisId="right"
                                                                    dataKey={`actualQuantity_${productCode}`}
                                                                    fill={color}
                                                                    name={`${product?.productName || productCode} - 実績数量`}
                                                                />
                                                            )}
                                                            {visibleItems.budgetQuantity && (
                                                                <Bar 
                                                                    yAxisId="right"
                                                                    dataKey={`budgetQuantity_${productCode}`}
                                                                    fill={lightColor}
                                                                    name={`${product?.productName || productCode} - 予算数量`}
                                                                />
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
