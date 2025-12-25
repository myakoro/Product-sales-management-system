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
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
            <header className="bg-gradient-to-r from-[#00214d] to-[#002855] border-b-2 border-[#d4af37] px-6 py-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">PL分析 (月次・期間)</h1>
                    <Link href="/" className="px-4 py-2 text-white hover:text-[#d4af37] transition-colors duration-200 font-medium">
                        ダッシュボードへ戻る
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-neutral-200 mb-8 flex flex-wrap gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">期間設定</label>
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
                        <label className="block text-sm font-medium mb-2 text-gray-700">販路</label>
                        <select
                            value={salesChannelId}
                            onChange={(e) => setSalesChannelId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none transition-all"
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
                </div>

                {loading ? (
                    <div className="p-12 text-center bg-white rounded-xl shadow-lg border-2 border-neutral-200">
                        <svg className="animate-spin h-8 w-8 text-[#00214d] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-neutral-500 font-medium">集計中...</p>
                    </div>
                ) : !plData ? (
                    <div className="p-12 text-center bg-white rounded-xl shadow-lg border-2 border-neutral-200">
                        <svg className="w-16 h-16 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-neutral-400 font-medium">データがありません</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-neutral-200 overflow-hidden">
                        <div className="p-6 border-b-2 border-neutral-100 bg-gradient-to-r from-neutral-50 to-white">
                            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#00214d] flex items-center gap-2">
                                        <span className="w-1 h-8 bg-[#d4af37] rounded-full"></span>
                                        損益計算書 (PL)
                                    </h2>
                                    <p className="text-sm text-neutral-500 mt-1 ml-3 font-medium">
                                        期間: {startYm} 〜 {endYm}
                                    </p>
                                </div>
                                <Link
                                    href={`/pl/products?startYm=${startYm}&endYm=${endYm}&salesChannelId=${salesChannelId}`}
                                    className="px-4 py-2 bg-gradient-to-br from-[#d4af37] to-[#b8860b] text-[#00214d] rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm"
                                >
                                    商品別PL分析を見る →
                                </Link>
                            </div>
                        </div>

                        {userRole === 'staff' ? (
                            <div className="p-12 text-center text-neutral-500 bg-neutral-50">
                                <p className="text-lg font-bold text-[#00214d] mb-2">閲覧制限</p>
                                <p>スタッフ権限ではPL全体の集計を閲覧できません。</p>
                                <p className="mt-4 text-xs bg-white py-2 px-4 rounded-full border border-neutral-200 inline-block">
                                    ※ 商品別PL分析などの詳細画面をご確認ください
                                </p>
                            </div>
                        ) : (
                            <div className="p-8 space-y-6">
                                {/* Sales */}
                                <div className="flex justify-between items-end pb-4 border-b-2 border-neutral-100 group transition-all">
                                    <span className="text-lg font-bold text-[#00214d]">売上高 (税別)</span>
                                    <span className="text-3xl font-black text-[#00214d] tracking-tight">{formatCurrency(plData.sales)}</span>
                                </div>

                                {/* Cost */}
                                <div className="flex justify-between items-center py-2 text-neutral-600 pl-4 border-l-4 border-neutral-200">
                                    <span className="font-semibold">売上原価</span>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-neutral-800">{formatCurrency(plData.cost)}</div>
                                        <div className="text-xs font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full inline-block mt-1">{formatPercent(plData.costRate)}</div>
                                    </div>
                                </div>

                                {/* Gross Profit */}
                                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 text-4xl opacity-10 group-hover:scale-125 transition-transform">📈</div>
                                    <span className="text-xl font-bold text-emerald-900">売上総利益 (粗利)</span>
                                    <div className="text-right z-10">
                                        <div className="text-3xl font-black text-emerald-700 tracking-tight">{formatCurrency(plData.grossProfit)}</div>
                                        <div className="text-sm font-bold text-emerald-600 mt-1">利益率: {formatPercent(plData.grossProfitRate)}</div>
                                    </div>
                                </div>

                                {/* Ad Expense */}
                                <div className="flex justify-between items-center py-2 text-neutral-600 pl-4 border-l-4 border-neutral-200">
                                    <span className="font-semibold text-rose-700">広告宣伝費</span>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-rose-900">{formatCurrency(plData.adExpense)}</div>
                                        <div className="text-xs font-bold text-rose-400 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1">{formatPercent(plData.adRate)}</div>
                                    </div>
                                </div>

                                {/* Operating Profit */}
                                <div className="flex justify-between items-center p-6 bg-gradient-to-r from-[#00214d] to-[#002855] text-white rounded-2xl shadow-xl border-t-4 border-[#d4af37] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 text-4xl opacity-20 group-hover:scale-125 transition-transform">⭐</div>
                                    <span className="text-xl font-bold">営業利益</span>
                                    <div className="text-right z-10">
                                        <div className="text-4xl font-black text-white tracking-tight">{formatCurrency(plData.operatingProfit)}</div>
                                        <div className="text-sm font-bold text-[#d4af37] mt-1">利益率: {formatPercent(plData.operatingProfitRate)}</div>
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
