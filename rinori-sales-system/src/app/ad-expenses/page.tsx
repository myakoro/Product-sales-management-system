"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdExpensesPage() {
    const [month, setMonth] = useState("2025-10");
    const [expenses, setExpenses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [date, setDate] = useState("");
    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [memo, setMemo] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial load
    useEffect(() => {
        fetchCategories();
        // Set date default to today or selected month's 1st day?
        // Default today or start of month.
        setDate(`${month}-01`);
    }, []);

    // Fetch expenses when month changes
    useEffect(() => {
        fetchExpenses();
        // If month changes, update date default to fit in that month
        if (!date.startsWith(month)) {
            setDate(`${month}-01`);
        }
    }, [month]);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/ad-categories?activeOnly=true');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
                if (data.length > 0) setCategoryId(data[0].id);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/ad-expenses?month=${month}`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/ad-expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    amount,
                    categoryId,
                    memo
                })
            });

            if (res.ok) {
                // Clear form
                setAmount("");
                setMemo("");
                // Refresh list
                fetchExpenses();
            } else {
                alert("登録に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="min-h-screen">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold">広告費管理</h1>
                    <Link href="/settings/ad-categories" className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600 hover:bg-gray-200 border border-gray-200">
                        ⚙ カテゴリ設定
                    </Link>
                </div>
                <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                    ダッシュボードへ戻る
                </Link>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: List */}
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">広告費一覧</h2>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">対象月</label>
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <span className="font-semibold text-gray-700">合計金額</span>
                                <span className="text-lg font-bold">¥{totalAmount.toLocaleString()}</span>
                            </div>

                            {loading ? (
                                <div className="p-8 text-center text-gray-500">読み込み中...</div>
                            ) : expenses.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">データがありません</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="px-4 py-2">日付</th>
                                            <th className="px-4 py-2">カテゴリ</th>
                                            <th className="px-4 py-2 text-right">金額</th>
                                            <th className="px-4 py-2">メモ</th>
                                            <th className="px-4 py-2">登録者</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {expenses.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    {new Date(item.expenseDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                                        {item.adCategory.categoryName}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium">
                                                    ¥{item.amount.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2 text-gray-500 truncate max-w-xs" title={item.memo}>
                                                    {item.memo}
                                                </td>
                                                <td className="px-4 py-2 text-xs text-gray-400">
                                                    {item.createdBy.username}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Input Form */}
                    <div>
                        <div className="bg-white rounded shadow border border-gray-200 p-6 sticky top-6">
                            <h2 className="text-lg font-bold mb-4">新規登録</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">発生日 <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">カテゴリ <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded"
                                    >
                                        <option value="">選択してください</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.categoryName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">金額 <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500">¥</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">メモ</label>
                                    <textarea
                                        value={memo}
                                        onChange={(e) => setMemo(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded"
                                        rows={3}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full py-2.5 rounded text-white font-medium shadow-sm
                                        ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-600'}
                                    `}
                                >
                                    {isSubmitting ? '登録中...' : '登録する'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
