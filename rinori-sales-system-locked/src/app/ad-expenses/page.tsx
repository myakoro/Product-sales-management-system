"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DateNavigator from "@/components/DateNavigator";

// Types
type AdCategory = {
    id: number;
    categoryName: string;
    isActive: boolean;
};

type Expense = {
    id: number;
    expenseDate: string;
    amount: number;
    memo: string | null;
    adCategoryId: number;
    adCategory: { categoryName: string };
    createdBy: { username: string };
};

type AdBudget = {
    id: number;
    periodYm: string;
    adCategoryId: number;
    amount: number;
    adCategory: { categoryName: string };
};

type BudgetSummary = {
    totalBudget: number;
    totalActual: number;
    remaining: number;
};

function AdExpensesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const initialTab = tabParam === 'categories' ? 'categories' : tabParam === 'budget' ? 'budget' : 'expenses';
    const [activeTab, setActiveTab] = useState<'expenses' | 'categories' | 'budget'>(initialTab);
    const [userRole, setUserRole] = useState<string>('');

    // --- Expenses Tab State ---
    const [month, setMonth] = useState("2025-10");
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseLoading, setExpenseLoading] = useState(false);

    // Form state
    const [date, setDate] = useState("");
    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [memo, setMemo] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editDate, setEditDate] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const [editCategoryId, setEditCategoryId] = useState("");
    const [editMemo, setEditMemo] = useState("");

    // --- Categories Tab State ---
    const [categories, setCategories] = useState<AdCategory[]>([]); // used for both tabs
    const [activeCategories, setActiveCategories] = useState<AdCategory[]>([]); // filtered for expense input
    const [categoryLoading, setCategoryLoading] = useState(false);

    // Category Add Form
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    // Category Edit State
    const [catEditingId, setCatEditingId] = useState<number | null>(null);
    const [catEditName, setCatEditName] = useState("");

    // --- Budget Tab State ---
    const [budgetMonth, setBudgetMonth] = useState("2025-10");
    const [budgets, setBudgets] = useState<AdBudget[]>([]);
    const [budgetInputs, setBudgetInputs] = useState<{ [categoryId: number]: string }>({});
    const [budgetLoading, setBudgetLoading] = useState(false);
    const [isSavingBudget, setIsSavingBudget] = useState(false);

    // --- Budget Summary State ---
    const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);

    // --- Initial Load ---
    useEffect(() => {
        fetchCategories();
        fetchUserRole();
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);
        setMonth(currentMonth);
        setBudgetMonth(currentMonth);
        if (month === currentMonth) {
            setDate(today.toISOString().slice(0, 10));
        } else {
            setDate(`${month}-01`);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'expenses') {
            fetchExpenses();
            fetchBudgetSummary();
            const today = new Date();
            const currentMonth = today.toISOString().slice(0, 7);

            if (month === currentMonth) {
                setDate(today.toISOString().slice(0, 10));
            } else if (!date.startsWith(month)) {
                setDate(`${month}-01`);
            }
        } else if (activeTab === 'categories') {
            fetchCategories();
        } else if (activeTab === 'budget') {
            fetchBudgets();
        }
    }, [month, activeTab, budgetMonth]);

    // --- API Calls ---

    const fetchCategories = async () => {
        setCategoryLoading(true);
        try {
            const res = await fetch('/api/ad-categories'); // Fetch all
            if (res.ok) {
                const data: AdCategory[] = await res.json();
                setCategories(data);
                setActiveCategories(data.filter(c => c.isActive));

                // Set default category for expense input
                if (data.filter(c => c.isActive).length > 0 && !categoryId) {
                    setCategoryId(String(data.filter(c => c.isActive)[0].id));
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCategoryLoading(false);
        }
    };

    const fetchUserRole = async () => {
        try {
            const res = await fetch('/api/auth/session');
            if (res.ok) {
                const session = await res.json();
                setUserRole(session?.user?.role || '');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchExpenses = async () => {
        setExpenseLoading(true);
        try {
            const res = await fetch(`/api/ad-expenses?month=${month}`);
            if (res.ok) {
                const data = await res.json();
                setExpenses(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setExpenseLoading(false);
        }
    };

    const fetchBudgets = async () => {
        setBudgetLoading(true);
        try {
            const res = await fetch(`/api/ad-budgets?periodYm=${budgetMonth}`);
            if (res.ok) {
                const data: AdBudget[] = await res.json();
                setBudgets(data);
                
                const inputs: { [categoryId: number]: string } = {};
                data.forEach(b => {
                    inputs[b.adCategoryId] = String(b.amount);
                });
                
                activeCategories.forEach(cat => {
                    if (!inputs[cat.id]) {
                        inputs[cat.id] = '0';
                    }
                });
                
                setBudgetInputs(inputs);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setBudgetLoading(false);
        }
    };

    const fetchBudgetSummary = async () => {
        try {
            const budgetRes = await fetch(`/api/ad-budgets?periodYm=${month}`);
            let totalBudget = 0;
            if (budgetRes.ok) {
                const budgetData: AdBudget[] = await budgetRes.json();
                totalBudget = budgetData.reduce((sum, b) => sum + b.amount, 0);
            }

            const expenseRes = await fetch(`/api/ad-expenses?month=${month}`);
            let totalActual = 0;
            if (expenseRes.ok) {
                const expenseData: Expense[] = await expenseRes.json();
                totalActual = expenseData.reduce((sum, e) => sum + e.amount, 0);
            }

            setBudgetSummary({
                totalBudget,
                totalActual,
                remaining: totalBudget - totalActual
            });
        } catch (e) {
            console.error(e);
        }
    };

    // --- Expense Handlers ---

    const handleExpenseSubmit = async (e: React.FormEvent) => {
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
                setAmount("");
                setMemo("");
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

    const startEditExpense = (expense: any) => {
        setEditingId(expense.id);
        setEditDate(expense.expenseDate.split('T')[0]);
        setEditAmount(String(expense.amount));
        setEditCategoryId(String(expense.adCategoryId));
        setEditMemo(expense.memo || "");
    };

    const cancelEditExpense = () => {
        setEditingId(null);
        setEditDate("");
        setEditAmount("");
        setEditCategoryId("");
        setEditMemo("");
    };

    const handleUpdateExpense = async () => {
        if (!editingId) return;

        try {
            const res = await fetch('/api/ad-expenses', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingId,
                    date: editDate,
                    amount: Number(editAmount),
                    categoryId: Number(editCategoryId),
                    memo: editMemo
                })
            });

            if (res.ok) {
                cancelEditExpense();
                fetchExpenses();
            } else {
                alert("更新に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        }
    };

    const handleDeleteExpense = async (id: number) => {
        if (!confirm('この広告費を削除しますか？')) return;

        try {
            const res = await fetch(`/api/ad-expenses?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchExpenses();
            } else {
                alert("削除に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        }
    };

    // --- Category Handlers ---

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsAddingCategory(true);

        try {
            const res = await fetch('/api/ad-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName: newCategoryName })
            });

            if (res.ok) {
                setNewCategoryName("");
                fetchCategories();
            } else {
                alert("追加に失敗しました");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsAddingCategory(false);
        }
    };

    const startEditCategory = (cat: AdCategory) => {
        setCatEditingId(cat.id);
        setCatEditName(cat.categoryName);
    };

    const cancelEditCategory = () => {
        setCatEditingId(null);
        setCatEditName("");
    };

    const handleUpdateCategory = async () => {
        if (!catEditingId || !catEditName.trim()) return;

        try {
            const res = await fetch('/api/ad-categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: catEditingId, categoryName: catEditName })
            });

            if (res.ok) {
                setCatEditingId(null);
                fetchCategories();
            } else {
                alert("更新に失敗しました");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggleCategoryActive = async (id: number, currentStatus: boolean) => {
        const action = currentStatus ? '無効化' : '有効化';
        if (!confirm(`このカテゴリを${action}しますか？`)) return;

        try {
            const res = await fetch('/api/ad-categories', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !currentStatus })
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

    // --- Budget Handlers ---

    const handleBudgetInputChange = (categoryId: number, value: string) => {
        setBudgetInputs(prev => ({
            ...prev,
            [categoryId]: value
        }));
    };

    const handleSaveBudgets = async () => {
        if (isSavingBudget) return;
        setIsSavingBudget(true);

        try {
            const budgetsToSave = activeCategories.map(cat => ({
                categoryId: cat.id,
                amount: Number(budgetInputs[cat.id] || 0)
            }));

            const res = await fetch('/api/ad-budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    periodYm: budgetMonth,
                    budgets: budgetsToSave
                })
            });

            if (res.ok) {
                alert('予算を保存しました');
                fetchBudgets();
            } else {
                const data = await res.json();
                alert(data.error || '予算の保存に失敗しました');
            }
        } catch (e) {
            console.error(e);
            alert('エラーが発生しました');
        } finally {
            setIsSavingBudget(false);
        }
    };

    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="min-h-screen">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold">広告費管理</h1>
                    {/* Tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('expenses')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'expenses'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📋 広告リスト
                        </button>
                        {userRole === 'master' && (
                            <button
                                onClick={() => setActiveTab('budget')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'budget'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                💰 予算設定
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'categories'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            ⚙️ カテゴリ管理
                        </button>
                    </div>
                </div>
                <Link href="/" className="text-lg text-gray-600 hover:text-primary">
                    ダッシュボードへ戻る
                </Link>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {activeTab === 'expenses' ? (
                    // --- Expenses Tab Content ---
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Left Column: List */}
                        <div className="md:col-span-2">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">広告費一覧</h2>
                                <div className="flex items-center gap-2">
                                    <DateNavigator
                                        date={month}
                                        onChange={setMonth}
                                        label="対象月"
                                    />
                                </div>
                            </div>

                            {/* Budget Summary Panel */}
                            {budgetSummary && (
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
                                        <div className="text-sm text-blue-600 font-medium mb-1">月間予算</div>
                                        <div className="text-2xl font-bold text-blue-900">¥{budgetSummary.totalBudget.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
                                        <div className="text-sm text-green-600 font-medium mb-1">実績合計</div>
                                        <div className="text-2xl font-bold text-green-900">¥{budgetSummary.totalActual.toLocaleString()}</div>
                                    </div>
                                    <div className={`bg-gradient-to-br rounded-lg p-4 border-2 ${budgetSummary.remaining >= 0 ? 'from-purple-50 to-purple-100 border-purple-200' : 'from-red-50 to-red-100 border-red-200'}`}>
                                        <div className={`text-sm font-medium mb-1 ${budgetSummary.remaining >= 0 ? 'text-purple-600' : 'text-red-600'}`}>予算残高</div>
                                        <div className={`text-2xl font-bold ${budgetSummary.remaining >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                                            ¥{budgetSummary.remaining.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                    <span className="font-semibold text-gray-700 text-lg">合計金額</span>
                                    <span className="text-xl font-bold">¥{totalAmount.toLocaleString()}</span>
                                </div>

                                {expenseLoading ? (
                                    <div className="p-8 text-center text-gray-500 text-lg">読み込み中...</div>
                                ) : expenses.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-lg">データがありません</div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="px-4 py-2 text-lg">日付</th>
                                                <th className="px-4 py-2 text-lg">カテゴリ</th>
                                                <th className="px-4 py-2 text-right text-lg">金額</th>
                                                <th className="px-4 py-2 text-lg">メモ</th>
                                                <th className="px-4 py-2 text-lg">登録者</th>
                                                <th className="px-4 py-2 text-center text-lg">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {expenses.map((exp) => (
                                                <tr key={exp.id} className="hover:bg-gray-50">
                                                    {editingId === exp.id ? (
                                                        // Edit mode
                                                        <>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    type="date"
                                                                    value={editDate}
                                                                    onChange={(e) => setEditDate(e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-lg"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <select
                                                                    value={editCategoryId}
                                                                    onChange={(e) => setEditCategoryId(e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-lg"
                                                                >
                                                                    {activeCategories.map((c) => (
                                                                        <option key={c.id} value={c.id}>{c.categoryName}</option>
                                                                    ))}
                                                                    {/* Also show inactive if it was already selected */}
                                                                    {!activeCategories.find(c => c.id === Number(editCategoryId)) &&
                                                                        categories.find(c => c.id === Number(editCategoryId)) && (
                                                                            <option value={editCategoryId}>
                                                                                {categories.find(c => c.id === Number(editCategoryId))?.categoryName} (無効)
                                                                            </option>
                                                                        )}
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    type="number"
                                                                    value={editAmount}
                                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-lg text-right"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <input
                                                                    type="text"
                                                                    value={editMemo}
                                                                    onChange={(e) => setEditMemo(e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-lg"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-500 text-sm">
                                                                {exp.createdBy?.username || '-'}
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                <div className="flex justify-center gap-2">
                                                                    <button
                                                                        onClick={handleUpdateExpense}
                                                                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                                    >
                                                                        保存
                                                                    </button>
                                                                    <button
                                                                        onClick={cancelEditExpense}
                                                                        className="text-gray-500 hover:text-gray-700 text-sm"
                                                                    >
                                                                        キャンセル
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        // Display mode
                                                        <>
                                                            <td className="px-4 py-2 text-gray-700 text-lg">
                                                                {new Date(exp.expenseDate).toLocaleDateString('ja-JP')}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-sm">
                                                                    {exp.adCategory?.categoryName || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-mono font-semibold text-lg">
                                                                ¥{exp.amount.toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-600 text-sm max-w-xs truncate">
                                                                {exp.memo || '-'}
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-500 text-sm">
                                                                {exp.createdBy?.username || '-'}
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                <div className="flex justify-center gap-2">
                                                                    <button
                                                                        onClick={() => startEditExpense(exp)}
                                                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                                                    >
                                                                        編集
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteExpense(exp.id)}
                                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                                    >
                                                                        削除
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
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
                                <h2 className="text-xl font-bold mb-4">新規登録</h2>
                                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-lg font-medium mb-1">発生日 <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium mb-1">カテゴリ <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-lg"
                                        >
                                            <option value="">選択してください</option>
                                            {activeCategories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.categoryName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium mb-1">金額 <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-gray-500 text-lg">¥</span>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-lg"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-lg font-medium mb-1">メモ</label>
                                        <textarea
                                            value={memo}
                                            onChange={(e) => setMemo(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-lg"
                                            rows={3}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full py-2.5 rounded text-white font-medium shadow-sm text-lg
                                            ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-600'}
                                        `}
                                    >
                                        {isSubmitting ? '登録中...' : '登録する'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'budget' ? (
                    // --- Budget Tab Content ---
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">広告予算設定</h2>
                            <DateNavigator
                                date={budgetMonth}
                                onChange={setBudgetMonth}
                                label="対象月"
                            />
                        </div>

                        <div className="bg-white rounded-lg shadow-lg border-2 border-neutral-200 overflow-hidden">
                            <div className="p-6 bg-gradient-to-r from-[#00214d] to-[#002855] border-b-2 border-[#d4af37]">
                                <h3 className="text-xl font-bold text-white">カテゴリ別予算</h3>
                                <p className="text-neutral-200 text-sm mt-1">各広告カテゴリの月間予算を設定してください</p>
                            </div>

                            {budgetLoading ? (
                                <div className="p-12 text-center">
                                    <svg className="animate-spin h-8 w-8 text-[#00214d] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="text-neutral-500">読み込み中...</p>
                                </div>
                            ) : activeCategories.length === 0 ? (
                                <div className="p-12 text-center text-neutral-400">
                                    有効なカテゴリがありません
                                </div>
                            ) : (
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {activeCategories.map((cat) => (
                                            <div key={cat.id} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:border-[#d4af37] transition-colors">
                                                <div className="flex-1">
                                                    <label className="block text-lg font-semibold text-[#00214d] mb-1">
                                                        {cat.categoryName}
                                                    </label>
                                                    <p className="text-sm text-neutral-500">カテゴリID: {cat.id}</p>
                                                </div>
                                                <div className="w-64">
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-3 text-neutral-500 text-lg font-bold">¥</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={budgetInputs[cat.id] || '0'}
                                                            onChange={(e) => handleBudgetInputChange(cat.id, e.target.value)}
                                                            className="w-full pl-8 pr-3 py-2.5 border-2 border-neutral-300 rounded-lg text-lg font-semibold text-right focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 transition-all"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-6 border-t-2 border-neutral-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-lg font-bold text-[#00214d]">合計予算</h4>
                                                <p className="text-sm text-neutral-500">全カテゴリの予算合計</p>
                                            </div>
                                            <div className="text-3xl font-bold text-[#00214d]">
                                                ¥{activeCategories.reduce((sum, cat) => sum + Number(budgetInputs[cat.id] || 0), 0).toLocaleString()}
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveBudgets}
                                            disabled={isSavingBudget}
                                            className={`w-full py-3.5 rounded-lg text-white font-bold text-lg shadow-lg transition-all duration-200 ${
                                                isSavingBudget
                                                    ? 'bg-neutral-400 cursor-not-allowed'
                                                    : 'bg-[#00214d] hover:bg-[#d4af37] hover:text-[#00214d] hover:scale-[1.02]'
                                            }`}
                                        >
                                            {isSavingBudget ? '保存中...' : '💾 予算を保存'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // --- Categories Tab Content ---
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white p-6 rounded shadow border border-gray-200 mb-8">
                            <h2 className="text-xl font-bold mb-4">新規カテゴリ追加</h2>
                            <form onSubmit={handleAddCategory} className="flex gap-4">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="カテゴリ名 (例: Google広告, SNS広告)"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-lg"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isAddingCategory}
                                    className={`px-6 py-2 rounded text-white font-medium text-lg
                                        ${isAddingCategory ? 'bg-gray-400' : 'bg-primary hover:bg-blue-600'}
                                    `}
                                >
                                    追加
                                </button>
                            </form>
                        </div>

                        <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-200">
                                <h2 className="font-semibold text-gray-700 text-lg">登録済みカテゴリ一覧</h2>
                            </div>
                            {categoryLoading ? (
                                <div className="p-8 text-center text-gray-500 text-lg">読み込み中...</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="px-6 py-3 w-20 text-lg">ID</th>
                                            <th className="px-6 py-3 text-lg">カテゴリ名</th>
                                            <th className="px-6 py-3 w-24 text-center text-lg">状態</th>
                                            <th className="px-6 py-3 w-48 text-center text-lg">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {categories.map((cat) => (
                                            <tr key={cat.id} className={`hover:bg-gray-50 ${!cat.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                                                <td className="px-6 py-4 text-gray-500 text-lg">{cat.id}</td>
                                                <td className="px-6 py-4 text-lg">
                                                    {catEditingId === cat.id ? (
                                                        <input
                                                            type="text"
                                                            value={catEditName}
                                                            onChange={(e) => setCatEditName(e.target.value)}
                                                            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100 text-lg"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-gray-800">{cat.categoryName}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${cat.isActive
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                        }`}>
                                                        {cat.isActive ? '有効' : '無効'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {catEditingId === cat.id ? (
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                onClick={handleUpdateCategory}
                                                                className="text-green-600 hover:text-green-800 font-medium text-lg"
                                                            >
                                                                保存
                                                            </button>
                                                            <button
                                                                onClick={cancelEditCategory}
                                                                className="text-gray-500 hover:text-gray-700 text-lg"
                                                            >
                                                                キャンセル
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-4">
                                                            <button
                                                                onClick={() => startEditCategory(cat)}
                                                                className="text-blue-600 hover:text-blue-800 text-lg"
                                                            >
                                                                編集
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleCategoryActive(cat.id, cat.isActive)}
                                                                className={`text-lg ${cat.isActive ? "text-orange-500 hover:text-orange-700" : "text-green-600 hover:text-green-800"}`}
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
                                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-lg">
                                                    カテゴリが登録されていません
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function AdExpensesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdExpensesContent />
        </Suspense>
    );
}
