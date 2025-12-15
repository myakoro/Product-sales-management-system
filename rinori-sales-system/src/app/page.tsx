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
        <div style={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
            {/* Header is provided by RootLayout */}

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>ダッシュボード</h2>

                {/* 警告・通知エリア */}
                <div style={{ marginBottom: '1.5rem' }}>
                    {incompleteCount > 0 && (
                        <div
                            onClick={() => setShowModal(true)}
                            style={{
                                backgroundColor: '#fff3cd',
                                border: '1px solid #ffc107',
                                borderRadius: '8px',
                                padding: '1rem 1.5rem',
                                marginBottom: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}
                        >
                            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                            <div>
                                <div style={{ fontWeight: '600', color: '#856404' }}>
                                    商品マスタに未設定項目があります（{incompleteCount}件）
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#856404', marginTop: '0.25rem' }}>
                                    クリックして詳細を確認
                                </div>
                            </div>
                        </div>
                    )}

                    {dashboardData && dashboardData.newProductCandidatesCount > 0 && (
                        <Link
                            href="/products/candidates"
                            style={{
                                display: 'block',
                                backgroundColor: '#d1ecf1',
                                border: '1px solid #bee5eb',
                                borderRadius: '8px',
                                padding: '1rem 1.5rem',
                                textDecoration: 'none',
                                marginBottom: '1rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>📦</span>
                                <div>
                                    <div style={{ fontWeight: '600', color: '#0c5460' }}>
                                        新商品候補があります（{dashboardData.newProductCandidatesCount}件）
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#0c5460', marginTop: '0.25rem' }}>
                                        クリックして確認
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )}
                </div>

                {/* 今月のサマリー (マスター権限のみ) */}
                {!loading && dashboardData && user?.role === 'master' && (
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginBottom: '2rem'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                            {formatMonth(dashboardData.currentMonth)}の実績
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>売上（税別）</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>¥{Math.round(dashboardData.monthlySummary.sales).toLocaleString()}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>粗利</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#28a745' }}>¥{Math.round(dashboardData.monthlySummary.grossProfit).toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>粗利率: {dashboardData.monthlySummary.grossProfitRate.toFixed(1)}%</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>広告費</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#dc3545' }}>¥{Math.round(dashboardData.monthlySummary.adExpense).toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>広告率: {dashboardData.monthlySummary.adExpenseRate.toFixed(1)}%</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>営業利益</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0070f3' }}>¥{Math.round(dashboardData.monthlySummary.operatingProfit).toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>利益率: {dashboardData.monthlySummary.operatingProfitRate.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 予算vs実績 上位5商品 */}
                {!loading && dashboardData && dashboardData.topProducts.length > 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginBottom: '2rem'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                            今月の主要商品 予算 vs 実績
                        </h3>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>商品コード</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>商品名</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>予算数量</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>実績数量</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>達成率</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData.topProducts.map((product) => (
                                    <tr key={product.productCode} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '0.75rem', fontWeight: '500' }}>{product.productCode}</td>
                                        <td style={{ padding: '0.75rem' }}>{product.productName}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{product.budgetQuantity.toLocaleString()}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>{product.actualQuantity.toLocaleString()}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'right',
                                            fontWeight: '600',
                                            color: getAchievementColor(product.achievementRate)
                                        }}>
                                            {product.achievementRate.toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* カテゴリ別メニュー */}
                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem' }}>機能メニュー</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {/* 商品カテゴリ */}
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>📦</span>
                                <span>商品</span>
                            </h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <li>
                                    <Link href="/products" style={{
                                        display: 'block',
                                        color: '#0070f3',
                                        textDecoration: 'none',
                                        fontSize: '1rem',
                                        padding: '1rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        backgroundColor: 'white',
                                        transition: 'all 0.2s'
                                    }}>
                                        商品マスタ管理
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products/import" style={{
                                        display: 'block',
                                        color: '#0070f3',
                                        textDecoration: 'none',
                                        fontSize: '1.1rem',
                                        padding: '1rem 1.5rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        backgroundColor: 'white',
                                        transition: 'all 0.2s'
                                    }}>
                                        商品CSV取込
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products/candidates" style={{
                                        display: 'block',
                                        color: '#0070f3',
                                        textDecoration: 'none',
                                        fontSize: '1.1rem',
                                        padding: '1rem 1.5rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        backgroundColor: 'white',
                                        transition: 'all 0.2s'
                                    }}>
                                        新商品候補
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* 売上カテゴリ */}
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>💰</span>
                                <span>売上</span>
                            </h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <li>
                                    <Link href="/import/sales" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        売上CSV取込
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/import/history" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        取込履歴
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* 予算・PLカテゴリ */}
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>📊</span>
                                <span>予算・PL</span>
                            </h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <li>
                                    <Link href="/budget" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        予算設定
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/budget/vs-actual" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        予算 vs 実績
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/pl/monthly" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        月次PL
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/pl/products" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        商品別PL
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* 広告費管理 */}
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>📢</span>
                                <span>広告費管理</span>
                            </h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <li>
                                    <Link href="/ad-expenses" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        広告費管理
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* 設定カテゴリ */}
                        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>⚙️</span>
                                <span>設定</span>
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {/* 左列：よく使う設定 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <Link href="/settings/sales-channels" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        販路マスタ
                                    </Link>
                                    <Link href="/ad-expenses" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        広告カテゴリ設定
                                    </Link>
                                    <Link href="/settings/account" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        アカウント設定
                                    </Link>
                                    {user?.role === 'master' && (
                                        <Link href="/settings/users" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                            ユーザー管理
                                        </Link>
                                    )}
                                </div>
                                {/* 右列：あまり使わない設定 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <Link href="/settings/tax-rates" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                        税率設定
                                    </Link>
                                    {user?.role === 'master' && (
                                        <>
                                            <Link href="/settings/export" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                                データエクスポート
                                            </Link>
                                            <Link href="/settings/import" style={{ display: 'block', color: '#0070f3', textDecoration: 'none', fontSize: '1.1rem', padding: '1rem 1.5rem', border: '1px solid #e5e7eb', borderRadius: '8px', textAlign: 'center', backgroundColor: 'white', transition: 'all 0.2s' }}>
                                                データ復元
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
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

