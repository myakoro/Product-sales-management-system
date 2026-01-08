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
    // V1.53: Budget fields
    grossProfitBudget: number | null;
    adBudget: number | null;
    operatingProfitBudget: number | null;
    // V1.53: Variance fields
    grossProfitVariance: number | null;
    adVariance: number | null;
    operatingProfitVariance: number | null;
    // V1.53: Achievement rate fields
    grossProfitAchievementRate: number | null;
    adAchievementRate: number | null;
    operatingProfitAchievementRate: number | null;
};

type CategoryPL = {
    categoryId: number | null;
    categoryName: string;
    sales: number;
    cogs: number;
    grossProfit: number;
    grossProfitRate: number;
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
    // Tab state
    const [activeTab, setActiveTab] = useState<'overall' | 'product' | 'category'>('overall');

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

    // Category PL state
    const [categoryData, setCategoryData] = useState<CategoryPL[]>([]);
    const [categorySortBy, setCategorySortBy] = useState<'sales' | 'grossProfit' | 'grossProfitRate'>('sales');
    const [categorySortOrder, setCategorySortOrder] = useState<'asc' | 'desc'>('desc');

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

    const fetchCategoryData = async () => {
        setLoading(true);
        setError("");
        try {
            let targetYm;
            if (periodMode === 'preset' && presetType === 'single') {
                targetYm = baseYm;
            } else if (periodMode === 'custom') {
                targetYm = customEnd;
            } else {
                const range = getRange(presetType, baseYm);
                targetYm = range.end;
            }

            const url = `/api/pl/category?targetYm=${targetYm}&sortBy=${categorySortBy}&sortOrder=${categorySortOrder}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch category data");
            const result = await res.json();
            setCategoryData(result);
        } catch (err) {
            console.error(err);
            setError("カテゴリー別データの取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    const handleFetchData = () => {
        if (activeTab === 'category') {
            fetchCategoryData();
        } else {
            fetchData();
        }
    };

    const handleSortCategory = (sortBy: 'sales' | 'grossProfit' | 'grossProfitRate') => {
        if (categorySortBy === sortBy) {
            setCategorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setCategorySortBy(sortBy);
            setCategorySortOrder('desc');
        }
    };

    useEffect(() => {
        if (activeTab === 'category' && categoryData.length > 0) {
            fetchCategoryData();
        }
    }, [categorySortBy, categorySortOrder]);

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-6 py-8">
                <h2 className="text-3xl font-bold text-[#00214d] mb-6 flex items-center gap-2">
                    <span className="w-1 h-8 bg-[#d4af37] rounded-full"></span>
                    損益計算書 (PL)
                </h2>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('overall')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'overall'
                                ? 'border-[#00214d] text-[#00214d]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        全体PL
                    </button>
                    <button
                        onClick={() => setActiveTab('product')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'product'
                                ? 'border-[#00214d] text-[#00214d]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        商品別PL
                    </button>
                    <button
                        onClick={() => setActiveTab('category')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'category'
                                ? 'border-[#00214d] text-[#00214d]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        カテゴリー別PL
                    </button>
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
                                onClick={handleFetchData}
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

                    {/* Product Tab - Redirect */}
                    {activeTab === 'product' && (
                        <div className="text-center py-12">
                            <p className="text-gray-600 mb-4">商品別PL分析は専用ページで表示されます。</p>
                            <Link
                                href="/pl/products"
                                className="inline-block px-6 py-3 bg-[#00214d] text-white rounded-lg hover:bg-[#00337a] transition-colors font-medium"
                            >
                                商品別PL分析ページへ →
                            </Link>
                        </div>
                    )}

                    {/* Overall Tab */}
                    {activeTab === 'overall' && (
                        <>
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

                                            {/* Gross Profit Budget/Variance/Achievement (V1.53) */}
                                            {data.grossProfitBudget !== null && (
                                                <>
                                                    <div className="flex justify-between py-1 text-sm text-blue-600 pl-4">
                                                        <span>粗利予算:</span>
                                                        <span>{formatCurrency(data.grossProfitBudget)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-1 text-sm pl-4">
                                                        <span>差異:</span>
                                                        <span className={data.grossProfitVariance! >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {data.grossProfitVariance! >= 0 ? '+' : ''}{formatCurrency(data.grossProfitVariance!)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between py-1 text-sm text-purple-600 pl-4 border-b border-gray-100">
                                                        <span>達成率:</span>
                                                        <span className="font-semibold">{data.grossProfitAchievementRate?.toFixed(1)}%</span>
                                                    </div>
                                                </>
                                            )}

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

                                                    {/* Ad Budget/Variance/Achievement (V1.53) */}
                                                    {data.adBudget !== null && (
                                                        <>
                                                            <div className="flex justify-between py-1 text-sm text-blue-600 pl-4">
                                                                <span>広告予算:</span>
                                                                <span>{formatCurrency(data.adBudget)}</span>
                                                            </div>
                                                            <div className="flex justify-between py-1 text-sm pl-4">
                                                                <span>差異:</span>
                                                                <span className={data.adVariance! <= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                    {data.adVariance! >= 0 ? '+' : ''}{formatCurrency(data.adVariance!)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between py-1 text-sm text-purple-600 pl-4 border-b border-gray-100">
                                                                <span>達成率:</span>
                                                                <span className="font-semibold">{data.adAchievementRate?.toFixed(1)}%</span>
                                                            </div>
                                                        </>
                                                    )}

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

                                                    {/* Operating Profit Budget/Variance/Achievement (V1.53) */}
                                                    {data.operatingProfitBudget !== null && (
                                                        <>
                                                            <div className="flex justify-between py-1 text-sm text-blue-600 pl-4">
                                                                <span>営業利益予算:</span>
                                                                <span>{formatCurrency(data.operatingProfitBudget)}</span>
                                                            </div>
                                                            <div className="flex justify-between py-1 text-sm pl-4">
                                                                <span>差異:</span>
                                                                <span className={data.operatingProfitVariance! >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                    {data.operatingProfitVariance! >= 0 ? '+' : ''}{formatCurrency(data.operatingProfitVariance!)}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between py-1 text-sm text-purple-600 pl-4">
                                                                <span>達成率:</span>
                                                                <span className="font-semibold">{data.operatingProfitAchievementRate?.toFixed(1)}%</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* Category Tab */}
                    {activeTab === 'category' && (
                        <>
                            {!categoryData.length && !loading && !error && (
                                <div className="text-center text-gray-500 py-12">
                                    「表示」ボタンを押してデータを読み込んでください。
                                </div>
                            )}

                            {categoryData.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-300">
                                                <th className="text-left py-3 px-4 font-semibold text-gray-700">カテゴリー名</th>
                                                <th
                                                    className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => handleSortCategory('sales')}
                                                >
                                                    売上高
                                                    {categorySortBy === 'sales' && (
                                                        <span className="ml-1">{categorySortOrder === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </th>
                                                <th className="text-right py-3 px-4 font-semibold text-gray-700">売上原価</th>
                                                <th
                                                    className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => handleSortCategory('grossProfit')}
                                                >
                                                    粗利
                                                    {categorySortBy === 'grossProfit' && (
                                                        <span className="ml-1">{categorySortOrder === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </th>
                                                <th
                                                    className="text-right py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => handleSortCategory('grossProfitRate')}
                                                >
                                                    粗利率
                                                    {categorySortBy === 'grossProfitRate' && (
                                                        <span className="ml-1">{categorySortOrder === 'asc' ? '↑' : '↓'}</span>
                                                    )}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categoryData.map((cat, idx) => (
                                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="py-3 px-4 font-medium">
                                                        {cat.categoryName || '未分類'}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        {formatCurrency(cat.sales)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-gray-600">
                                                        {formatCurrency(cat.cogs)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono font-semibold">
                                                        {formatCurrency(cat.grossProfit)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        {cat.grossProfitRate.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
