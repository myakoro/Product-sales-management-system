"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Papa from "papaparse";

type Product = {
    productCode: string;
    productName: string;
    asin: string | null;
    salesPriceExclTax: number;
    costExclTax: number;
    productType: string;
    managementStatus: string;
    categoryName: string | null;
    createdAt: string;
};

// 商品コードの並び順を制御するための優先度関数
// RINO-FR 系 → RINOBG → RINO-SY → その他 の順に優先
function getProductCodePriority(code: string): number {
    if (code.startsWith('RINO-FR')) return 1;
    if (code.startsWith('RINOBG')) return 2;
    if (code.startsWith('RINO-SY')) return 3;
    return 4;
}

type SortKey = keyof Product;

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");

    // Categories
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

    const [sortKey, setSortKey] = useState<SortKey>('productCode');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (typeFilter !== 'all') params.set('type', typeFilter);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (categoryFilter !== 'all') {
                if (categoryFilter === 'unclassified') {
                    params.set('categoryId', 'unclassified');
                } else {
                    params.set('categoryId', categoryFilter);
                }
            }

            const res = await fetch(`/api/products?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [debouncedSearch, typeFilter, statusFilter, categoryFilter]);

    // Fetch categories on mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data);
                }
            } catch (error) {
                console.error('Failed to fetch categories', error);
            }
        };
        fetchCategories();
    }, []);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortKey === key && sortDirection === 'asc') {
            direction = 'desc';
        }
        setSortKey(key);
        setSortDirection(direction);
    };

    // CSV出力関数
    const handleExportCSV = () => {
        if (sortedProducts.length === 0) {
            alert('出力する商品がありません。');
            return;
        }

        // フィルタ済みの商品リストをCSV形式に変換
        const csvData = sortedProducts.map(product => ({
            'コード': product.productCode,
            '名称': product.productName,
            'ASIN': product.asin || '',
            '販売価格（税別）': product.salesPriceExclTax,
            '原価（税別）': product.costExclTax,
            '商品区分': product.productType === 'own' ? '自社' : product.productType === 'purchase' ? '仕入' : product.productType,
            '管理ステータス': product.managementStatus === 'managed' ? '管理中' : product.managementStatus === 'unmanaged' ? '管理外' : product.managementStatus,
            'カテゴリー': product.categoryName || '未分類'
        }));

        // papaparseでCSV生成
        const csv = Papa.unparse(csvData, {
            header: true
        });

        // BOM付きUTF-8で出力
        const bom = '\uFEFF';
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

        // ファイル名生成（rinori_products_YYYYMMDD.csv）
        const today = new Date();
        const dateStr = today.getFullYear() +
            String(today.getMonth() + 1).padStart(2, '0') +
            String(today.getDate()).padStart(2, '0');
        const filename = `rinori_products_${dateStr}.csv`;

        // ダウンロード
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const sortedProducts = [...products].sort((a, b) => {
        if (sortKey === 'productCode') {
            const pa = getProductCodePriority(a.productCode);
            const pb = getProductCodePriority(b.productCode);
            if (pa !== pb) {
                return sortDirection === 'asc' ? pa - pb : pb - pa;
            }
            const comp = a.productCode.localeCompare(b.productCode);
            return sortDirection === 'asc' ? comp : -comp;
        }

        const av = a[sortKey];
        const bv = b[sortKey];

        if (typeof av === 'number' && typeof bv === 'number') {
            return sortDirection === 'asc' ? av - bv : bv - av;
        }

        const sa = String(av);
        const sb = String(bv);
        const comp = sa.localeCompare(sb);
        return sortDirection === 'asc' ? comp : -comp;
    });

    return (
        <div className="min-h-screen bg-neutral-50">
            <header className="bg-rinori-navy border-b-2 border-rinori-gold px-6 py-4 shadow-md">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-white">Rinori 売上管理システム</h1>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="px-4 py-2 text-white hover:text-rinori-gold transition-colors duration-200 font-medium">
                            ダッシュボード
                        </Link>
                        <span className="text-sm text-rinori-cream">ユーザー: 管理者</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-rinori-navy">商品マスタ一覧</h2>
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportCSV}
                            disabled={sortedProducts.length === 0}
                            className="px-5 py-2.5 bg-rinori-gold text-rinori-navy rounded-md hover:bg-rinori-gold/90 shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            CSV出力
                        </button>
                        <Link
                            href="/products/new"
                            className="px-5 py-2.5 bg-rinori-navy text-white rounded-md hover:bg-rinori-navy/90 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                        >
                            新規登録
                        </Link>
                    </div>
                </div>

                {/* 検索・フィルタエリア */}
                <div className="bg-white border-2 border-neutral-200 rounded-lg p-6 mb-6 shadow-sm">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="商品コード・商品名・ASINで検索"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                        >
                            <option value="all">商品区分: すべて</option>
                            <option value="own">自社</option>
                            <option value="purchase">仕入</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                        >
                            <option value="all">ステータス: すべて</option>
                            <option value="managed">管理中</option>
                            <option value="unmanaged">管理外</option>
                        </select>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                        >
                            <option value="all">カテゴリー: すべて</option>
                            <option value="unclassified">未分類</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 商品一覧テーブル */}
                <div className="bg-white border-2 border-neutral-200 rounded-lg overflow-hidden shadow-md">
                    <table className="w-full">
                        <thead className="bg-rinori-navy text-white">
                            <tr>
                                <th
                                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-rinori-navy/90 transition-colors"
                                    onClick={() => handleSort('productCode')}
                                >
                                    <div className="flex items-center gap-2">
                                        商品コード
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-rinori-navy/90 transition-colors"
                                    onClick={() => handleSort('productName')}
                                >
                                    <div className="flex items-center gap-2">
                                        商品名
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-rinori-navy/90 transition-colors"
                                    onClick={() => handleSort('categoryName')}
                                >
                                    <div className="flex items-center gap-2">
                                        カテゴリー
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-rinori-navy/90 transition-colors"
                                    onClick={() => handleSort('salesPriceExclTax')}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        販売価格（税別）
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-sm font-semibold cursor-pointer hover:bg-rinori-navy/90 transition-colors"
                                    onClick={() => handleSort('costExclTax')}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        原価（税別）
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-rinori-navy/90 transition-colors"
                                    onClick={() => handleSort('productType')}
                                >
                                    <div className="flex items-center gap-2">
                                        商品区分
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-rinori-navy/90 transition-colors"
                                    onClick={() => handleSort('managementStatus')}
                                >
                                    <div className="flex items-center gap-2">
                                        管理ステータス
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-rinori-navy/90 transition-colors"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    <div className="flex items-center gap-2">
                                        登録日
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                        </svg>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    操作
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {loading && (
                                <tr>
                                    <td colSpan={9} className="text-center py-12">
                                        <svg className="animate-spin h-8 w-8 text-rinori-navy mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <p className="text-neutral-500">読み込み中...</p>
                                    </td>
                                </tr>
                            )}
                            {!loading && products.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center py-12">
                                        <svg className="w-16 h-16 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <p className="text-neutral-500">商品が見つかりません。</p>
                                    </td>
                                </tr>
                            )}
                            {!loading && sortedProducts.map((product) => (
                                <tr key={product.productCode} className="hover:bg-rinori-cream/30 transition-colors">
                                    <td className="px-4 py-3 text-sm font-mono text-neutral-700">{product.productCode}</td>
                                    <td className="px-4 py-3 text-sm text-neutral-700">{product.productName}</td>
                                    <td className="px-4 py-3 text-sm text-neutral-700">
                                        {product.categoryName ? (
                                            <span className="px-2 py-1 bg-rinori-gold/10 text-rinori-navy rounded text-xs font-medium">
                                                {product.categoryName}
                                            </span>
                                        ) : (
                                            <span className="text-neutral-400 text-xs">未分類</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-neutral-700">
                                        ¥{product.salesPriceExclTax.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-medium text-neutral-700">
                                        ¥{product.costExclTax.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-700">{product.productType === 'own' ? '自社' : product.productType === 'purchase' ? '仕入' : product.productType}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium border ${product.managementStatus === "managed"
                                                ? "bg-rinori-gold/20 text-rinori-navy border-rinori-gold"
                                                : "bg-neutral-100 text-neutral-700 border-neutral-300"
                                                }`}
                                        >
                                            {product.managementStatus === 'managed' ? '管理中' : product.managementStatus === 'unmanaged' ? '管理外' : product.managementStatus}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-600">
                                        {new Date(product.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <Link
                                            href={`/products/${product.productCode}`}
                                            className="text-rinori-navy hover:text-rinori-gold font-medium transition-colors duration-200"
                                        >
                                            編集
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 px-4 py-3 bg-neutral-100 rounded-lg border border-neutral-200">
                    <p className="text-sm text-neutral-700">
                        <span className="font-semibold text-rinori-navy">{products.length}件</span>の商品を表示中
                    </p>
                </div>
            </main>
        </div>
    );
}
