"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type AdCategory = {
    id: number;
    categoryName: string;
};

type AdExpense = {
    id: number;
    expenseDate: string;
    amount: number;
    adCategoryId: number;
    memo?: string;
    adCategory?: AdCategory;
};

export default function AdExpensesPage() {
    const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');

    // Data State
    const [categories, setCategories] = useState<AdCategory[]>([]);
    const [expenses, setExpenses] = useState<AdExpense[]>([]);

    // Filter State
    const [targetYm, setTargetYm] = useState("2025-10");

    // Loading State
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Initial Load
    useEffect(() => {
        fetchCategories();
    }, []);

    // Load expenses when tab or date changes
    useEffect(() => {
        if (activeTab === 'expenses') {
            fetchExpenses();
        }
    }, [activeTab, targetYm]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/ad-categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/ad-expenses?startYm=${targetYm}&endYm=${targetYm}`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data);
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: '広告費の取得に失敗しました' });
        } finally {
            setLoading(false);
        }
    };

    // --- Category Management ---
    const [newCategoryName, setNewCategoryName] = useState("");

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const res = await fetch('/api/ad-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName: newCategoryName })
            });
            if (res.ok) {
                setNewCategoryName("");
                fetchCategories();
                setMessage({ type: 'success', text: 'カテゴリを追加しました' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'カテゴリ追加に失敗しました' });
        }
    };

    const handleUpdateCategory = async (id: number, name: string) => {
        try {
            await fetch(`/api/ad-categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName: name })
            });
            fetchCategories();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('このカテゴリを削除しますか？')) return;
        try {
            const res = await fetch(`/api/ad-categories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCategories();
                setMessage({ type: 'success', text: 'カテゴリを削除しました' });
            } else {
                const json = await res.json();
                setMessage({ type: 'error', text: json.error || '削除できませんでした' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '削除に失敗しました' });
        }
    };

    // --- Expense Management ---
    const [newExpense, setNewExpense] = useState({
        date: "",
        amount: "",
        categoryId: "",
        memo: ""
    });

    const handleAddExpense = async () => {
        if (!newExpense.date || !newExpense.amount || !newExpense.categoryId) {
            setMessage({ type: 'error', text: '必須項目を入力してください' });
            return;
        }

        try {
            const res = await fetch('/api/ad-expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expenseDate: newExpense.date,
                    amount: newExpense.amount,
                    adCategoryId: newExpense.categoryId,
                    memo: newExpense.memo
                })
            });

            if (res.ok) {
                setNewExpense({ date: "", amount: "", categoryId: "", memo: "" });
                fetchExpenses();
                setMessage({ type: 'success', text: '広告費を登録しました' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: '登録に失敗しました' });
        }
    };

    const handleDeleteExpense = async (id: number) => {
        if (!confirm('このデータを削除しますか？')) return;
        try {
            await fetch(`/api/ad-expenses/${id}`, { method: 'DELETE' });
            fetchExpenses();
            setMessage({ type: 'success', text: '削除しました' });
        } catch (error) {
            setMessage({ type: 'error', text: '削除に失敗しました' });
        }
    };

    // Inline Editing for Expenses (Simplified: Blur to save)
    const handleUpdateExpense = async (id: number, field: string, value: any) => {
        try {
            await fetch(`/api/ad-expenses/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
            // Ideally update local state optimistically, but re-fetching for simplicity
            fetchExpenses();
        } catch (error) {
            console.error(error);
        }
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
                <h2 className="text-2xl font-semibold mb-6">広告費管理</h2>

                {message && (
                    <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-200 mb-6">
                    <button
                        className={`px-4 py-2 border-b-2 font-medium ${activeTab === 'expenses' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('expenses')}
                    >
                        広告費一覧
                    </button>
                    <button
                        className={`px-4 py-2 border-b-2 font-medium ${activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('categories')}
                    >
                        カテゴリ管理
                    </button>
                </div>

                {activeTab === 'expenses' && (
                    <div>
                        <div className="bg-white border border-gray-200 rounded p-4 mb-4 flex items-center gap-4">
                            <label className="text-sm font-medium">対象月</label>
                            <input
                                type="month"
                                value={targetYm}
                                onChange={(e) => setTargetYm(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>

                        <div className="bg-white border border-gray-200 rounded overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-40">日付</th>
                                        <th className="px-4 py-3 text-right w-40">金額</th>
                                        <th className="px-4 py-3 text-left w-48">カテゴリ</th>
                                        <th className="px-4 py-3 text-left">メモ</th>
                                        <th className="px-4 py-3 w-20">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {expenses.map((exp) => (
                                        <tr key={exp.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <input
                                                    type="date"
                                                    defaultValue={exp.expenseDate.split('T')[0]}
                                                    onBlur={(e) => handleUpdateExpense(exp.id, 'expenseDate', e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary rounded px-1"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <input
                                                    type="number"
                                                    defaultValue={exp.amount}
                                                    onBlur={(e) => handleUpdateExpense(exp.id, 'amount', e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary rounded px-1 text-right"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <select
                                                    defaultValue={exp.adCategoryId}
                                                    onChange={(e) => handleUpdateExpense(exp.id, 'adCategoryId', e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary rounded px-1"
                                                >
                                                    {categories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.categoryName}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    defaultValue={exp.memo || ""}
                                                    onBlur={(e) => handleUpdateExpense(exp.id, 'memo', e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary rounded px-1"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <button
                                                    onClick={() => handleDeleteExpense(exp.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                >
                                                    削除
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {/* New Entry Row */}
                                    <tr className="bg-blue-50">
                                        <td className="px-4 py-2">
                                            <input
                                                type="date"
                                                value={newExpense.date}
                                                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                                className="w-full border border-gray-300 rounded px-2 py-1"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                placeholder="金額"
                                                value={newExpense.amount}
                                                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-right"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                value={newExpense.categoryId}
                                                onChange={(e) => setNewExpense({ ...newExpense, categoryId: e.target.value })}
                                                className="w-full border border-gray-300 rounded px-2 py-1"
                                            >
                                                <option value="">カテゴリ選択</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.categoryName}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                placeholder="メモ"
                                                value={newExpense.memo}
                                                onChange={(e) => setNewExpense({ ...newExpense, memo: e.target.value })}
                                                className="w-full border border-gray-300 rounded px-2 py-1"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                onClick={handleAddExpense}
                                                className="px-3 py-1 bg-primary text-white rounded text-xs hover:opacity-90"
                                            >
                                                保存
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="max-w-2xl">
                        <div className="bg-white border border-gray-200 rounded overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left">カテゴリ名</th>
                                        <th className="px-4 py-3 w-20">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {categories.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <input
                                                    type="text"
                                                    defaultValue={cat.categoryName}
                                                    onBlur={(e) => handleUpdateCategory(cat.id, e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary rounded px-1"
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                >
                                                    削除
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {/* New Category Row */}
                                    <tr className="bg-blue-50">
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                placeholder="新しいカテゴリを作成"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                className="w-full border border-gray-300 rounded px-2 py-1"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <button
                                                onClick={handleAddCategory}
                                                className="px-3 py-1 bg-primary text-white rounded text-xs hover:opacity-90"
                                            >
                                                保存
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
