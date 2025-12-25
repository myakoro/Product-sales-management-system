'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useSession } from 'next-auth/react';

type IncompleteProduct = {
    productCode: string;
    productName: string | null;
    salesPriceExclTax: number | null;
    costExclTax: number | null;
};

type MonthlySummary = {
    sales: number;
    cost: number;
    grossProfit: number;
    adExpense: number;
    operatingProfit: number;
    costRate: number;
    grossProfitRate: number;
    adExpenseRate: number;
    operatingProfitRate: number;
};

type TopProduct = {
    productCode: string;
    productName: string;
    budgetQuantity: number;
    actualQuantity: number;
    achievementRate: number;
};

type DashboardData = {
    currentMonth: string;
    monthlySummary: MonthlySummary;
    topProducts: TopProduct[];
    newProductCandidatesCount: number;
};

export default function HomePage() {
    const [incompleteCount, setIncompleteCount] = useState(0);
    const [incompleteProducts, setIncompleteProducts] = useState<IncompleteProduct[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();
    const user = session?.user as any;

    useEffect(() => {
        fetchIncompleteProducts();
        fetchDashboardData();
    }, []);

    const fetchIncompleteProducts = async () => {
        try {
            const res = await fetch('/api/products/incomplete');
            if (res.ok) {
                const data = await res.json();
                setIncompleteCount(data.count);
                setIncompleteProducts(data.products);
            }
        } catch (error) {
            console.error('不完全マスタ取得エラー:', error);
        }
    };

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/dashboard');
            if (res.ok) {
                const data = await res.json();
                setDashboardData(data);
            }
        } catch (error) {
            console.error('ダッシュボードデータ取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAchievementColor = (rate: number): string => {
        if (rate >= 100) return '#28a745';
        if (rate >= 80) return '#ffc107';
        return '#dc3545';
    };

    const formatMonth = (ym: string): string => {
        return `${ym.substring(0, 4)}年${ym.substring(4, 6)}月`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
            <main className="max-w-[1400px] mx-auto px-6 py-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-[#00214d] mb-2">ダッシュボード</h2>
                    <p className="text-neutral-600">システム全体の概要と重要な通知を確認できます</p>
                </div>

                {/* スマートアクション通知エリア */}
                <div className="mb-8 space-y-4">
                    {incompleteCount > 0 && (
                        <div
                            onClick={() => setShowModal(true)}
                            className="group bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform">
                                    ⚠️
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-lg font-bold text-amber-900">商品マスタに未設定項目があります</h3>
                                        <span className="px-3 py-1 bg-amber-200 text-amber-900 rounded-full text-sm font-bold">{incompleteCount}件</span>
                                    </div>
                                    <p className="text-amber-800 text-sm mb-2">商品名・販売価格・原価のいずれかが未設定です</p>
                                    <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                                        <span>クリックして詳細を確認</span>
                                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {dashboardData && dashboardData.newProductCandidatesCount > 0 && (
                        <Link
                            href="/products/candidates"
                            className="group block bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform">
                                    📦
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-lg font-bold text-blue-900">新商品候補があります</h3>
                                        <span className="px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-sm font-bold">{dashboardData.newProductCandidatesCount}件</span>
                                    </div>
                                    <p className="text-blue-800 text-sm mb-2">売上データから検出された未登録商品です</p>
                                    <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                                        <span>クリックして確認・登録</span>
                                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )}
                </div>

                {/* 今月のサマリー (マスター権限のみ) */}
                {!loading && dashboardData && user?.role === 'master' && (
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-neutral-200 p-8 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-[#00214d]">
                                {formatMonth(dashboardData.currentMonth)}の実績
                            </h3>
                            <Link href="/pl/monthly" className="px-4 py-2 bg-[#00214d] text-white rounded-lg hover:bg-[#d4af37] hover:text-[#00214d] transition-all duration-200 text-sm font-medium">
                                詳細を見る →
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-blue-700">売上（税別）</span>
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div className="text-3xl font-bold text-blue-900 mb-1">¥{Math.round(dashboardData.monthlySummary.sales).toLocaleString()}</div>
                                <div className="text-xs text-blue-600 flex items-center gap-1">
                                    <span>📊</span>
                                    <span>前月比 計算中</span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-green-700">粗利</span>
                                    <span className="text-2xl">📈</span>
                                </div>
                                <div className="text-3xl font-bold text-green-900 mb-1">¥{Math.round(dashboardData.monthlySummary.grossProfit).toLocaleString()}</div>
                                <div className="text-xs text-green-600 font-semibold">粗利率: {dashboardData.monthlySummary.grossProfitRate.toFixed(1)}%</div>
                            </div>
                            <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-6 border-2 border-red-200 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-red-700">広告費</span>
                                    <span className="text-2xl">💳</span>
                                </div>
                                <div className="text-3xl font-bold text-red-900 mb-1">¥{Math.round(dashboardData.monthlySummary.adExpense).toLocaleString()}</div>
                                <div className="text-xs text-red-600 font-semibold">広告率: {dashboardData.monthlySummary.adExpenseRate.toFixed(1)}%</div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl p-6 border-2 border-purple-200 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-purple-700">営業利益</span>
                                    <span className="text-2xl">⭐</span>
                                </div>
                                <div className="text-3xl font-bold text-purple-900 mb-1">¥{Math.round(dashboardData.monthlySummary.operatingProfit).toLocaleString()}</div>
                                <div className="text-xs text-purple-600 font-semibold">利益率: {dashboardData.monthlySummary.operatingProfitRate.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 予算vs実績 上位5商品 */}
                {!loading && dashboardData && dashboardData.topProducts.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-neutral-200 p-8 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-[#00214d]">
                                今月の主要商品 商品予算 vs 商品実績
                            </h3>
                            <Link href="/budget/vs-actual" className="px-4 py-2 bg-[#00214d] text-white rounded-lg hover:bg-[#d4af37] hover:text-[#00214d] transition-all duration-200 text-sm font-medium">
                                全商品を見る →
                            </Link>
                        </div>

                        <div className="overflow-hidden rounded-xl border-2 border-neutral-200">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-[#00214d] to-[#002855]">
                                    <tr>
                                        <th className="px-4 py-4 text-left text-sm font-bold text-white">商品コード</th>
                                        <th className="px-4 py-4 text-left text-sm font-bold text-white">商品名</th>
                                        <th className="px-4 py-4 text-right text-sm font-bold text-white">予算数量</th>
                                        <th className="px-4 py-4 text-right text-sm font-bold text-white">実績数量</th>
                                        <th className="px-4 py-4 text-right text-sm font-bold text-white">達成率</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {dashboardData.topProducts.map((product, index) => (
                                        <tr key={product.productCode} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-4 py-4 font-mono font-semibold text-[#00214d]">{product.productCode}</td>
                                            <td className="px-4 py-4 text-neutral-700">{product.productName}</td>
                                            <td className="px-4 py-4 text-right text-neutral-600">{product.budgetQuantity.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-right font-semibold text-neutral-800">{product.actualQuantity.toLocaleString()}</td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="flex-1 max-w-[100px] h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${
                                                                product.achievementRate >= 100 ? 'bg-green-500' :
                                                                product.achievementRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}
                                                            style={{ width: `${Math.min(product.achievementRate, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className={`font-bold text-sm ${
                                                        product.achievementRate >= 100 ? 'text-green-600' :
                                                        product.achievementRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                        {product.achievementRate.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 機能メニュー */}
                <div className="mt-8">
                    <h3 className="text-2xl font-bold text-[#00214d] mb-6">クイックアクセス</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 商品管理 */}
                        <div className="bg-white rounded-xl shadow-lg border-2 border-neutral-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-neutral-100">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center text-xl shadow-md">
                                    📦
                                </div>
                                <h4 className="text-lg font-bold text-[#00214d]">商品管理</h4>
                            </div>
                            <ul className="space-y-2">
                                <li>
                                    <Link href="/products" className="block px-4 py-3 text-[#00214d] hover:bg-blue-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-blue-200">
                                        商品マスタ管理
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products/import" className="block px-4 py-3 text-[#00214d] hover:bg-blue-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-blue-200">
                                        商品CSV取込
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products/candidates" className="block px-4 py-3 text-[#00214d] hover:bg-blue-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-blue-200">
                                        新商品候補
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* 売上管理 */}
                        <div className="bg-white rounded-xl shadow-lg border-2 border-neutral-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-neutral-100">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center text-xl shadow-md">
                                    💰
                                </div>
                                <h4 className="text-lg font-bold text-[#00214d]">売上管理</h4>
                            </div>
                            <ul className="space-y-2">
                                <li>
                                    <Link href="/import/sales" className="block px-4 py-3 text-[#00214d] hover:bg-green-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-green-200">
                                        売上CSV取込
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/import/history" className="block px-4 py-3 text-[#00214d] hover:bg-green-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-green-200">
                                        取込履歴
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* 予算・PL分析 */}
                        <div className="bg-white rounded-xl shadow-lg border-2 border-neutral-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-neutral-100">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-violet-600 rounded-lg flex items-center justify-center text-xl shadow-md">
                                    📊
                                </div>
                                <h4 className="text-lg font-bold text-[#00214d]">予算・PL分析</h4>
                            </div>
                            <ul className="space-y-2">
                                <li>
                                    <Link href="/budget" className="block px-4 py-3 text-[#00214d] hover:bg-purple-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-purple-200">
                                        商品予算設定
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/budget/vs-actual" className="block px-4 py-3 text-[#00214d] hover:bg-purple-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-purple-200">
                                        商品予算vs商品実績
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/pl/monthly" className="block px-4 py-3 text-[#00214d] hover:bg-purple-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-purple-200">
                                        月次PL / 期間PL分析
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/pl/products" className="block px-4 py-3 text-[#00214d] hover:bg-purple-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-purple-200">
                                        商品別PL分析
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* 広告費管理 */}
                        <div className="bg-white rounded-xl shadow-lg border-2 border-neutral-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-neutral-100">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-600 rounded-lg flex items-center justify-center text-xl shadow-md">
                                    📢
                                </div>
                                <h4 className="text-lg font-bold text-[#00214d]">広告費管理</h4>
                            </div>
                            <ul className="space-y-2">
                                <li>
                                    <Link href="/ad-expenses" className="block px-4 py-3 text-[#00214d] hover:bg-orange-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-orange-200">
                                        広告費管理
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* マスター登録 */}
                        <div className="bg-white rounded-xl shadow-lg border-2 border-neutral-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-neutral-100">
                                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-xl shadow-md">
                                    🛠️
                                </div>
                                <h4 className="text-lg font-bold text-[#00214d]">マスター登録</h4>
                            </div>
                            <ul className="space-y-2">
                                <li>
                                    <Link href="/settings/sales-channels" className="block px-4 py-3 text-[#00214d] hover:bg-cyan-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-cyan-200">
                                        販路
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/ad-expenses?tab=categories" className="block px-4 py-3 text-[#00214d] hover:bg-cyan-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-cyan-200">
                                        広告カテゴリー
                                    </Link>
                                </li>
                                {user?.role === 'master' && (
                                    <li>
                                        <Link href="/settings/users" className="block px-4 py-3 text-[#00214d] hover:bg-cyan-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-cyan-200">
                                            ユーザー管理
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* 設定 */}
                        <div className="bg-white rounded-xl shadow-lg border-2 border-neutral-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-neutral-100">
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-slate-600 rounded-lg flex items-center justify-center text-xl shadow-md">
                                    ⚙️
                                </div>
                                <h4 className="text-lg font-bold text-[#00214d]">設定</h4>
                            </div>
                            <ul className="space-y-2">
                                <li>
                                    <Link href="/settings/account" className="block px-4 py-3 text-[#00214d] hover:bg-gray-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-gray-200">
                                        アカウント
                                    </Link>
                                </li>
                                {user?.role === 'master' && (
                                    <>
                                        <li>
                                            <Link href="/settings/tax-rates" className="block px-4 py-3 text-[#00214d] hover:bg-gray-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-gray-200">
                                                税率設定
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/settings/export" className="block px-4 py-3 text-[#00214d] hover:bg-gray-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-gray-200">
                                                データエクスポート
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/settings/import" className="block px-4 py-3 text-[#00214d] hover:bg-gray-50 rounded-lg transition-all duration-200 font-medium border border-transparent hover:border-gray-200">
                                                データ復元
                                            </Link>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* モーダル */}
                {showModal && (
                    <div
                        onClick={() => setShowModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                padding: '2rem',
                                maxWidth: '800px',
                                width: '90%',
                                maxHeight: '80vh',
                                overflow: 'auto'
                            }}
                        >
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                                不完全マスタ一覧（{incompleteCount}件）
                            </h3>
                            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1.5rem' }}>
                                以下の商品は「管理中」ですが、商品名・販売価格・原価のいずれかが未設定です。
                            </p>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>商品コード</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>商品名</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>販売価格</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>原価</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incompleteProducts.map((product) => (
                                        <tr key={product.productCode} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '0.75rem' }}>
                                                <Link
                                                    href={`/products/${product.productCode}`}
                                                    style={{ color: '#0070f3', textDecoration: 'none' }}
                                                >
                                                    {product.productCode}
                                                </Link>
                                            </td>
                                            <td style={{ padding: '0.75rem', color: product.productName ? '#333' : '#999' }}>
                                                {product.productName || '未設定'}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: product.salesPriceExclTax ? '#333' : '#999' }}>
                                                {product.salesPriceExclTax ? `¥${product.salesPriceExclTax.toLocaleString()}` : '未設定'}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', color: product.costExclTax ? '#333' : '#999' }}>
                                                {product.costExclTax ? `¥${product.costExclTax.toLocaleString()}` : '未設定'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                                <button
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        padding: '0.75rem 2rem',
                                        backgroundColor: '#0070f3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                )}


            </main>
        </div>
    );
}

