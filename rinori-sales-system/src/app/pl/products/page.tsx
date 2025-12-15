"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProductPLPage() {
    const [startYm, setStartYm] = useState("2025-10");
    const [endYm, setEndYm] = useState("2025-10");
    const [typeFilter, setTypeFilter] = useState("all");
    const [plData, setPlData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortKey, setSortKey] = useState("sales");
    const [sortDesc, setSortDesc] = useState(true);
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
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'string') {
            return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        return sortDesc ? valB - valA : valA - valB;
    });

    const formatCurrency = (val: number) => `¥${Math.round(val).toLocaleString()}`;
    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    return (
        <div className="min-h-screen">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <h1 className="text-lg font-semibold">商品別PL分析</h1>
                <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                    ダッシュボードへ戻る
                </Link>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="bg-white p-4 rounded shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1">開始年月</label>
                        <input
                            type="month"
                            value={startYm}
                            onChange={(e) => setStartYm(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded"
                        />
                    </div>
                    <span className="mb-3">〜</span>
                    <div>
                        <label className="block text-sm font-medium mb-1">終了年月</label>
                        <input
                            type="month"
                            value={endYm}
                            onChange={(e) => setEndYm(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded"
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
                        className="mb-0.5 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        更新
                    </button>

                    <div className="ml-auto mb-0.5">
                        <Link href="/pl/monthly" className="text-sm text-blue-600 hover:underline">
                            → 月次・期間PLへ
                        </Link>
                    </div>
                </div>

                <div className="bg-white rounded shadow border border-gray-200 overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">読み込み中...</div>
                    ) : sortedData.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">データがありません</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('productCode')}>商品コード</th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('productName')}>商品名</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('sales')}>売上高</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('cost')}>原価</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('grossProfit')}>粗利</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('costRate')}>原価率</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('grossProfitRate')}>粗利率</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedData.map((item) => (
                                    <tr key={item.productCode} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-gray-600">{item.productCode}</td>
                                        <td className="px-4 py-3">{item.productName}</td>
                                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.sales)}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.cost)}</td>
                                        <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(item.grossProfit)}</td>
                                        <td className="px-4 py-3 text-right text-gray-500">{formatPercent(item.costRate)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-blue-700">{formatPercent(item.grossProfitRate)}</td>
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
