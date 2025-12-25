"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PeriodNavigator from "@/components/PeriodNavigator";

// 商品コードの並び順を制御するための優先度関数
function getProductCodePriority(code: string): number {
    if (code.startsWith('RINO-FR')) return 1;
    if (code.startsWith('RINOBG')) return 2;
    if (code.startsWith('RINO-SY')) return 3;
    return 4;
}

export default function ProductPLPage() {
    const getDateString = (date: Date) => date.toISOString().slice(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStr = getDateString(lastMonthDate);

    const [startYm, setStartYm] = useState(lastMonthStr);
    const [endYm, setEndYm] = useState(lastMonthStr);
    const [typeFilter, setTypeFilter] = useState("all");
    const [plData, setPlData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortKey, setSortKey] = useState("productCode"); // Default sort key changed
    const [sortDesc, setSortDesc] = useState(false); // Default asc for product code
    const [channels, setChannels] = useState<{ id: number, name: string }[]>([]);
    const [salesChannelId, setSalesChannelId] = useState("all");

    useEffect(() => {
        fetch('/api/settings/sales-channels')
            .then(res => res.json())
            .then(data => {
                const active = data.filter((c: any) => c.isActive);
                setChannels(active);
            })
            .catch(err => console.error(err));
    }, []);

    const fetchData = async () => {
        if (!startYm || !endYm) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/pl/products?startYm=${startYm}&endYm=${endYm}&type=${typeFilter}&salesChannelId=${salesChannelId}`);
            if (res.ok) {
                const data = await res.json();
                setPlData(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startYm, endYm, typeFilter, salesChannelId]);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDesc(!sortDesc);
        } else {
            setSortKey(key);
            setSortDesc(true);
        }
    };

    const sortedData = [...plData].sort((a, b) => {
        if (sortKey === 'productCode') {
            const pa = getProductCodePriority(a.productCode);
            const pb = getProductCodePriority(b.productCode);
            if (pa !== pb) {
                return sortDesc ? pb - pa : pa - pb;
            }
            return sortDesc ? b.productCode.localeCompare(a.productCode) : a.productCode.localeCompare(b.productCode);
        }

        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'string') {
            return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return sortDesc ? valB - valA : valA - valB;
    });

    const formatCurrency = (val: number) => `¥${Math.round(val).toLocaleString()}`;
    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    const getSortIcon = (key: string) => {
        if (sortKey !== key) return '⇅';
        return sortDesc ? '↓' : '↑';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
            <header className="bg-gradient-to-r from-[#00214d] to-[#002855] border-b-2 border-[#d4af37] px-6 py-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">商品別PL分析</h1>
                    <Link href="/" className="px-4 py-2 text-white hover:text-[#d4af37] transition-colors duration-200 font-medium">
                        ダッシュボードへ戻る
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-neutral-200 mb-8 flex flex-wrap gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">表示期間</label>
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
                        <label className="block text-sm font-medium mb-1">商品区分</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded"
                        >
                            <option value="all">すべて</option>
                            <option value="own">自社</option>
                            <option value="purchase">仕入</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">販路</label>
                        <select
                            value={salesChannelId}
                            onChange={(e) => setSalesChannelId(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded"
                        >
                            <option value="all">全販路</option>
                            {channels.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchData}
                        className="mb-0.5 px-6 py-2.5 bg-[#00214d] text-white rounded-lg hover:bg-[#d4af37] hover:text-[#00214d] transition-all duration-200 font-medium shadow-md"
                    >
                        更新
                    </button>

                    <div className="ml-auto mb-0.5">
                        <Link href="/pl/monthly" className="text-sm text-[#00214d] hover:text-[#d4af37] font-medium transition-colors">
                            → 月次・期間PLへ
                        </Link>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border-2 border-neutral-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <svg className="animate-spin h-8 w-8 text-[#00214d] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-neutral-500">読み込み中...</p>
                        </div>
                    ) : sortedData.length === 0 ? (
                        <div className="p-12 text-center">
                            <svg className="w-16 h-16 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-neutral-400">データがありません</p>
                        </div>
                    ) : (
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
                                    <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('sales')}>
                                        <div className="flex items-center justify-end gap-2">
                                            <span>売上高</span>
                                            <span className="text-[#d4af37]">{getSortIcon('sales')}</span>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('cost')}>
                                        <div className="flex items-center justify-end gap-2">
                                            <span>原価</span>
                                            <span className="text-[#d4af37]">{getSortIcon('cost')}</span>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('grossProfit')}>
                                        <div className="flex items-center justify-end gap-2">
                                            <span>粗利</span>
                                            <span className="text-[#d4af37]">{getSortIcon('grossProfit')}</span>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('costRate')}>
                                        <div className="flex items-center justify-end gap-2">
                                            <span>原価率</span>
                                            <span className="text-[#d4af37]">{getSortIcon('costRate')}</span>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-right cursor-pointer hover:bg-white/10 transition-colors font-bold" onClick={() => handleSort('grossProfitRate')}>
                                        <div className="flex items-center justify-end gap-2">
                                            <span>粗利率</span>
                                            <span className="text-[#d4af37]">{getSortIcon('grossProfitRate')}</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {sortedData.map((item) => (
                                    <tr key={item.productCode} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-4 py-4 font-mono font-semibold text-[#00214d]">{item.productCode}</td>
                                        <td className="px-4 py-4 text-neutral-700">{item.productName}</td>
                                        <td className="px-4 py-4 text-right font-semibold text-neutral-800">{formatCurrency(item.sales)}</td>
                                        <td className="px-4 py-4 text-right text-neutral-600">{formatCurrency(item.cost)}</td>
                                        <td className="px-4 py-4 text-right font-bold text-green-600">{formatCurrency(item.grossProfit)}</td>
                                        <td className="px-4 py-4 text-right text-neutral-600">{formatPercent(item.costRate)}</td>
                                        <td className="px-4 py-4 text-right font-bold text-green-600">{formatPercent(item.grossProfitRate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}

