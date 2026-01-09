"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PeriodNavigator from "@/components/PeriodNavigator";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

    // V1.565: 商品選択状態（最大5件）
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [graphData, setGraphData] = useState<any[]>([]);
    const [isGraphOpen, setIsGraphOpen] = useState(true);
    const [graphLoading, setGraphLoading] = useState(false);
    const [showPrevYear, setShowPrevYear] = useState(true);
    const [graphType, setGraphType] = useState<'line' | 'bar'>('line');

    // V1.565: 表示項目選択（初期表示：売上高、粗利、粗利率）
    const [visibleItems, setVisibleItems] = useState({
        sales: true,
        salesPrevYear: false,
        grossProfit: true,
        grossProfitPrevYear: false,
        grossProfitRate: true
    });

    const toggleVisibleItem = (item: keyof typeof visibleItems) => {
        setVisibleItems(prev => ({ ...prev, [item]: !prev[item] }));
    };

    // カラーパレット（設計書指定）
    const colorPalette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

    const handleProductSelect = (productCode: string) => {
        setSelectedProducts(prev => {
            if (prev.includes(productCode)) {
                return prev.filter(code => code !== productCode);
            } else {
                if (prev.length >= 5) {
                    return prev; // 最大5件まで
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
            const idsParam = encodeURIComponent(selectedProducts.join(','));
            const url = `/api/charts/pl-trend?startYm=${startYm}&endYm=${endYm}&type=product&ids=${idsParam}&salesChannelId=${salesChannelId}`;
            const res = await fetch(url);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch graph data');
            }
            const result = await res.json();

            // APIレスポンスをRechartsフォーマットに変換
            const formattedData = result.map((item: any) => {
                const dataPoint: any = { periodYm: item.periodYm };
                item.data.forEach((product: any) => {
                    dataPoint[`sales_${product.id}`] = product.sales;
                    dataPoint[`salesPrevYear_${product.id}`] = product.salesPrevYear;
                    dataPoint[`grossProfit_${product.id}`] = product.grossProfit;
                    dataPoint[`grossProfitPrevYear_${product.id}`] = product.grossProfitPrevYear;
                    dataPoint[`grossProfitRate_${product.id}`] = product.grossProfitRate;
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

    // 選択商品変更時にグラフデータを再取得
    useEffect(() => {
        if (selectedProducts.length > 0) {
            fetchGraphData();
        } else {
            setGraphData([]);
        }
    }, [selectedProducts, startYm, endYm, salesChannelId]);

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
        <div className="min-h-screen bg-neutral-50">
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-[#00214d] flex items-center gap-2">
                        <span className="w-1 h-8 bg-[#d4af37] rounded-full"></span>
                        商品別PL分析
                    </h2>
                </div>
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
                        <Link href="/pl" className="text-sm text-[#00214d] hover:text-[#d4af37] font-medium transition-colors">
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
                                    <th className="px-4 py-4 text-center font-bold">
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                                            title="全解除"
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
                                {sortedData.map((item) => {
                                    const isSelected = selectedProducts.includes(item.productCode);
                                    const isDisabled = !isSelected && selectedProducts.length >= 5;
                                    return (
                                        <tr key={item.productCode} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-4 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleProductSelect(item.productCode)}
                                                    disabled={isDisabled}
                                                    className="w-4 h-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="px-4 py-4 font-mono font-semibold text-[#00214d]">{item.productCode}</td>
                                            <td className="px-4 py-4 text-neutral-700">{item.productName}</td>
                                            <td className="px-4 py-4 text-right font-semibold text-neutral-800">{formatCurrency(item.sales)}</td>
                                            <td className="px-4 py-4 text-right text-neutral-600">{formatCurrency(item.cost)}</td>
                                            <td className="px-4 py-4 text-right font-bold text-green-600">{formatCurrency(item.grossProfit)}</td>
                                            <td className="px-4 py-4 text-right text-neutral-600">{formatPercent(item.costRate)}</td>
                                            <td className="px-4 py-4 text-right font-bold text-green-600">{formatPercent(item.grossProfitRate)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 選択状態表示 */}
                {sortedData.length > 0 && (
                    <div className="mt-4 px-4 py-3 bg-white rounded-lg border-2 border-neutral-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-700">
                                比較対象: <span className="text-[#00214d] font-bold">{selectedProducts.length}</span> / 5 件選択中
                            </span>
                            {selectedProducts.length > 0 && (
                                <button
                                    onClick={handleSelectAll}
                                    className="text-xs px-3 py-1 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors text-neutral-700"
                                >
                                    全解除
                                </button>
                            )}
                        </div>
                        {selectedProducts.length === 5 && (
                            <span className="text-xs text-amber-600 font-medium">
                                ⚠ 最大5件まで選択可能です
                            </span>
                        )}
                    </div>
                )}

                {/* グラフエリア */}
                <div className="mt-8 bg-white border-2 border-neutral-200 rounded-xl p-6 shadow-lg">
                    <div className="mb-4">
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setIsGraphOpen(!isGraphOpen)}
                        >
                            <h3 className="text-xl font-bold text-[#00214d] flex items-center gap-2">
                                {isGraphOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                商品別PL推移グラフ
                            </h3>
                        </div>
                        {isGraphOpen && selectedProducts.length > 0 && (
                            <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showPrevYear}
                                            onChange={(e) => setShowPrevYear(e.target.checked)}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                        <span className="text-sm font-medium text-gray-700">昨年対比を表示</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setGraphType('line')}
                                            className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${graphType === 'line'
                                                ? 'bg-[#00214d] text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            折れ線
                                        </button>
                                        <button
                                            onClick={() => setGraphType('bar')}
                                            className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${graphType === 'bar'
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
                                            checked={visibleItems.sales}
                                            onChange={() => toggleVisibleItem('sales')}
                                            className="w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-700">売上高</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={visibleItems.grossProfit}
                                            onChange={() => toggleVisibleItem('grossProfit')}
                                            className="w-3.5 h-3.5 cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-700">粗利</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={visibleItems.grossProfitRate}
                                            onChange={() => toggleVisibleItem('grossProfitRate')}
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
                            {selectedProducts.length === 0 ? (
                                <div className="text-center py-16">
                                    <svg className="w-20 h-20 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <p className="text-lg text-neutral-600 font-medium mb-2">比較したい商品を選択してください</p>
                                    <p className="text-sm text-neutral-500">上の表から最大5件まで選択できます</p>
                                </div>
                            ) : graphLoading ? (
                                <div className="text-center py-16">
                                    <svg className="animate-spin h-10 w-10 text-[#00214d] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="text-neutral-500">グラフを読み込み中...</p>
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

                                            {selectedProducts.map((productCode, index) => {
                                                const product = plData.find(p => p.productCode === productCode);
                                                const color = colorPalette[index % colorPalette.length];
                                                const lightColor = color + '80';

                                                return (
                                                    <React.Fragment key={productCode}>
                                                        {visibleItems.sales && (
                                                            <Line
                                                                yAxisId="left"
                                                                type="monotone"
                                                                dataKey={`sales_${productCode}`}
                                                                stroke={color}
                                                                strokeWidth={2}
                                                                name={`${product?.productName || productCode} - 売上高`}
                                                                dot={{ fill: color, r: 4 }}
                                                            />
                                                        )}
                                                        {visibleItems.salesPrevYear && showPrevYear && (
                                                            <Line
                                                                yAxisId="left"
                                                                type="monotone"
                                                                dataKey={`salesPrevYear_${productCode}`}
                                                                stroke={lightColor}
                                                                strokeWidth={2}
                                                                strokeDasharray="5 5"
                                                                name={`${product?.productName || productCode} - 売上高(昨年)`}
                                                                dot={{ fill: lightColor, r: 3 }}
                                                            />
                                                        )}
                                                        {visibleItems.grossProfit && (
                                                            <Line
                                                                yAxisId="left"
                                                                type="monotone"
                                                                dataKey={`grossProfit_${productCode}`}
                                                                stroke={color}
                                                                strokeWidth={2}
                                                                strokeDasharray="3 3"
                                                                name={`${product?.productName || productCode} - 粗利`}
                                                                dot={{ fill: color, r: 3 }}
                                                            />
                                                        )}
                                                        {visibleItems.grossProfitPrevYear && showPrevYear && (
                                                            <Line
                                                                yAxisId="left"
                                                                type="monotone"
                                                                dataKey={`grossProfitPrevYear_${productCode}`}
                                                                stroke={lightColor}
                                                                strokeWidth={2}
                                                                strokeDasharray="3 3"
                                                                name={`${product?.productName || productCode} - 粗利(昨年)`}
                                                                dot={{ fill: lightColor, r: 2 }}
                                                            />
                                                        )}
                                                        {visibleItems.grossProfitRate && (
                                                            <Line
                                                                yAxisId="right"
                                                                type="monotone"
                                                                dataKey={`grossProfitRate_${productCode}`}
                                                                stroke={color}
                                                                strokeWidth={2}
                                                                name={`${product?.productName || productCode} - 粗利率`}
                                                                dot={{ fill: color, r: 4 }}
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

                                            {selectedProducts.map((productCode, index) => {
                                                const product = plData.find(p => p.productCode === productCode);
                                                const color = colorPalette[index % colorPalette.length];
                                                const lightColor = color + '80';

                                                return (
                                                    <React.Fragment key={productCode}>
                                                        {visibleItems.sales && (
                                                            <Bar
                                                                yAxisId="left"
                                                                dataKey={`sales_${productCode}`}
                                                                fill={color}
                                                                name={`${product?.productName || productCode} - 売上高`}
                                                            />
                                                        )}
                                                        {visibleItems.salesPrevYear && showPrevYear && (
                                                            <Bar
                                                                yAxisId="left"
                                                                dataKey={`salesPrevYear_${productCode}`}
                                                                fill={lightColor}
                                                                name={`${product?.productName || productCode} - 売上高(昨年)`}
                                                            />
                                                        )}
                                                        {visibleItems.grossProfit && (
                                                            <Bar
                                                                yAxisId="left"
                                                                dataKey={`grossProfit_${productCode}`}
                                                                fill={color}
                                                                name={`${product?.productName || productCode} - 粗利`}
                                                            />
                                                        )}
                                                        {visibleItems.grossProfitPrevYear && showPrevYear && (
                                                            <Bar
                                                                yAxisId="left"
                                                                dataKey={`grossProfitPrevYear_${productCode}`}
                                                                fill={lightColor}
                                                                name={`${product?.productName || productCode} - 粗利(昨年)`}
                                                            />
                                                        )}
                                                        {visibleItems.grossProfitRate && (
                                                            <Bar
                                                                yAxisId="right"
                                                                dataKey={`grossProfitRate_${productCode}`}
                                                                fill={color}
                                                                name={`${product?.productName || productCode} - 粗利率`}
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
            </main>
        </div>
    );
};

