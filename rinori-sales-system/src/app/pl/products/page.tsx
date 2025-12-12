"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ProductPlData = {
    productCode: string;
    productName: string;
    quantity: number;
    sales: number;
    cost: number;
    grossProfit: number;
    avgUnitPrice: number;
    costRate: number;
    grossProfitRate: number;
};

type SalesChannel = {
    id: number;
    name: string;
    isActive: boolean;
};

// 商品コードの並び順を制御するための優先度関数
// RINO-FR 系 → RINOBG → RINO-SY → その他 の順に優先
function getProductCodePriority(code: string): number {
    if (code.startsWith('RINO-FR')) return 1;
    if (code.startsWith('RINOBG')) return 2;
    if (code.startsWith('RINO-SY')) return 3;
    return 4;
}

// Helper to get ranges (Duplicated from /pl/page.tsx for now)
const getRange = (type: 'single' | '3mo' | '6mo' | 'fiscal', baseYm: string): { start: string, end: string } => {
    const d = new Date(`${baseYm}-01`);
    const end = d.toISOString().slice(0, 7);
    let start = end;

    if (type === '3mo') {
        d.setMonth(d.getMonth() - 2);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        start = `${y}-${m}`;
    } else if (type === '6mo') {
        d.setMonth(d.getMonth() - 5);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        start = `${y}-${m}`;
    } else if (type === 'fiscal') {
        let year = d.getFullYear();
        if (d.getMonth() < 3) { // Jan..Mar
            year -= 1;
        }
        start = `${year}-04`;
    }

    return { start, end };
};

// Helper to get previous month in YYYY-MM
const getPreviousMonthYm = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

export default function ProductPlPage() {
    // Period Selection State
    const [periodType, setPeriodType] = useState('single');
    const [baseYm, setBaseYm] = useState("");
    const [startRange, setStartRange] = useState("");
    const [endRange, setEndRange] = useState("");

    // Search
    const [searchTerm, setSearchTerm] = useState("");

    // Sales channel filter
    const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);
    const [salesChannelId, setSalesChannelId] = useState<string>("");

    // Data
    const [data, setData] = useState<ProductPlData[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof ProductPlData, direction: 'asc' | 'desc' }>({ key: 'productCode', direction: 'asc' });

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

    const fetchData = async () => {
        setLoading(true);
        try {
            let sDate, eDate;
            if (periodType === 'custom') { // Assuming 'custom' or 'range', spec says "Multiple Month Range"
                // If UI supports range picker.
                // For now, let's implement the drop down logic as per request.
                sDate = startRange;
                eDate = endRange;
            } else {
                // Map the types: single, 3mo, 6mo, fiscal
                // If users select 'range', they need 2 inputs.
                // To keep it simple, I'll use logic similar to PL page or map logic to the dropdown.
                const range = getRange(periodType as any, baseYm);
                sDate = range.start;
                eDate = range.end;
            }

            // If custom range inputs are used
            if (periodType === 'range') {
                if (!startRange || !endRange) {
                    alert("期間を指定してください");
                    setLoading(false);
                    return;
                }
                sDate = startRange;
                eDate = endRange;
            }

            let url = `/api/pl/products?startYm=${sDate}&endYm=${eDate}&search=${searchTerm}`;
            if (salesChannelId) {
                url += `&salesChannelId=${salesChannelId}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed");
            const result: ProductPlData[] = await res.json();

            // 初期表示は商品コード優先ルールでソート
            const sortedInitial = [...result].sort((a, b) => {
                const pa = getProductCodePriority(a.productCode);
                const pb = getProductCodePriority(b.productCode);
                if (pa !== pb) {
                    return pa - pb;
                }
                return a.productCode.localeCompare(b.productCode);
            });

            setData(sortedInitial);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Sorting
    const handleSort = (key: keyof ProductPlData) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });

        const sorted = [...data].sort((a, b) => {
            if (key === 'productCode') {
                const pa = getProductCodePriority(a.productCode);
                const pb = getProductCodePriority(b.productCode);
                if (pa !== pb) {
                    return direction === 'asc' ? pa - pb : pb - pa;
                }
                const comp = a.productCode.localeCompare(b.productCode);
                return direction === 'asc' ? comp : -comp;
            }

            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setData(sorted);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <h1 className="text-lg font-semibold">Rinori 売上管理システム</h1>
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                        ダッシュボード
                    </Link>
                    <span className="text-sm text-gray-600">ユーザー: 管理者</span>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">商品別PL</h2>
                    <Link href="/pl" className="text-primary hover:underline text-sm font-medium">
                        &larr; 全体PLに戻る
                    </Link>
                </div>

                {/* Filters */}
                <div className="bg-white border border-gray-200 rounded p-4 mb-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">期間種別</label>
                            <select
                                value={periodType}
                                onChange={(e) => setPeriodType(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                            >
                                <option value="single">単月</option>
                                <option value="range">期間指定</option>
                                <option value="3mo">直近3ヶ月</option>
                                <option value="6mo">直近6ヶ月</option>
                                <option value="fiscal">期首〜現在</option>
                            </select>
                        </div>

                        {periodType === 'range' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">開始月</label>
                                    <input
                                        type="month"
                                        value={startRange}
                                        onChange={(e) => setStartRange(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded"
                                    />
                                </div>
                                <div className="self-center pb-2">〜</div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">終了月</label>
                                    <input
                                        type="month"
                                        value={endRange}
                                        onChange={(e) => setEndRange(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded"
                                    />
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium mb-1">基準月</label>
                                <input
                                    type="month"
                                    value={baseYm}
                                    onChange={(e) => setBaseYm(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">商品検索</label>
                            <input
                                type="text"
                                placeholder="コード・商品名"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">販路</label>
                            <select
                                value={salesChannelId}
                                onChange={(e) => setSalesChannelId(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                            >
                                <option value="">全販路</option>
                                {salesChannels.map((channel) => (
                                    <option key={channel.id} value={channel.id}>
                                        {channel.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                        >
                            表示
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                            <tr>
                                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('productCode')}>商品コード</th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('productName')}>商品名</th>
                                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('quantity')}>販売個数</th>
                                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('sales')}>売上(税別)</th>
                                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('cost')}>原価(税別)</th>
                                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('grossProfit')}>粗利</th>
                                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('avgUnitPrice')}>平均単価</th>
                                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('costRate')}>原価率</th>
                                <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('grossProfitRate')}>粗利率</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                        データがありません
                                    </td>
                                </tr>
                            )}
                            {data.map((item) => (
                                <tr key={item.productCode} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{item.productCode}</td>
                                    <td className="px-4 py-3">{item.productName}</td>
                                    <td className="px-4 py-3 text-right">{item.quantity.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">¥{Math.round(item.sales).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">¥{Math.round(item.cost).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">¥{Math.round(item.grossProfit).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">¥{Math.round(item.avgUnitPrice).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right">{item.costRate.toFixed(1)}%</td>
                                    <td className="px-4 py-3 text-right">{item.grossProfitRate.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
