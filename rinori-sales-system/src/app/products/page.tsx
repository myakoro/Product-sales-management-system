"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Product = {
    productCode: string;
    productName: string;
    salesPriceExclTax: number;
    costExclTax: number;
    productType: string;
    managementStatus: string;
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
    }, [debouncedSearch, typeFilter, statusFilter]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortKey === key && sortDirection === 'asc') {
            direction = 'desc';
        }
        setSortKey(key);
        setSortDirection(direction);
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
        <div className="min-h-screen">
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
                    <h2 className="text-2xl font-semibold">商品マスタ一覧</h2>
                    <Link
                        href="/products/new"
                        className="px-4 py-2 bg-primary text-white rounded hover:opacity-90"
                    >
                        新規登録
                    </Link>
                </div>

                {/* 検索・フィルタエリア */}
                <div className="bg-white border border-gray-200 rounded p-4 mb-4">
                    <div className="grid grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="商品コード・商品名で検索"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded"
                        />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded"
                        >
                            <option value="all">商品区分: すべて</option>
                            <option value="own">自社</option>
                            <option value="purchase">仕入</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded"
                        >
                            <option value="all">ステータス: すべて</option>
                            <option value="managed">管理中</option>
                            <option value="unmanaged">管理外</option>
                        </select>
                    </div>
                </div>

                {/* 商品一覧テーブル */}
                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th
                                    className="px-4 py-3 text-left text-xl font-semibold cursor-pointer"
                                    onClick={() => handleSort('productCode')}
                                >
                                    商品コード
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xl font-semibold cursor-pointer"
                                    onClick={() => handleSort('productName')}
                                >
                                    商品名
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-xl font-semibold cursor-pointer"
                                    onClick={() => handleSort('salesPriceExclTax')}
                                >
                                    販売価格（税別）
                                </th>
                                <th
                                    className="px-4 py-3 text-right text-xl font-semibold cursor-pointer"
                                    onClick={() => handleSort('costExclTax')}
                                >
                                    原価（税別）
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xl font-semibold cursor-pointer"
                                    onClick={() => handleSort('productType')}
                                >
                                    商品区分
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xl font-semibold cursor-pointer"
                                    onClick={() => handleSort('managementStatus')}
                                >
                                    管理ステータス
                                </th>
                                <th
                                    className="px-4 py-3 text-left text-xl font-semibold cursor-pointer"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    登録日
                                </th>
                                <th className="px-4 py-3 text-left text-xl font-semibold">
                                    操作
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">
                                        読み込み中...
                                    </td>
                                </tr>
                            )}
                            {!loading && products.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">
                                        商品が見つかりません。
                                    </td>
                                </tr>
                            )}
                            {!loading && sortedProducts.map((product) => (
                                <tr key={product.productCode} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-xl">{product.productCode}</td>
                                    <td className="px-4 py-3 text-xl">{product.productName}</td>
                                    <td className="px-4 py-3 text-xl text-right">
                                        ¥{product.salesPriceExclTax.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-xl text-right">
                                        ¥{product.costExclTax.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-xl">{product.productType === 'own' ? '自社' : product.productType === 'purchase' ? '仕入' : product.productType}</td>
                                    <td className="px-4 py-3 text-xl">
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${product.managementStatus === "managed"
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {product.managementStatus === 'managed' ? '管理中' : product.managementStatus === 'unmanaged' ? '管理外' : product.managementStatus}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xl">
                                        {new Date(product.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-xl">
                                        <Link
                                            href={`/products/${product.productCode}`}
                                            className="text-primary hover:underline"
                                        >
                                            編集
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    {products.length}件の商品を表示中
                </div>
            </main>
        </div>
    );
}
