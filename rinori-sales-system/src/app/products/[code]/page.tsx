"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ダミーデータ
const dummyProduct = {
    productCode: "RINO-FR010",
    productName: "フレアスカート",
    salesPriceExclTax: 5980,
    costExclTax: 2000,
    productType: "own",
    managementStatus: "managed",
};

export default function EditProductPage({
    params,
}: {
    params: { code: string };
}) {
    const { code } = params;
    const router = useRouter();
    const [formData, setFormData] = useState({
        productCode: "",
        productName: "",
        salesPriceExclTax: 0,
        costExclTax: 0,
        productType: "own",
        managementStatus: "managed",
        asin: "", // V1.51追加
        categoryId: null as number | null, // カテゴリID追加
    });
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Array<{id: number, name: string}>>([]);

    // Initial Fetch
    const fetchProduct = async () => {
        try {
            // URL encoding logic if product code contains special chars?
            // Usually not an issue for typical codes but good practice.
            const res = await fetch(`/api/products/${code}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    productCode: data.productCode,
                    productName: data.productName,
                    salesPriceExclTax: data.salesPriceExclTax,
                    costExclTax: data.costExclTax,
                    productType: data.productType,
                    managementStatus: data.managementStatus,
                    asin: data.asin || "", // V1.51追加
                });
            } else {
                alert("データの取得に失敗しました");
                router.push("/products");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        // Call fetch immediately
        fetchProduct();
        // But need to prevent infinite loop. 
        // Better to use useEffect.
    }

    // カテゴリ一覧取得
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories');
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data);
                }
            } catch (e) {
                console.error('カテゴリ取得エラー:', e);
            }
        };
        fetchCategories();
    }, []);

    // Using useEffect correctly
    useEffect(() => {
        // Need to define async inside useEffect
        const load = async () => {
            try {
                const res = await fetch(`/api/products/${code}`);
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        productCode: data.productCode,
                        productName: data.productName,
                        salesPriceExclTax: data.salesPriceExclTax,
                        costExclTax: data.costExclTax,
                        productType: data.productType,
                        managementStatus: data.managementStatus,
                        asin: data.asin || "", // V1.51追加
                        categoryId: data.categoryId || null, // カテゴリID追加
                    });
                } else {
                    alert("データの取得に失敗しました");
                    router.push("/products");
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, [code]); // Rely on code from use(params)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/products/${code}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                alert("商品情報を更新しました");
                router.push("/products");
            } else {
                const data = await res.json();
                alert(data.error || "更新に失敗しました");
            }
        } catch (err) {
            console.error(err);
            alert("エラーが発生しました");
        }
    };

    const handleDelete = async () => {
        if (!confirm("本当に削除しますか？\n※売上履歴がある商品は削除できません")) return;
        try {
            const res = await fetch(`/api/products/${code}`, {
                method: "DELETE",
            });
            if (res.ok) {
                alert("削除しました");
                router.push("/products");
            } else {
                const data = await res.json();
                alert(data.error || "削除できませんでした");
            }
        } catch (err) {
            console.error(err);
            alert("エラーが発生しました");
        }
    };

    if (loading) return <div className="p-8 text-center">読み込み中...</div>;

    return (
        <div className="min-h-screen bg-neutral-50">
            <header className="bg-rinori-navy border-b-2 border-rinori-gold px-6 py-4 shadow-md">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-white">Rinori 売上管理システム</h1>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="px-4 py-2 text-white hover:text-rinori-gold transition-colors duration-200 font-medium">
                            ダッシュボード
                        </Link>
                        <span className="text-sm text-rinori-cream">ユーザー: 管理者</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <Link href="/products" className="flex items-center gap-2 text-rinori-navy hover:text-rinori-gold transition-colors duration-200 font-medium">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        商品マスタ一覧に戻る
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="text-red-600 border-2 border-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-200"
                    >
                        商品を削除
                    </button>
                </div>

                <h2 className="text-2xl font-bold text-rinori-navy mb-6">商品マスタ編集</h2>

                <form onSubmit={handleSubmit} className="bg-white border-2 border-neutral-200 rounded-lg p-8 shadow-md">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">商品コード</label>
                            <input
                                type="text"
                                disabled
                                value={formData.productCode}
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-neutral-100 text-neutral-500"
                            />
                            <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                商品コードは変更できません
                            </p>
                        </div>

                        <div className="bg-gradient-to-r from-orange-50 to-white border-2 border-orange-200 rounded-lg p-4">
                            <label className="block text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.53.406-3.045.61-4.516.61-2.265 0-4.463-.42-6.588-1.265-2.11-.84-3.987-2.033-5.63-3.582-.22-.21-.304-.433-.247-.663.043-.18.148-.3.314-.36z"/>
                                </svg>
                                ASIN (Amazon)
                            </label>
                            <input
                                type="text"
                                value={formData.asin}
                                onChange={(e) =>
                                    setFormData({ ...formData, asin: e.target.value })
                                }
                                placeholder="例: B07W4B3RGM"
                                className="w-full px-4 py-2.5 border-2 border-orange-300 rounded-md focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                            />
                            <p className="text-xs text-neutral-600 mt-2 flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Amazon売上CSV取込時の紐付けに使用します
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                商品名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.productName}
                                onChange={(e) =>
                                    setFormData({ ...formData, productName: e.target.value })
                                }
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                    販売価格（税別） <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={formData.salesPriceExclTax}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            salesPriceExclTax: Number(e.target.value),
                                        })
                                    }
                                    className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                    原価（税別） <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    value={formData.costExclTax}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            costExclTax: Number(e.target.value),
                                        })
                                    }
                                    className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                カテゴリー
                            </label>
                            <select
                                value={formData.categoryId || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, categoryId: e.target.value ? Number(e.target.value) : null })
                                }
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                            >
                                <option value="">未分類</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                    商品区分 <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.productType}
                                    onChange={(e) =>
                                        setFormData({ ...formData, productType: e.target.value })
                                    }
                                    className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                                >
                                    <option value="own">自社</option>
                                    <option value="purchase">仕入</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                    管理ステータス <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.managementStatus}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            managementStatus: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                                >
                                    <option value="managed">管理中</option>
                                    <option value="unmanaged">管理外</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8 pt-6 border-t-2 border-neutral-200">
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-rinori-navy text-white rounded-md hover:bg-rinori-navy/90 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                        >
                            更新
                        </button>
                        <Link
                            href="/products"
                            className="px-6 py-2.5 border-2 border-neutral-300 rounded-md hover:bg-neutral-50 transition-all duration-200 font-medium inline-flex items-center"
                        >
                            キャンセル
                        </Link>
                    </div>
                </form>
            </main>
        </div>
    );
}
