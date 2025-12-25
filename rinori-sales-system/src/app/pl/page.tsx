"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type PlData = {
    sales: number;
    cost: number;
    grossProfit: number;
    adExpense: number | null;
    operatingProfit: number | null;
};

type SalesChannel = {
    id: number;
    name: string;
    isActive: boolean;
};

// Helper to format currency (integer yen)
const formatCurrency = (amount: number) => {
    const rounded = Math.round(amount);
    return `¥${rounded.toLocaleString()}`;
};

// Helper to format percent
const formatPercent = (val: number, total: number) => {
    if (total === 0) return "-";
    return `${(val / total * 100).toFixed(1)}%`;
};

// Helper to get previous month in YYYY-MM
const getPreviousMonthYm = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

// Helper to get ranges
const getRange = (type: 'single' | '3mo' | '6mo' | 'fiscal', baseYm: string): { start: string, end: string } => {
    const d = new Date(`${baseYm}-01`);
    const end = d.toISOString().slice(0, 7);
    let start = end;

    if (type === '3mo') {
        d.setMonth(d.getMonth() - 2);
        start = d.toISOString().slice(0, 7);
    } else if (type === '6mo') {
        d.setMonth(d.getMonth() - 5);
        start = d.toISOString().slice(0, 7);
    } else if (type === 'fiscal') {
        // Assuming Fiscal Year starts in April
        // If current month is before April (e.g. 2025-02), start is 2024-04.
        // If current month is April or later (e.g. 2025-05), start is 2025-04.
        let year = d.getFullYear();
        if (d.getMonth() < 3) { // Jan(0)..Mar(2)
            year -= 1;
        }
        start = `${year}-04`;
    }

    return { start, end };
};

export default function PlPage() {
    // State
    const [periodMode, setPeriodMode] = useState<'preset' | 'custom'>('preset');
    const [presetType, setPresetType] = useState<'single' | '3mo' | '6mo' | 'fiscal'>('single');
    const [baseYm, setBaseYm] = useState("");

    // Custom range
    const [customStart, setCustomStart] = useState("2025-01");
    const [customEnd, setCustomEnd] = useState("2025-12");

    // Sales channel filter
    const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);
    const [salesChannelId, setSalesChannelId] = useState<string>("");

    const [data, setData] = useState<PlData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch sales channels
    useEffect(() => {
        fetch("/api/sales-channels?activeOnly=true")
            .then((res) => res.json())
            .then((data) => setSalesChannels(data))
            .catch((err) => console.error("Failed to fetch sales channels:", err));
    }, []);

    // Initialize baseYm as previous month (e.g. if today is 2025-12-11, baseYm = 2025-11)
    useEffect(() => {
        if (!baseYm) {
            setBaseYm(getPreviousMonthYm());
        }
    }, [baseYm]);

    // Auth
    const { data: session } = useSession();
    const user = session?.user as any;
    const userRole = user?.role || 'staff'; // Default to staff if not loaded yet, or handle loading state

    const fetchData = async () => {
        setLoading(true);
        setError("");
        try {
            let sDate, eDate;

            if (periodMode === 'preset') {
                const range = getRange(presetType, baseYm);
                sDate = range.start;
                eDate = range.end;
            } else {
                sDate = customStart;
                eDate = customEnd;
            }

            let url = `/api/pl?startYm=${sDate}&endYm=${eDate}`;
            if (salesChannelId) {
                url += `&salesChannelId=${salesChannelId}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch data");
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error(err);
            setError("データの取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <h1 className="text-lg font-semibold">Rinori 売上管理システム</h1>
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                        ダッシュボード
                    </Link>
                    <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                        ダッシュボード
                    </Link>
                    <span className="text-sm text-gray-600">権限: {userRole === 'master' ? '管理者' : 'スタッフ'}</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-2xl font-semibold">損益計算書 (PL)</h2>
                    <Link href="/pl/products" className="text-primary hover:underline text-sm font-medium">
                        商品別PL分析はこちら &rarr;
                    </Link>
                </div>

                {/* Period Selection */}
                <div className="bg-white border border-gray-200 rounded p-6 mb-8 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 block">期間設定</h3>

                    <div className="flex flex-col gap-4">
                        {/* Preset Mode */}
                        <div className="flex items-start gap-4">
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    id="mode-preset"
                                    name="periodMode"
                                    checked={periodMode === 'preset'}
                                    onChange={() => setPeriodMode('preset')}
                                    className="cursor-pointer"
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="mode-preset" className="font-medium cursor-pointer text-gray-800">プリセット期間</label>
                                <div className="mt-2 flex items-center gap-4 flex-wrap">
                                    <select
                                        value={presetType}
                                        onChange={(e) => setPresetType(e.target.value as any)}
                                        disabled={periodMode !== 'preset'}
                                        className="px-3 py-2 border border-gray-300 rounded bg-white disabled:bg-gray-100 disabled:text-gray-400"
                                    >
                                        <option value="single">単月</option>
                                        <option value="3mo">直近3ヶ月</option>
                                        <option value="6mo">直近6ヶ月</option>
                                        <option value="fiscal">期首〜現在</option>
                                    </select>

                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">基準月:</span>
                                        <input
                                            type="month"
                                            value={baseYm}
                                            onChange={(e) => setBaseYm(e.target.value)}
                                            disabled={periodMode !== 'preset'}
                                            className="px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Mode */}
                        <div className="flex items-start gap-4">
                            <div className="mt-1">
                                <input
                                    type="radio"
                                    id="mode-custom"
                                    name="periodMode"
                                    checked={periodMode === 'custom'}
                                    onChange={() => setPeriodMode('custom')}
                                    className="cursor-pointer"
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="mode-custom" className="font-medium cursor-pointer text-gray-800">任意の期間</label>
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        type="month"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        disabled={periodMode !== 'custom'}
                                        className="px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                    <span className="text-gray-500">〜</span>
                                    <input
                                        type="month"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        disabled={periodMode !== 'custom'}
                                        className="px-3 py-2 border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sales Channel Filter */}
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
                            <label className="text-sm font-medium text-gray-700">販路:</label>
                            <select
                                value={salesChannelId}
                                onChange={(e) => setSalesChannelId(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded bg-white"
                            >
                                <option value="">全販路</option>
                                {salesChannels.map((channel) => (
                                    <option key={channel.id} value={channel.id}>
                                        {channel.name}
                                    </option>
                                ))}
                            </select>
                            {salesChannelId && (
                                <span className="text-xs text-gray-500">※販路別では広告費・営業利益は表示されません</span>
                            )}
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="px-6 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                            >
                                {loading ? '読み込み中...' : '表示'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Report Area */}
                <div className="bg-white border border-gray-200 rounded p-8 shadow-sm min-h-[400px]">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {!data && !loading && !error && (
                        <div className="text-center text-gray-500 py-12">
                            「表示」ボタンを押してデータを読み込んでください。
                        </div>
                    )}

                    {data && (
                        <>
                            {userRole === 'staff' ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">🔴</div>
                                    <p className="text-lg text-gray-600">総合計は非表示</p>
                                    <p className="text-sm text-gray-500 mt-2">※ 商品別PLは閲覧可能です</p>
                                </div>
                            ) : (
                                <div className="max-w-xl mx-auto font-mono text-lg">
                                    {/* Sales */}
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                        <span>売上（税別）:</span>
                                        <span className="font-bold">{formatCurrency(data.sales)}</span>
                                    </div>

                                    {/* Cost */}
                                    <div className="flex justify-between py-2 border-b border-gray-100 text-gray-600">
                                        <span>原価（税別）:</span>
                                        <div className="text-right">
                                            <span>-{formatCurrency(data.cost)}</span>
                                            <span className="text-sm ml-2">({formatPercent(data.cost, data.sales)})</span>
                                        </div>
                                    </div>

                                    <div className="border-t-2 border-gray-300 my-4"></div>

                                    {/* Gross Profit */}
                                    <div className="flex justify-between py-2 border-b border-gray-100">
                                        <span>粗利:</span>
                                        <div className="text-right">
                                            <span className="font-bold">{formatCurrency(data.grossProfit)}</span>
                                            <span className="text-sm ml-2 text-gray-600">({formatPercent(data.grossProfit, data.sales)})</span>
                                        </div>
                                    </div>

                                    {data.adExpense !== null && data.operatingProfit !== null && (
                                        <>
                                            {/* Ad Expense */}
                                            <div className="flex justify-between py-2 border-b border-gray-100 text-gray-600">
                                                <span>広告費:</span>
                                                <div className="text-right">
                                                    <span>-{formatCurrency(data.adExpense)}</span>
                                                    <span className="text-sm ml-2">({formatPercent(data.adExpense, data.sales)})</span>
                                                </div>
                                            </div>

                                            <div className="border-t-2 border-gray-800 my-4"></div>

                                            {/* Operating Profit */}
                                            <div className="flex justify-between py-4 text-xl">
                                                <span className="font-bold">営業利益:</span>
                                                <div className="text-right">
                                                    <span className={`font-bold ${data.operatingProfit >= 0 ? 'text-black' : 'text-red-600'}`}>
                                                        {formatCurrency(data.operatingProfit)}
                                                    </span>
                                                    <span className="text-base ml-2 text-gray-600">({formatPercent(data.operatingProfit, data.sales)})</span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
