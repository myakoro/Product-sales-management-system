"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

type PLTrendData = {
    periodYm: string;
    sales: number;
    salesPrevYear: number;
    grossProfit: number;
    grossProfitPrevYear: number;
    grossProfitRate: number;
    grossProfitRatePrevYear: number;
    operatingProfit?: number;
    operatingProfitPrevYear?: number;
    sga?: number;
};

type BudgetVsActualData = {
    periodYm: string;
    actualSales: number;
    budgetSales: number;
    prevYearSales: number;
    actualGrossProfit: number;
    budgetGrossProfit: number;
    prevYearGrossProfit: number;
    actualQuantity: number;
    budgetQuantity: number;
    prevYearQuantity: number;
    achievementRate: number;
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
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500 font-medium animate-pulse">読み込み中...</div>
            </div>
        }>
            <PlPageContent />
        </Suspense>
    );
}

function PlPageContent() {
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

    // V1.565: カテゴリー選択状態（最大5件）
    const [selectedCategories, setSelectedCategories] = useState<(number | null)[]>([]);
    const [categoryGraphData, setCategoryGraphData] = useState<any[]>([]);
    const [categoryGraphLoading, setCategoryGraphLoading] = useState(false);
    const [showCategoryPrevYear, setShowCategoryPrevYear] = useState(true);
    const [categoryGraphType, setCategoryGraphType] = useState<'line' | 'bar'>('line');

    // Query params for tab selection
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    useEffect(() => {
        if (tabParam === 'category') {
            setActiveTab('category');
        } else if (tabParam === 'product') {
            setActiveTab('product');
        }
    }, [tabParam]);

    // V1.565: カテゴリーグラフ表示項目選択（初期表示：売上高、粗利、粗利率）
    const [categoryVisibleItems, setCategoryVisibleItems] = useState({
        sales: true,
        salesPrevYear: false,
        grossProfit: true,
        grossProfitPrevYear: false,
        grossProfitRate: true
    });

    const toggleCategoryVisibleItem = (item: keyof typeof categoryVisibleItems) => {
        setCategoryVisibleItems(prev => ({ ...prev, [item]: !prev[item] }));
    };

    const handleCategorySelect = (categoryId: number | null) => {
        setSelectedCategories(prev => {
            if (prev.includes(categoryId)) {
                return prev.filter(id => id !== categoryId);
            } else {
                if (prev.length >= 5) {
                    return prev; // 最大5件まで
                }
                return [...prev, categoryId];
            }
        });
    };

    const handleCategorySelectAll = () => {
        setSelectedCategories([]);
    };

    // PL Trend Graph state
    const [plTrendData, setPlTrendData] = useState<PLTrendData[]>([]);
    const [isGraphOpen, setIsGraphOpen] = useState(true);
    const [visibleLines, setVisibleLines] = useState({
        sales: true,
        grossProfit: true,
        grossProfitRate: false,
        operatingProfit: false,
        sga: false
    });

    // Budget vs Actual Graph state
    const [budgetVsActualData, setBudgetVsActualData] = useState<BudgetVsActualData[]>([]);
    const [isBudgetGraphOpen, setIsBudgetGraphOpen] = useState(true);
    const [visibleBudgetLines, setVisibleBudgetLines] = useState({
        actualSales: true,
        budgetSales: true,
        achievementRate: true,
        actualGrossProfit: false,
        budgetGrossProfit: false,
        actualQuantity: false,
        budgetQuantity: false
    });

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
            if (salesChannelId && salesChannelId !== 'all') {
                url += `&salesChannelId=${salesChannelId}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch data");
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error(err);
            setError("データの取得に失敗しました。");
        }
    };

    const fetchCategoryData = async () => {
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

            let url = `/api/pl/category?startYm=${sDate}&endYm=${eDate}&sortBy=${categorySortBy}&sortOrder=${categorySortOrder}`;
            if (salesChannelId && salesChannelId !== 'all') {
                url += `&salesChannelId=${salesChannelId}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch category data");
            const result = await res.json();
            setCategoryData(result);
        } catch (err) {
            console.error(err);
            setError("カテゴリー別データの取得に失敗しました。");
        }
    };

    const handleFetchData = async () => {
        setLoading(true);
        setError("");
        try {
            if (activeTab === 'category') {
                await fetchCategoryData();
            } else if (activeTab === 'overall') {
                await fetchData();
            }
            // グラフデータも並行して取得
            await Promise.all([
                fetchPlTrendData(),
                fetchBudgetVsActualData()
            ]);
        } catch (err) {
            console.error("Fetch failed:", err);
            setError("データの読み込みに失敗しました。");
        } finally {
            setLoading(false);
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

    // Fetch PL Trend data
    const fetchPlTrendData = async () => {
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

            const type = activeTab === 'overall' ? 'overall' : activeTab === 'product' ? 'product' : 'category';
            let url = `/api/charts/pl-trend?startYm=${sDate}&endYm=${eDate}&type=${type}`;
            if (salesChannelId && salesChannelId !== 'all') {
                url += `&salesChannelId=${salesChannelId}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch PL trend data');
            const result = await res.json();

            // APIからのレスポンスを変換
            const trendData: PLTrendData[] = result.map((item: any) => ({
                periodYm: item.periodYm,
                sales: item.data[0]?.sales || 0,
                salesPrevYear: item.data[0]?.salesPrevYear || 0,
                grossProfit: item.data[0]?.grossProfit || 0,
                grossProfitPrevYear: item.data[0]?.grossProfitPrevYear || 0,
                grossProfitRate: item.data[0]?.grossProfitRate || 0,
                grossProfitRatePrevYear: item.data[0]?.grossProfitRatePrevYear || 0,
                operatingProfit: item.data[0]?.operatingProfit,
                operatingProfitPrevYear: item.data[0]?.operatingProfitPrevYear,
                sga: item.data[0]?.sga
            }));

            setPlTrendData(trendData);
        } catch (err) {
            console.error('PL推移データの取得に失敗しました:', err);
        }
    };

    // タブ切り替え時にグラフを開く
    useEffect(() => {
        setIsGraphOpen(true);
        setIsBudgetGraphOpen(true);
    }, [activeTab]);

    // カテゴリーグラフデータ取得
    const fetchCategoryGraphData = async () => {
        if (selectedCategories.length === 0) {
            setCategoryGraphData([]);
            return;
        }

        setCategoryGraphLoading(true);
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

            const ids = encodeURIComponent(selectedCategories.map(id => id === null ? 'unclassified' : id).join(','));
            let url = `/api/charts/pl-trend?startYm=${sDate}&endYm=${eDate}&type=category&ids=${ids}`;
            if (salesChannelId && salesChannelId !== 'all') {
                url += `&salesChannelId=${salesChannelId}`;
            }
            const res = await fetch(url);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch category graph data');
            }
            const result = await res.json();

            // APIレスポンスをRechartsフォーマットに変換
            const formattedData = result.map((item: any) => {
                const dataPoint: any = { periodYm: item.periodYm };
                item.data.forEach((category: any) => {
                    const catId = category.id === 'unclassified' ? 'unclassified' : category.id;
                    dataPoint[`sales_${catId}`] = category.sales;
                    dataPoint[`salesPrevYear_${catId}`] = category.salesPrevYear;
                    dataPoint[`grossProfit_${catId}`] = category.grossProfit;
                    dataPoint[`grossProfitPrevYear_${catId}`] = category.grossProfitPrevYear;
                    dataPoint[`grossProfitRate_${catId}`] = category.grossProfitRate;
                });
                return dataPoint;
            });

            setCategoryGraphData(formattedData);
        } catch (err) {
            console.error('カテゴリーグラフデータの取得に失敗しました:', err);
        } finally {
            setCategoryGraphLoading(false);
        }
    };

    // 選択カテゴリー変更時にグラフデータを再取得
    useEffect(() => {
        if (activeTab === 'category' && selectedCategories.length > 0) {
            fetchCategoryGraphData();
        } else {
            setCategoryGraphData([]);
        }
    }, [selectedCategories, periodMode, presetType, baseYm, customStart, customEnd, activeTab, salesChannelId]);

    const toggleLine = (line: keyof typeof visibleLines) => {
        setVisibleLines(prev => ({ ...prev, [line]: !prev[line] }));
    };

    const toggleBudgetLine = (line: keyof typeof visibleBudgetLines) => {
        setVisibleBudgetLines(prev => ({ ...prev, [line]: !prev[line] }));
    };

    // Fetch Budget vs Actual data
    const fetchBudgetVsActualData = async () => {
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

            let url = `/api/charts/budget-vs-actual?startYm=${sDate}&endYm=${eDate}`;
            if (salesChannelId && salesChannelId !== 'all') {
                url += `&salesChannelId=${salesChannelId}`;
            }
            const res = await fetch(url);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch budget vs actual data');
            }
            const result = await res.json();

            // APIからのレスポンスを変換
            const budgetData: BudgetVsActualData[] = result.map((item: any) => ({
                periodYm: item.periodYm,
                actualSales: item.data[0]?.actualSales || 0,
                budgetSales: item.data[0]?.budgetSales || 0,
                prevYearSales: item.data[0]?.prevYearSales || 0,
                actualGrossProfit: item.data[0]?.actualGrossProfit || 0,
                budgetGrossProfit: item.data[0]?.budgetGrossProfit || 0,
                prevYearGrossProfit: item.data[0]?.prevYearGrossProfit || 0,
                actualQuantity: item.data[0]?.actualQuantity || 0,
                budgetQuantity: item.data[0]?.budgetQuantity || 0,
                prevYearQuantity: item.data[0]?.prevYearQuantity || 0,
                achievementRate: item.data[0]?.achievementRate || 0
            }));

            setBudgetVsActualData(budgetData);
        } catch (err) {
            console.error('予算実績データの取得に失敗しました:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-7xl mx-auto px-6 py-8">
                <h2 className="text-3xl font-bold text-[#00214d] mb-6 flex items-center gap-2">
                    <span className="w-1 h-8 bg-[#d4af37] rounded-full"></span>
                    月次・期間PL分析
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
                                                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                                                    <button
                                                        onClick={handleCategorySelectAll}
                                                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                                        title="全解除"
                                                    >
                                                        解除
                                                    </button>
                                                </th>
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
                                            {categoryData.map((cat, idx) => {
                                                const isSelected = selectedCategories.includes(cat.categoryId);
                                                const isDisabled = !isSelected && selectedCategories.length >= 5;
                                                return (
                                                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                                        <td className="py-3 px-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleCategorySelect(cat.categoryId)}
                                                                disabled={isDisabled}
                                                                className="w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                            />
                                                        </td>
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
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* カテゴリー別PL選択状態表示 */}
                {activeTab === 'category' && categoryData.length > 0 && (
                    <div className="mt-4 px-4 py-3 bg-white rounded-lg border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-700">
                                比較対象: <span className="text-[#00214d] font-bold">{selectedCategories.length}</span> / 5 件選択中
                            </span>
                            {selectedCategories.length > 0 && (
                                <button
                                    onClick={handleCategorySelectAll}
                                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors text-gray-700"
                                >
                                    全解除
                                </button>
                            )}
                        </div>
                        {selectedCategories.length === 5 && (
                            <span className="text-xs text-amber-600 font-medium">
                                ⚠ 最大5件まで選択可能です
                            </span>
                        )}
                    </div>
                )}

                {/* カテゴリー別PLグラフ */}
                {activeTab === 'category' && (
                    <div className="mt-8 bg-white border border-gray-200 rounded p-6 shadow-sm">
                        <div className="mb-4">
                            <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => setIsGraphOpen(!isGraphOpen)}
                            >
                                <h3 className="text-xl font-bold text-[#00214d] flex items-center gap-2">
                                    {isGraphOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                    カテゴリー別PL推移グラフ
                                </h3>
                            </div>
                            {isGraphOpen && selectedCategories.length > 0 && (
                                <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showCategoryPrevYear}
                                                onChange={(e) => setShowCategoryPrevYear(e.target.checked)}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                            <span className="text-sm font-medium text-gray-700">昨年対比を表示</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCategoryGraphType('line')}
                                                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${categoryGraphType === 'line'
                                                    ? 'bg-[#00214d] text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                折れ線
                                            </button>
                                            <button
                                                onClick={() => setCategoryGraphType('bar')}
                                                className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${categoryGraphType === 'bar'
                                                    ? 'bg-[#00214d] text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                棒
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <span className="text-xs font-semibold text-gray-600">表示項目:</span>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={categoryVisibleItems.sales}
                                                onChange={() => toggleCategoryVisibleItem('sales')}
                                                className="w-3.5 h-3.5 cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-700">売上高</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={categoryVisibleItems.grossProfit}
                                                onChange={() => toggleCategoryVisibleItem('grossProfit')}
                                                className="w-3.5 h-3.5 cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-700">粗利</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={categoryVisibleItems.grossProfitRate}
                                                onChange={() => toggleCategoryVisibleItem('grossProfitRate')}
                                                className="w-3.5 h-3.5 cursor-pointer"
                                            />
                                            <span className="text-xs text-gray-700">粗利率(%)</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isGraphOpen && (
                            <div className="mt-4">
                                {selectedCategories.length === 0 ? (
                                    <div className="text-center py-16">
                                        <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        <p className="text-lg text-gray-600 font-medium mb-2">比較したいカテゴリーを選択してください</p>
                                        <p className="text-sm text-gray-500">上の表から最大5件まで選択できます</p>
                                    </div>
                                ) : categoryGraphLoading ? (
                                    <div className="text-center py-16">
                                        <svg className="animate-spin h-10 w-10 text-[#00214d] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p className="text-gray-500">グラフを読み込み中...</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={400}>
                                        {categoryGraphType === 'line' ? (
                                            <LineChart data={categoryGraphData}>
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
                                                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '8px',
                                                        padding: '12px'
                                                    }}
                                                    formatter={(value: any, name: any) => {
                                                        if (name.includes('率')) {
                                                            return `${Number(value).toFixed(1)}%`;
                                                        }
                                                        return `¥${Number(value).toLocaleString()}`;
                                                    }}
                                                />
                                                <Legend />

                                                {selectedCategories.map((categoryId, index) => {
                                                    const category = categoryData.find(c => c.categoryId === categoryId);
                                                    // プレミアムな金融ダッシュボード風カラーパレット
                                                    const premiumColors = ['#1E40AF', '#047857', '#B45309', '#9F1239', '#6D28D9'];
                                                    const color = premiumColors[index % 5];
                                                    const lightColor = color + '70'; // より透明感のある昨年データ
                                                    const catId = categoryId === null ? 'unclassified' : categoryId;

                                                    return (
                                                        <React.Fragment key={catId}>
                                                            {categoryVisibleItems.sales && (
                                                                <Line
                                                                    yAxisId="left"
                                                                    type="monotone"
                                                                    dataKey={`sales_${catId}`}
                                                                    stroke={color}
                                                                    strokeWidth={2.5}
                                                                    name={`${category?.categoryName || '未分類'} - 売上高`}
                                                                    dot={{ fill: color, r: 4, strokeWidth: 0 }}
                                                                />
                                                            )}
                                                            {categoryVisibleItems.salesPrevYear && showCategoryPrevYear && (
                                                                <Line
                                                                    yAxisId="left"
                                                                    type="monotone"
                                                                    dataKey={`salesPrevYear_${catId}`}
                                                                    stroke={lightColor}
                                                                    strokeWidth={1.2}
                                                                    name={`${category?.categoryName || '未分類'} - 売上高(昨年)`}
                                                                    dot={{ fill: lightColor, r: 2.5, strokeWidth: 0 }}
                                                                />
                                                            )}
                                                            {categoryVisibleItems.grossProfit && (
                                                                <Line
                                                                    yAxisId="left"
                                                                    type="monotone"
                                                                    dataKey={`grossProfit_${catId}`}
                                                                    stroke={color}
                                                                    strokeWidth={2}
                                                                    strokeDasharray="6 4"
                                                                    name={`${category?.categoryName || '未分類'} - 粗利`}
                                                                    dot={{ fill: color, r: 3.5, strokeWidth: 0 }}
                                                                />
                                                            )}
                                                            {categoryVisibleItems.grossProfitPrevYear && showCategoryPrevYear && (
                                                                <Line
                                                                    yAxisId="left"
                                                                    type="monotone"
                                                                    dataKey={`grossProfitPrevYear_${catId}`}
                                                                    stroke={lightColor}
                                                                    strokeWidth={1}
                                                                    strokeDasharray="6 4"
                                                                    name={`${category?.categoryName || '未分類'} - 粗利(昨年)`}
                                                                    dot={{ fill: lightColor, r: 2, strokeWidth: 0 }}
                                                                />
                                                            )}
                                                            {categoryVisibleItems.grossProfitRate && (
                                                                <Line
                                                                    yAxisId="right"
                                                                    type="monotone"
                                                                    dataKey={`grossProfitRate_${catId}`}
                                                                    stroke={color}
                                                                    strokeWidth={2}
                                                                    strokeDasharray="2 3"
                                                                    name={`${category?.categoryName || '未分類'} - 粗利率`}
                                                                    dot={{ fill: color, r: 3.5, strokeWidth: 0 }}
                                                                />
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </LineChart>
                                        ) : (
                                            <BarChart data={categoryGraphData} barCategoryGap="20%" barGap={2}>
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
                                                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '8px',
                                                        padding: '12px'
                                                    }}
                                                    formatter={(value: any, name: any) => {
                                                        if (name.includes('率')) {
                                                            return `${Number(value).toFixed(1)}%`;
                                                        }
                                                        return `¥${Number(value).toLocaleString()}`;
                                                    }}
                                                />
                                                <Legend />

                                                {selectedCategories.map((categoryId, index) => {
                                                    const category = categoryData.find(c => c.categoryId === categoryId);
                                                    // プレミアムな金融ダッシュボード風カラーパレット
                                                    const premiumColors = ['#1E40AF', '#047857', '#B45309', '#9F1239', '#6D28D9'];
                                                    const color = premiumColors[index % 5];
                                                    const lightColor = color + '70'; // より透明感のある昨年データ
                                                    const catId = categoryId === null ? 'unclassified' : categoryId;

                                                    return (
                                                        <React.Fragment key={catId}>
                                                            {categoryVisibleItems.sales && (
                                                                <Bar
                                                                    yAxisId="left"
                                                                    dataKey={`sales_${catId}`}
                                                                    fill={color}
                                                                    name={`${category?.categoryName || '未分類'} - 売上高`}
                                                                />
                                                            )}
                                                            {categoryVisibleItems.salesPrevYear && showCategoryPrevYear && (
                                                                <Bar
                                                                    yAxisId="left"
                                                                    dataKey={`salesPrevYear_${catId}`}
                                                                    fill={lightColor}
                                                                    name={`${category?.categoryName || '未分類'} - 売上高(昨年)`}
                                                                />
                                                            )}
                                                            {categoryVisibleItems.grossProfit && (
                                                                <Bar
                                                                    yAxisId="left"
                                                                    dataKey={`grossProfit_${catId}`}
                                                                    fill={color}
                                                                    name={`${category?.categoryName || '未分類'} - 粗利`}
                                                                />
                                                            )}
                                                            {categoryVisibleItems.grossProfitPrevYear && showCategoryPrevYear && (
                                                                <Bar
                                                                    yAxisId="left"
                                                                    dataKey={`grossProfitPrevYear_${catId}`}
                                                                    fill={lightColor}
                                                                    name={`${category?.categoryName || '未分類'} - 粗利(昨年)`}
                                                                />
                                                            )}
                                                            {categoryVisibleItems.grossProfitRate && (
                                                                <Bar
                                                                    yAxisId="right"
                                                                    dataKey={`grossProfitRate_${catId}`}
                                                                    fill={color}
                                                                    name={`${category?.categoryName || '未分類'} - 粗利率`}
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
                )}

                {/* PL推移グラフ */}
                {(plTrendData.length > 0 || budgetVsActualData.length > 0) && plTrendData.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded p-6 shadow-sm mt-8">
                        <div
                            className="flex items-center justify-between cursor-pointer mb-4"
                            onClick={() => setIsGraphOpen(!isGraphOpen)}
                        >
                            <h3 className="text-xl font-bold text-[#00214d] flex items-center gap-2">
                                {isGraphOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                PL推移グラフ
                            </h3>
                            <div className="flex gap-4 items-center" onClick={(e) => e.stopPropagation()}>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleLines.sales}
                                        onChange={() => toggleLine('sales')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#3b82f6]"></span>
                                        売上高
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleLines.grossProfit}
                                        onChange={() => toggleLine('grossProfit')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#10b981]"></span>
                                        粗利
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleLines.grossProfitRate}
                                        onChange={() => toggleLine('grossProfitRate')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#f59e0b]"></span>
                                        粗利率
                                    </span>
                                </label>
                                {activeTab === 'overall' && (
                                    <>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={visibleLines.operatingProfit}
                                                onChange={() => toggleLine('operatingProfit')}
                                                className="w-4 h-4"
                                            />
                                            <span className="flex items-center gap-1">
                                                <span className="w-4 h-0.5 bg-[#8b5cf6]"></span>
                                                営業利益
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={visibleLines.sga}
                                                onChange={() => toggleLine('sga')}
                                                className="w-4 h-4"
                                            />
                                            <span className="flex items-center gap-1">
                                                <span className="w-4 h-0.5 bg-[#ef4444]"></span>
                                                SGA
                                            </span>
                                        </label>
                                    </>
                                )}
                            </div>
                        </div>

                        {isGraphOpen && (
                            <div className="mt-4">
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={plTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="periodYm"
                                            stroke="#6b7280"
                                            style={{ fontSize: '12px' }}
                                        />
                                        <YAxis
                                            stroke="#6b7280"
                                            style={{ fontSize: '12px' }}
                                            tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '8px',
                                                padding: '12px'
                                            }}
                                            formatter={(value: any) => `¥${value.toLocaleString()}`}
                                        />
                                        <Legend />

                                        {visibleLines.sales && (
                                            <>
                                                <Line
                                                    type="monotone"
                                                    dataKey="sales"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2}
                                                    name="売上高"
                                                    dot={{ fill: '#3b82f6', r: 4 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="salesPrevYear"
                                                    stroke="#93c5fd"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    name="売上高(昨年)"
                                                    dot={{ fill: '#93c5fd', r: 3 }}
                                                />
                                            </>
                                        )}

                                        {visibleLines.grossProfit && (
                                            <>
                                                <Line
                                                    type="monotone"
                                                    dataKey="grossProfit"
                                                    stroke="#10b981"
                                                    strokeWidth={2}
                                                    name="粗利"
                                                    dot={{ fill: '#10b981', r: 4 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="grossProfitPrevYear"
                                                    stroke="#6ee7b7"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    name="粗利(昨年)"
                                                    dot={{ fill: '#6ee7b7', r: 3 }}
                                                />
                                            </>
                                        )}

                                        {visibleLines.grossProfitRate && (
                                            <>
                                                <Line
                                                    type="monotone"
                                                    dataKey="grossProfitRate"
                                                    stroke="#f59e0b"
                                                    strokeWidth={2}
                                                    name="粗利率(%)"
                                                    dot={{ fill: '#f59e0b', r: 4 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="grossProfitRatePrevYear"
                                                    stroke="#fcd34d"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    name="粗利率(昨年)"
                                                    dot={{ fill: '#fcd34d', r: 3 }}
                                                />
                                            </>
                                        )}

                                        {activeTab === 'overall' && visibleLines.operatingProfit && (
                                            <>
                                                <Line
                                                    type="monotone"
                                                    dataKey="operatingProfit"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={2}
                                                    name="営業利益"
                                                    dot={{ fill: '#8b5cf6', r: 4 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="operatingProfitPrevYear"
                                                    stroke="#c4b5fd"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 5"
                                                    name="営業利益(昨年)"
                                                    dot={{ fill: '#c4b5fd', r: 3 }}
                                                />
                                            </>
                                        )}

                                        {activeTab === 'overall' && visibleLines.sga && (
                                            <Line
                                                type="monotone"
                                                dataKey="sga"
                                                stroke="#ef4444"
                                                strokeWidth={2}
                                                name="SGA"
                                                dot={{ fill: '#ef4444', r: 4 }}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {/* 予算実績推移グラフ */}
                {budgetVsActualData.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded p-6 shadow-sm mt-8">
                        <div
                            className="flex items-center justify-between cursor-pointer mb-4"
                            onClick={() => setIsBudgetGraphOpen(!isBudgetGraphOpen)}
                        >
                            <h3 className="text-xl font-bold text-[#00214d] flex items-center gap-2">
                                {isBudgetGraphOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                予算実績推移グラフ
                            </h3>
                            <div className="flex gap-4 items-center" onClick={(e) => e.stopPropagation()}>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleBudgetLines.actualSales}
                                        onChange={() => toggleBudgetLine('actualSales')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#3b82f6]"></span>
                                        実績売上
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleBudgetLines.budgetSales}
                                        onChange={() => toggleBudgetLine('budgetSales')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#93c5fd] border-t-2 border-dashed border-[#93c5fd]"></span>
                                        予算売上
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleBudgetLines.actualGrossProfit}
                                        onChange={() => toggleBudgetLine('actualGrossProfit')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#10b981]"></span>
                                        実績粗利
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleBudgetLines.budgetGrossProfit}
                                        onChange={() => toggleBudgetLine('budgetGrossProfit')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#6ee7b7] border-t-2 border-dashed border-[#6ee7b7]"></span>
                                        予算粗利
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleBudgetLines.actualQuantity}
                                        onChange={() => toggleBudgetLine('actualQuantity')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#8b5cf6]"></span>
                                        実績数量
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleBudgetLines.budgetQuantity}
                                        onChange={() => toggleBudgetLine('budgetQuantity')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#c4b5fd] border-t-2 border-dashed border-[#c4b5fd]"></span>
                                        予算数量
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleBudgetLines.achievementRate}
                                        onChange={() => toggleBudgetLine('achievementRate')}
                                        className="w-4 h-4"
                                    />
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-0.5 bg-[#f59e0b]"></span>
                                        達成率(%)
                                    </span>
                                </label>
                            </div>
                        </div>

                        {isBudgetGraphOpen && (
                            <div className="mt-4">
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={budgetVsActualData}>
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
                                            stroke="#f59e0b"
                                            style={{ fontSize: '12px' }}
                                            tickFormatter={(value) => `${value.toFixed(0)}%`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '8px',
                                                padding: '12px'
                                            }}
                                            formatter={(value: any, name?: string) => {
                                                if (name && name.includes('達成率')) {
                                                    return `${Number(value).toFixed(1)}%`;
                                                }
                                                return `¥${Number(value).toLocaleString()}`;
                                            }}
                                        />
                                        <Legend />

                                        {visibleBudgetLines.actualSales && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="actualSales"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                name="実績売上"
                                                dot={{ fill: '#3b82f6', r: 4 }}
                                            />
                                        )}

                                        {visibleBudgetLines.budgetSales && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="budgetSales"
                                                stroke="#93c5fd"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                name="予算売上"
                                                dot={{ fill: '#93c5fd', r: 3 }}
                                            />
                                        )}

                                        {visibleBudgetLines.actualGrossProfit && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="actualGrossProfit"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                name="実績粗利"
                                                dot={{ fill: '#10b981', r: 4 }}
                                            />
                                        )}

                                        {visibleBudgetLines.budgetGrossProfit && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="budgetGrossProfit"
                                                stroke="#6ee7b7"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                name="予算粗利"
                                                dot={{ fill: '#6ee7b7', r: 3 }}
                                            />
                                        )}

                                        {visibleBudgetLines.actualQuantity && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="actualQuantity"
                                                stroke="#8b5cf6"
                                                strokeWidth={2}
                                                name="実績数量"
                                                dot={{ fill: '#8b5cf6', r: 4 }}
                                            />
                                        )}

                                        {visibleBudgetLines.budgetQuantity && (
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="budgetQuantity"
                                                stroke="#c4b5fd"
                                                strokeWidth={2}
                                                strokeDasharray="5 5"
                                                name="予算数量"
                                                dot={{ fill: '#c4b5fd', r: 3 }}
                                            />
                                        )}

                                        {visibleBudgetLines.achievementRate && (
                                            <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="achievementRate"
                                                stroke="#f59e0b"
                                                strokeWidth={2}
                                                name="達成率(%)"
                                                dot={{ fill: '#f59e0b', r: 4 }}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
