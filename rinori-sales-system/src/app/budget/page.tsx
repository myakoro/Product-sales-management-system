"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PeriodNavigator from "@/components/PeriodNavigator";

// 月のリストを生成（開始月から終了月まで）
function generateMonths(startYm: string, endYm: string) {
    const months = [];
    const start = new Date(startYm + "-01");
    const end = new Date(endYm + "-01");

    let current = new Date(start);
    while (current <= end) {
        const ym = current.toISOString().slice(0, 7);
        months.push(ym);
        current.setMonth(current.getMonth() + 1);
    }

    return months;
}

// 商品コードの並び順を制御するための優先度関数
// RINO-FR 系 → RINOBG → RINO-SY → その他 の順に優先
function getProductCodePriority(code: string): number {
    if (code.startsWith('RINO-FR')) return 1;
    if (code.startsWith('RINOBG')) return 2;
    if (code.startsWith('RINO-SY')) return 3;
    return 4;
}

type SortKey = 'productCode' | 'productName' | 'categoryName' | 'periodTotal' | 'periodSales' | 'periodProfit';

export default function BudgetPage() {
    const [startYm, setStartYm] = useState("2025-01");
    const [endYm, setEndYm] = useState("2025-03");
    const [searchTerm, setSearchTerm] = useState("");
    const [months, setMonths] = useState<string[]>([]);
    const [budgetData, setBudgetData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('productCode');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // History Modal State
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<{ code: string, name: string } | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // データ取得
    const fetchBudgetData = async () => {
        if (!startYm || !endYm) return;

        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/budget?startYm=${startYm}&endYm=${endYm}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();

            const monthList = generateMonths(startYm, endYm);
            setMonths(monthList);

            // データの整形（不足している月のデータを0で埋める）
            const formattedData = data.map((item: any) => {
                const monthlyQty = { ...item.monthlyQty };
                monthList.forEach(m => {
                    if (monthlyQty[m] === undefined) {
                        monthlyQty[m] = 0;
                    }
                });
                return {
                    ...item,
                    monthlyQty
                };
            });

            setBudgetData(formattedData);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'データの取得に失敗しました。' });
        } finally {
            setLoading(false);
        }
    };

    // 期間が変更されたらデータを再取得
    useEffect(() => {
        fetchBudgetData();
    }, [startYm, endYm]);

    // 期間合計から月別に配分（productCode ベースで更新）
    const handlePeriodTotalChange = (productCode: string, value: number) => {
        const newData = [...budgetData];
        const productIndex = newData.findIndex(p => p.productCode === productCode);
        if (productIndex === -1) return;

        const product = newData[productIndex];

        product.periodTotal = value;

        // 月別に等分配分（端数は最終月）
        const monthCount = months.length;
        if (monthCount > 0) {
            const baseQty = Math.floor(value / monthCount);
            const remainder = value % monthCount;

            months.forEach((month, idx) => {
                if (idx === months.length - 1) {
                    product.monthlyQty[month] = baseQty + remainder;
                } else {
                    product.monthlyQty[month] = baseQty;
                }
            });

            // 売上・粗利を計算
            product.periodSales = value * product.salesPrice;
            product.periodProfit = value * (product.salesPrice - product.cost);

            setBudgetData(newData);
        }
    };

    // 月別数量から期間合計を再計算（productCode ベースで更新）
    const handleMonthlyQtyChange = (productCode: string, month: string, value: number) => {
        const newData = [...budgetData];
        const productIndex = newData.findIndex(p => p.productCode === productCode);
        if (productIndex === -1) return;

        const product = newData[productIndex];

        product.monthlyQty[month] = value;

        // 期間合計を再計算
        const total = Object.values(product.monthlyQty).reduce((sum: number, qty: any) => sum + (qty || 0), 0);
        product.periodTotal = total;

        // 売上・粗利を計算
        product.periodSales = total * product.salesPrice;
        product.periodProfit = total * (product.salesPrice - product.cost);

        setBudgetData(newData);
    };

    const handleOpenHistory = async (product: any) => {
        setSelectedProduct({ code: product.productCode, name: product.productName });
        setShowHistory(true);
        setLoadingHistory(true);
        setHistoryData([]);

        try {
            const res = await fetch(`/api/budget/history?productCode=${product.productCode}&startYm=${startYm}&endYm=${endYm}`);
            if (res.ok) {
                const data = await res.json();
                setHistoryData(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingHistory(false);
        }
    };

    // 保存処理
    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        setMessage(null);

        try {
            const payload = {
                startYm,
                endYm,
                budgets: budgetData.map(p => ({
                    productCode: p.productCode,
                    periodTotal: p.periodTotal,
                    monthlyQty: p.monthlyQty
                }))
            };

            const res = await fetch('/api/budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Save failed');

            setMessage({ type: 'success', text: '保存しました。' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: '保存に失敗しました。' });
        } finally {
            setSaving(false);
        }
    };

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortKey === key && sortDirection === 'asc') {
            direction = 'desc';
        }
        setSortKey(key);
        setSortDirection(direction);
    };

    // フィルタリング
    const filteredData = budgetData.filter(p =>
        p.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.categoryName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedData = [...filteredData].sort((a, b) => {
        if (sortKey === 'productCode') {
            const pa = getProductCodePriority(a.productCode as string);
            const pb = getProductCodePriority(b.productCode as string);
            if (pa !== pb) {
                return sortDirection === 'asc' ? pa - pb : pb - pa;
            }
            const comp = (a.productCode as string).localeCompare(b.productCode as string);
            return sortDirection === 'asc' ? comp : -comp;
        }

        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        if (typeof av === 'number' && typeof bv === 'number') {
            return sortDirection === 'asc' ? av - bv : bv - av;
        }
        const sa = String(av);
        const sb = String(bv);
        const comp = sa.localeCompare(sb);
        return sortDirection === 'asc' ? comp : -comp;
    });

    // サマリ計算
    const summary = filteredData.reduce((acc, p) => ({
        totalSales: acc.totalSales + p.periodSales,
        totalProfit: acc.totalProfit + p.periodProfit,
    }), { totalSales: 0, totalProfit: 0 });

    const profitRate = summary.totalSales > 0
        ? (summary.totalProfit / summary.totalSales * 100).toFixed(1)
        : "0.0";

    return (
        <div className="min-h-screen">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <h1 className="text-lg font-semibold">Rinori 売上管理システム</h1>
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-xl text-gray-600 hover:text-primary">
                        ダッシュボード
                    </Link>
                    <span className="text-xl text-gray-600">ユーザー: 管理者</span>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 py-8">
                <h2 className="text-2xl font-semibold mb-6">商品予算設定</h2>

                {message && (
                    <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                {/* 期間設定・検索エリア */}
                <div className="bg-white border border-gray-200 rounded p-4 mb-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-2">期間設定</label>
                            <PeriodNavigator
                                startYm={startYm}
                                endYm={endYm}
                                onChange={(start, end) => {
                                    setStartYm(start);
                                    setEndYm(end);
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">商品検索</label>
                            <input
                                type="text"
                                placeholder="商品コード・商品名"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>
                    </div>
                </div>

                {/* サマリ（スクロール時も上部に固定） */}
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4 sticky top-0 z-20">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-sm text-gray-600">合計売上（税別）</div>
                            <div className="text-lg font-semibold">¥{Math.round(summary.totalSales).toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">合計粗利</div>
                            <div className="text-lg font-semibold">¥{Math.round(summary.totalProfit).toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">粗利率</div>
                            <div className="text-lg font-semibold">{profitRate}%</div>
                        </div>
                    </div>
                </div>

                {/* Excel型テーブル */}
                <div className="bg-white border border-gray-200 rounded overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">読み込み中...</div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        className="px-4 py-3 text-left text-sm font-semibold border-r sticky left-0 bg-gray-50 z-10 cursor-pointer"
                                        onClick={() => handleSort('productCode')}
                                    >
                                        商品コード
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-sm font-semibold border-r sticky left-[120px] bg-gray-50 z-10 cursor-pointer min-w-[300px]"
                                        onClick={() => handleSort('productName')}
                                    >
                                        商品名
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-sm font-semibold border-r sticky left-[420px] bg-gray-50 z-10 cursor-pointer min-w-[150px]"
                                        onClick={() => handleSort('categoryName')}
                                    >
                                        カテゴリー
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right text-sm font-semibold border-r cursor-pointer"
                                        onClick={() => handleSort('periodTotal')}
                                    >
                                        期間合計数量
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right text-sm font-semibold border-r cursor-pointer"
                                        onClick={() => handleSort('periodSales')}
                                    >
                                        期間売上
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right text-sm font-semibold border-r cursor-pointer"
                                        onClick={() => handleSort('periodProfit')}
                                    >
                                        期間粗利
                                    </th>
                                    {months.map(month => (
                                        <th key={month} className="px-4 py-3 text-center text-sm font-semibold border-r">
                                            {month.slice(5)}月
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedData.map((product) => (
                                    <tr key={product.productCode} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm border-r sticky left-0 bg-white z-10">{product.productCode}</td>
                                        <td className="px-4 py-3 text-sm border-r sticky left-[120px] bg-white z-10 min-w-[300px]">{product.productName}</td>
                                        <td className="px-4 py-3 text-sm border-r sticky left-[420px] bg-white z-10 min-w-[150px]">{product.categoryName}</td>
                                        <td className="px-4 py-3 text-right border-r">
                                            <input
                                                type="number"
                                                value={product.periodTotal || 0}
                                                onChange={(e) => handlePeriodTotalChange(product.productCode, Number(e.target.value) || 0)}
                                                className="w-20 px-2 py-1 text-right border border-gray-300 rounded"
                                            />
                                            <button
                                                onClick={() => handleOpenHistory(product)}
                                                className="ml-2 text-gray-400 hover:text-blue-600"
                                                title="変更履歴"
                                            >
                                                🕒
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm border-r bg-gray-50">
                                            ¥{Math.round(product.periodSales).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm border-r bg-gray-50">
                                            ¥{Math.round(product.periodProfit).toLocaleString()}
                                        </td>
                                        {months.map(month => (
                                            <td key={month} className="px-4 py-3 text-center border-r">
                                                <input
                                                    type="number"
                                                    value={product.monthlyQty[month] || 0}
                                                    onChange={(e) => handleMonthlyQtyChange(product.productCode, month, Number(e.target.value) || 0)}
                                                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex gap-4 mt-6">
                    <button
                        onClick={handleSave}
                        disabled={loading || saving}
                        className="px-6 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? '保存中...' : '保存'}
                    </button>
                    <Link href="/" className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50">
                        キャンセル
                    </Link>
                </div>
            </main>

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">
                                変更履歴: {selectedProduct?.name} ({selectedProduct?.code})
                            </h3>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        {loadingHistory ? (
                            <div className="text-center py-4">読み込み中...</div>
                        ) : historyData.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">履歴はありません</div>
                        ) : (
                            <table className="w-full text-xl">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">保存日時</th>
                                        <th className="px-4 py-2 text-right">期間合計数量</th>
                                        <th className="px-4 py-2 text-left">内訳 (抜粋)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {historyData.map((h: any) => {
                                        const breakdown = JSON.parse(h.monthlyBreakdown);
                                        const breakdownStr = Object.entries(breakdown)
                                            .map(([ym, qty]) => `${ym.slice(5)}月:${qty}`)
                                            .join(', ');

                                        return (
                                            <tr key={h.id}>
                                                <td className="px-4 py-2">
                                                    {new Date(h.savedAt).toLocaleString('ja-JP')}
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium">
                                                    {h.totalQuantity}
                                                </td>
                                                <td className="px-4 py-2 text-gray-600 truncate max-w-xs" title={breakdownStr}>
                                                    {breakdownStr}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        <div className="mt-6 text-right">
                            <button
                                onClick={() => setShowHistory(false)}
                                className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

