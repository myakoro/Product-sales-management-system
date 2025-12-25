"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PeriodNavigator from "@/components/PeriodNavigator";

export default function MonthlyPLPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;

    const [startYm, setStartYm] = useState("2025-10");
    const [endYm, setEndYm] = useState("2025-10");
    const [plData, setPlData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
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
            const res = await fetch(`/api/pl/monthly?startYm=${startYm}&endYm=${endYm}&salesChannelId=${salesChannelId}`);
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
    }, [startYm, endYm, salesChannelId]);

    const formatCurrency = (val: number) => `¥${Math.round(val).toLocaleString()}`;
    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    return (
        <div className="min-h-screen">
            <header className="bg-white border-b border-gray-200 px-6 py-4 relative flex items-center justify-center">
                <h1 className="text-xl font-bold text-center">PL分析 (月次・期間)</h1>
                <Link href="/" className="absolute right-6 text-gray-600 hover:text-primary">
                    ダッシュボードへ戻る
                </Link>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="bg-white p-4 rounded shadow-sm border border-gray-200 mb-8 flex gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1">期間設定</label>
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
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">読み込み中...</div>
                ) : !plData ? (
                    <div className="text-center py-12 text-gray-500">データがありません</div>
                ) : (
                    <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 bg-gray-50">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-bold inline-block">损益計算書 (PL)</h2>
                                    <span className="text-sm font-normal text-gray-500 ml-4">
                                        期間: {startYm} 〜 {endYm}
                                    </span>
                                </div>
                                <Link
                                    href={`/pl/products?startYm=${startYm}&endYm=${endYm}&salesChannelId=${salesChannelId}`}
                                    className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                                >
                                    商品別PLを見る →
                                </Link>
                            </div>

                        </div>

                        {userRole === 'staff' ? (
                            <div className="p-8 text-center text-gray-500">
                                <p>スタッフ権限ではPL全体の集計を閲覧できません。</p>
                                <p className="mt-2 text-sm">※ 商品別PLなどの詳細画面をご利用ください（実装予定）</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4">
                                {/* Sales */}
                                <div className="flex justify-between items-center pb-2 border-b border-dashed border-gray-200">
                                    <span className="font-medium">売上高 (税別)</span>
                                    <span className="text-lg font-bold">{formatCurrency(plData.sales)}</span>
                                </div>

                                {/* Cost */}
                                <div className="flex justify-between items-center pb-2 border-b border-dashed border-gray-200 text-gray-600">
                                    <span className="pl-4">売上原価</span>
                                    <div className="text-right">
                                        <div>{formatCurrency(plData.cost)}</div>
                                        <div className="text-xs text-gray-400">({formatPercent(plData.costRate)})</div>
                                    </div>
                                </div>

                                {/* Gross Profit */}
                                <div className="flex justify-between items-center py-2 bg-blue-50 px-4 rounded font-semibold text-blue-900">
                                    <span>売上総利益 (粗利)</span>
                                    <div className="text-right">
                                        <div>{formatCurrency(plData.grossProfit)}</div>
                                        <div className="text-xs opacity-75">({formatPercent(plData.grossProfitRate)})</div>
                                    </div>
                                </div>

                                {/* Ad Expense */}
                                <div className="flex justify-between items-center pb-2 border-b border-dashed border-gray-200 text-gray-600">
                                    <span className="pl-4">広告宣伝費</span>
                                    <div className="text-right">
                                        <div>{formatCurrency(plData.adExpense)}</div>
                                        <div className="text-xs text-gray-400">({formatPercent(plData.adRate)})</div>
                                    </div>
                                </div>

                                {/* Operating Profit */}
                                <div className="flex justify-between items-center py-4 bg-gray-900 text-white px-4 rounded text-lg font-bold">
                                    <span>営業利益</span>
                                    <div className="text-right">
                                        <div>{formatCurrency(plData.operatingProfit)}</div>
                                        <div className="text-sm font-normal opacity-75">({formatPercent(plData.operatingProfitRate)})</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
