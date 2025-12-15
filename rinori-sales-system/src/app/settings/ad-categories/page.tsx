"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AdCategory = {
    id: number;
    categoryName: string;
    isActive: boolean;
};

export default function AdCategorySettingsPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<AdCategory[]>([]);
    const [loading, setLoading] = useState(false);

    // Add Form
    const [newName, setNewName] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ad-categories'); // Fetch all (active and inactive)
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setIsAdding(true);

        try {
            const res = await fetch('/api/ad-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName: newName })
            });

            if (res.ok) {
                setNewName("");
                fetchCategories();
            } else {
                alert("追加に失敗しました");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsAdding(false);
        }
    };

    const startEdit = (cat: AdCategory) => {
        setEditingId(cat.id);
        setEditName(cat.categoryName);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
    };

    const handleUpdate = async () => {
        if (!editingId || !editName.trim()) return;

        try {
            const res = await fetch('/api/ad-categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingId, categoryName: editName })
            });

            if (res.ok) {
                setEditingId(null);
                fetchCategories();
            } else {
                alert("更新に失敗しました");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        const action = newStatus ? "有効化" : "無効化";

        if (!confirm(`このカテゴリを${action}しますか？`)) return;

        try {
            const res = await fetch('/api/ad-categories', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: newStatus })
            });

            if (res.ok) {
                fetchCategories();
            } else {
                const data = await res.json();
                alert(data.error || `${action}に失敗しました`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <h1 className="text-lg font-semibold">広告費カテゴリ設定</h1>
                <Link href="/ad-expenses" className="text-sm text-gray-600 hover:text-primary">
                    広告費管理へ戻る
                </Link>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="bg-white p-6 rounded shadow border border-gray-200 mb-8">
                    <h2 className="text-md font-bold mb-4">新規カテゴリ追加</h2>
                    <form onSubmit={handleAdd} className="flex gap-4">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="カテゴリ名 (例: Google広告, SNS広告)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isAdding}
                            className={`px-6 py-2 rounded text-white font-medium
                                ${isAdding ? 'bg-gray-400' : 'bg-primary hover:bg-blue-600'}
                            `}
                        >
                            追加
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <h2 className="font-semibold text-gray-700">登録済みカテゴリ一覧</h2>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">読み込み中...</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-6 py-3 w-20">ID</th>
                                    <th className="px-6 py-3">カテゴリ名</th>
                                    <th className="px-6 py-3 w-24 text-center">状態</th>
                                    <th className="px-6 py-3 w-48 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {categories.map((cat) => (
                                    <tr key={cat.id} className={`hover:bg-gray-50 ${!cat.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                                        <td className="px-6 py-4 text-gray-500">{cat.id}</td>
                                        <td className="px-6 py-4">
                                            {editingId === cat.id ? (
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="font-medium text-gray-800">{cat.categoryName}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${cat.isActive
                                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}>
                                                {cat.isActive ? '有効' : '無効'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {editingId === cat.id ? (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={handleUpdate}
                                                        className="text-green-600 hover:text-green-800 font-medium"
                                                    >
                                                        保存
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="text-gray-500 hover:text-gray-700"
                                                    >
                                                        キャンセル
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-center gap-4">
                                                    <button
                                                        onClick={() => startEdit(cat)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        編集
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(cat.id, cat.isActive)}
                                                        className={cat.isActive ? "text-orange-500 hover:text-orange-700" : "text-green-600 hover:text-green-800"}
                                                    >
                                                        {cat.isActive ? '無効化' : '有効化'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                                            カテゴリが登録されていません
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
