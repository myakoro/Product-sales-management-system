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
    });
    const [loading, setLoading] = useState(true);

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

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <Link href="/products" className="text-primary hover:underline">
                        ← 商品マスタ一覧に戻る
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded text-sm"
                    >
                        商品を削除
                    </button>
                </div>

                <h2 className="text-2xl font-semibold mb-6">商品マスタ編集</h2>

                <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded p-6">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">商品コード</label>
                            <input
                                type="text"
                                disabled
                                value={formData.productCode}
                                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                商品コードは変更できません
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                商品名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.productName}
                                onChange={(e) =>
                                    setFormData({ ...formData, productName: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    商品区分 <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.productType}
                                    onChange={(e) =>
                                        setFormData({ ...formData, productType: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                >
                                    <option value="own">自社</option>
                                    <option value="purchase">仕入</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                >
                                    <option value="managed">管理中</option>
                                    <option value="unmanaged">管理外</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-primary text-white rounded hover:opacity-90"
                        >
                            更新
                        </button>
                        <Link
                            href="/products"
                            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            キャンセル
                        </Link>
                    </div>
                </form>
            </main>
        </div>
    );
}
