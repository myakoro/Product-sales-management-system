'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type Category = {
    id: number;
    name: string;
    displayOrder: number;
    isActive: boolean;
    productCount?: number;
};

type Product = {
    productCode: string;
    productName: string;
    categoryId: number | null;
    categoryName: string | null;
};

type ModalMode = 'create' | 'edit' | null;

export default function CategoriesPage() {
    const { data: session } = useSession();
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
    const [unassignedProducts, setUnassignedProducts] = useState<Product[]>([]);
    const [selectedProductCodes, setSelectedProductCodes] = useState<string[]>([]);
    const [selectedUnassignedCodes, setSelectedUnassignedCodes] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        displayOrder: 0,
        isActive: true
    });

    // カテゴリー一覧を取得
    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories?includeInactive=true');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            alert('カテゴリー一覧の取得に失敗しました。');
        }
    };

    // 所属商品を取得
    const fetchCategoryProducts = async (categoryId: number) => {
        try {
            const res = await fetch(`/api/products?categoryId=${categoryId}`);
            if (res.ok) {
                const data = await res.json();
                setCategoryProducts(data);
            }
        } catch (error) {
            console.error('Failed to fetch category products:', error);
        }
    };

    // 未所属商品を取得
    const fetchUnassignedProducts = async () => {
        try {
            const res = await fetch('/api/products?categoryId=null');
            if (res.ok) {
                const data = await res.json();
                setUnassignedProducts(data);
            }
        } catch (error) {
            console.error('Failed to fetch unassigned products:', error);
        }
    };

    // 初期ロード
    useEffect(() => {
        fetchCategories();
    }, []);

    // カテゴリー選択時
    useEffect(() => {
        if (selectedCategoryId) {
            fetchCategoryProducts(selectedCategoryId);
            fetchUnassignedProducts();
            setSelectedProductCodes([]);
            setSelectedUnassignedCodes([]);
        }
    }, [selectedCategoryId]);

    // カテゴリー作成
    const handleCreateCategory = async () => {
        if (!formData.name.trim()) {
            alert('カテゴリー名を入力してください。');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('カテゴリーを作成しました。');
                setModalMode(null);
                setFormData({ name: '', displayOrder: 0, isActive: true });
                await fetchCategories();
            } else {
                const data = await res.json();
                alert(data.error || 'カテゴリーの作成に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to create category:', error);
            alert('カテゴリーの作成に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    // カテゴリー更新
    const handleUpdateCategory = async () => {
        if (!editingCategory || !formData.name.trim()) {
            alert('カテゴリー名を入力してください。');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/categories/${editingCategory.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('カテゴリーを更新しました。');
                setModalMode(null);
                setEditingCategory(null);
                setFormData({ name: '', displayOrder: 0, isActive: true });
                await fetchCategories();
            } else {
                const data = await res.json();
                alert(data.error || 'カテゴリーの更新に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to update category:', error);
            alert('カテゴリーの更新に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    // カテゴリー削除
    const handleDeleteCategory = async (category: Category) => {
        const confirmMessage = category.productCount
            ? `このカテゴリーには${category.productCount}件の商品が所属しています。削除すると、これらの商品は未分類になります。よろしいですか？`
            : 'このカテゴリーを削除してもよろしいですか？';

        if (!confirm(confirmMessage)) return;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/categories/${category.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('カテゴリーを削除しました。');
                if (selectedCategoryId === category.id) {
                    setSelectedCategoryId(null);
                    setCategoryProducts([]);
                }
                await fetchCategories();
                await fetchUnassignedProducts();
            } else {
                const data = await res.json();
                alert(data.error || 'カテゴリーの削除に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to delete category:', error);
            alert('カテゴリーの削除に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    // 商品を追加
    const handleAddProducts = async () => {
        if (!selectedCategoryId || selectedUnassignedCodes.length === 0) {
            alert('追加する商品を選択してください。');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/categories/${selectedCategoryId}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds: selectedUnassignedCodes })
            });

            if (res.ok) {
                alert('商品を追加しました。');
                setSelectedUnassignedCodes([]);
                await fetchCategoryProducts(selectedCategoryId);
                await fetchUnassignedProducts();
                await fetchCategories();
            } else {
                const data = await res.json();
                alert(data.error || '商品の追加に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to add products:', error);
            alert('商品の追加に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    // 商品を削除（紐付け解除）
    const handleRemoveProducts = async () => {
        if (!selectedCategoryId || selectedProductCodes.length === 0) {
            alert('削除する商品を選択してください。');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/categories/${selectedCategoryId}/products`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds: selectedProductCodes })
            });

            if (res.ok) {
                alert('商品を削除しました。');
                setSelectedProductCodes([]);
                await fetchCategoryProducts(selectedCategoryId);
                await fetchUnassignedProducts();
                await fetchCategories();
            } else {
                const data = await res.json();
                alert(data.error || '商品の削除に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to remove products:', error);
            alert('商品の削除に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    // モーダルを開く
    const openCreateModal = () => {
        setModalMode('create');
        setFormData({ name: '', displayOrder: categories.length + 1, isActive: true });
    };

    const openEditModal = (category: Category) => {
        setModalMode('edit');
        setEditingCategory(category);
        setFormData({
            name: category.name,
            displayOrder: category.displayOrder,
            isActive: category.isActive
        });
    };

    const closeModal = () => {
        setModalMode(null);
        setEditingCategory(null);
        setFormData({ name: '', displayOrder: 0, isActive: true });
    };

    // チェックボックス操作
    const toggleProductSelection = (productCode: string) => {
        setSelectedProductCodes(prev =>
            prev.includes(productCode)
                ? prev.filter(code => code !== productCode)
                : [...prev, productCode]
        );
    };

    const toggleUnassignedSelection = (productCode: string) => {
        setSelectedUnassignedCodes(prev =>
            prev.includes(productCode)
                ? prev.filter(code => code !== productCode)
                : [...prev, productCode]
        );
    };

    const selectedCategory = categories.find(c => c.id === selectedCategoryId);

    return (
        <div className="min-h-screen bg-neutral-50 py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/settings" className="text-neutral-500 hover:text-[#00214d]">
                        ← 設定に戻る
                    </Link>
                    <h1 className="text-3xl font-bold text-[#00214d]">カテゴリー管理</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左側: カテゴリー一覧 */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-[#00214d]">カテゴリー一覧</h2>
                                <button
                                    onClick={openCreateModal}
                                    className="px-4 py-2 bg-[#00214d] text-white rounded-lg hover:bg-[#00337a] transition-colors text-sm font-bold"
                                >
                                    + 新規作成
                                </button>
                            </div>

                            <div className="space-y-2">
                                {categories.length === 0 ? (
                                    <p className="text-neutral-400 text-center py-8">カテゴリーがありません</p>
                                ) : (
                                    categories.map(category => (
                                        <div
                                            key={category.id}
                                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                                selectedCategoryId === category.id
                                                    ? 'bg-[#00214d] text-white border-[#00214d]'
                                                    : 'bg-white border-neutral-200 hover:border-[#d4af37]'
                                            }`}
                                            onClick={() => setSelectedCategoryId(category.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-bold">{category.name}</div>
                                                    <div className={`text-sm ${selectedCategoryId === category.id ? 'text-neutral-200' : 'text-neutral-500'}`}>
                                                        {category.productCount || 0}件の商品
                                                        {!category.isActive && ' (無効)'}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => openEditModal(category)}
                                                        className={`px-2 py-1 rounded text-xs ${
                                                            selectedCategoryId === category.id
                                                                ? 'bg-white text-[#00214d] hover:bg-neutral-100'
                                                                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                                        }`}
                                                    >
                                                        編集
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(category)}
                                                        className={`px-2 py-1 rounded text-xs ${
                                                            selectedCategoryId === category.id
                                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                                                        }`}
                                                    >
                                                        削除
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 右側: 所属商品と未所属商品 */}
                    <div className="lg:col-span-2">
                        {!selectedCategory ? (
                            <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-12 text-center">
                                <p className="text-neutral-400 text-lg">カテゴリーを選択してください</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* 所属商品 */}
                                <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-[#00214d]">
                                            所属商品 ({categoryProducts.length}件)
                                        </h3>
                                        {selectedProductCodes.length > 0 && (
                                            <button
                                                onClick={handleRemoveProducts}
                                                disabled={isLoading}
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-bold disabled:opacity-50"
                                            >
                                                選択を解除 ({selectedProductCodes.length}件)
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-96 overflow-y-auto border border-neutral-200 rounded-lg">
                                        {categoryProducts.length === 0 ? (
                                            <p className="text-neutral-400 text-center py-8">所属商品がありません</p>
                                        ) : (
                                            <div className="divide-y divide-neutral-200">
                                                {categoryProducts.map(product => (
                                                    <label
                                                        key={product.productCode}
                                                        className="flex items-center gap-3 p-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProductCodes.includes(product.productCode)}
                                                            onChange={() => toggleProductSelection(product.productCode)}
                                                            className="w-4 h-4 text-[#00214d] focus:ring-[#d4af37] rounded"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-neutral-900">{product.productName}</div>
                                                            <div className="text-sm text-neutral-500">{product.productCode}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 未所属商品 */}
                                <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-[#00214d]">
                                            未所属商品 ({unassignedProducts.length}件)
                                        </h3>
                                        {selectedUnassignedCodes.length > 0 && (
                                            <button
                                                onClick={handleAddProducts}
                                                disabled={isLoading}
                                                className="px-4 py-2 bg-[#00214d] text-white rounded-lg hover:bg-[#00337a] transition-colors text-sm font-bold disabled:opacity-50"
                                            >
                                                選択した商品を追加 ({selectedUnassignedCodes.length}件)
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-96 overflow-y-auto border border-neutral-200 rounded-lg">
                                        {unassignedProducts.length === 0 ? (
                                            <p className="text-neutral-400 text-center py-8">未所属商品がありません</p>
                                        ) : (
                                            <div className="divide-y divide-neutral-200">
                                                {unassignedProducts.map(product => (
                                                    <label
                                                        key={product.productCode}
                                                        className="flex items-center gap-3 p-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUnassignedCodes.includes(product.productCode)}
                                                            onChange={() => toggleUnassignedSelection(product.productCode)}
                                                            className="w-4 h-4 text-[#00214d] focus:ring-[#d4af37] rounded"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-neutral-900">{product.productName}</div>
                                                            <div className="text-sm text-neutral-500">{product.productCode}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* モーダル */}
            {modalMode && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-[#00214d] mb-6">
                            {modalMode === 'create' ? 'カテゴリー作成' : 'カテゴリー編集'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    カテゴリー名 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none"
                                    placeholder="例: フリーズドライ"
                                    maxLength={50}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    表示順序
                                </label>
                                <input
                                    type="number"
                                    value={formData.displayOrder}
                                    onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none"
                                    min={0}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-[#00214d] focus:ring-[#d4af37] rounded"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-neutral-700">
                                    有効
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeModal}
                                className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-bold"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={modalMode === 'create' ? handleCreateCategory : handleUpdateCategory}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-[#00214d] text-white rounded-lg hover:bg-[#00337a] transition-colors font-bold disabled:opacity-50"
                            >
                                {isLoading ? '処理中...' : modalMode === 'create' ? '作成' : '更新'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
