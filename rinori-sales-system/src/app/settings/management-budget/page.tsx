'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

type ManagementBudgetRow = {
    periodYm: string;
    amount: number;
    updatedAt?: string;
};

function pad2(n: number) {
    return String(n).padStart(2, '0');
}

function toYm(year: number, month: number) {
    return `${year}-${pad2(month)}`;
}

function distributeEvenly(total: number, count: number) {
    const t = Math.max(0, Math.trunc(total || 0));
    const c = Math.max(1, Math.trunc(count));
    const base = Math.floor(t / c);
    const remainder = t % c;

    return Array.from({ length: c }, (_, idx) => (idx === c - 1 ? base + remainder : base));
}

function formatCurrency(amount: number) {
    return `¥${Math.round(amount || 0).toLocaleString()}`;
}

export default function ManagementBudgetSettingsPage() {
    const { data: session, status } = useSession();
    const currentRole = (session?.user as any)?.role as 'master' | 'staff' | undefined;

    const currentYear = new Date().getFullYear();

    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [monthlyAmounts, setMonthlyAmounts] = useState<number[]>(Array.from({ length: 12 }, () => 0));

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const yearOptions = useMemo(() => {
        const start = 2024;
        const years: number[] = [];
        for (let y = start; y <= currentYear; y++) {
            years.push(y);
        }
        return years;
    }, [currentYear]);

    const isMaster = currentRole === 'master';
    const isReadOnly = !isMaster;

    const yearTotal = useMemo(() => monthlyAmounts.reduce((sum, v) => sum + (v || 0), 0), [monthlyAmounts]);

    const quarterTotals = useMemo(() => {
        // Q1: 4-6月 (index 3,4,5), Q2: 7-9月 (index 6,7,8), Q3: 10-12月 (index 9,10,11), Q4: 1-3月 (index 0,1,2)
        const q1 = monthlyAmounts[3] + monthlyAmounts[4] + monthlyAmounts[5];
        const q2 = monthlyAmounts[6] + monthlyAmounts[7] + monthlyAmounts[8];
        const q3 = monthlyAmounts[9] + monthlyAmounts[10] + monthlyAmounts[11];
        const q4 = monthlyAmounts[0] + monthlyAmounts[1] + monthlyAmounts[2];
        return [q1, q2, q3, q4];
    }, [monthlyAmounts]);

    const fetchYearBudgets = async (year: number) => {
        setLoading(true);
        setMessage(null);
        try {
            const startYm = toYm(year, 1);
            const endYm = toYm(year, 12);
            const res = await fetch(`/api/settings/management-budget?startYm=${startYm}&endYm=${endYm}`);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Failed to fetch: ${res.status} ${text}`);
            }
            const rows: ManagementBudgetRow[] = await res.json();
            console.log('[ManagementBudget] Fetched rows:', rows);

            const map = new Map(rows.map((r) => [r.periodYm, r.amount] as const));
            const next = Array.from({ length: 12 }, (_, idx) => {
                const ym = toYm(year, idx + 1);
                const v = map.get(ym);
                return typeof v === 'number' ? Math.trunc(v) : 0;
            });
            setMonthlyAmounts(next);
        } catch (e: any) {
            console.error('[ManagementBudget] Fetch error:', e);
            setMessage({ type: 'error', text: `データの取得に失敗しました。(${e.message})` });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchYearBudgets(selectedYear);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear, status]);

    const handleYearTotalChange = (value: number) => {
        const distributed = distributeEvenly(value, 12);
        setMonthlyAmounts(distributed);
    };

    const handleQuarterTotalChange = (quarterIndex: number, value: number) => {
        // Q1: 4-6月 (index 3,4,5), Q2: 7-9月 (index 6,7,8), Q3: 10-12月 (index 9,10,11), Q4: 1-3月 (index 0,1,2)
        const monthIndices = [
            [3, 4, 5],   // Q1: 4-6月
            [6, 7, 8],   // Q2: 7-9月
            [9, 10, 11], // Q3: 10-12月
            [0, 1, 2]    // Q4: 1-3月
        ];
        const distributed = distributeEvenly(value, 3);
        setMonthlyAmounts((prev) => {
            const next = [...prev];
            const indices = monthIndices[quarterIndex];
            next[indices[0]] = distributed[0];
            next[indices[1]] = distributed[1];
            next[indices[2]] = distributed[2];
            return next;
        });
    };

    const handleMonthChange = (monthIndex: number, value: number) => {
        setMonthlyAmounts((prev) => {
            const next = [...prev];
            next[monthIndex] = Math.max(0, Math.trunc(value || 0));
            return next;
        });
    };

    const handleSave = async () => {
        if (!isMaster || saving) return;

        setSaving(true);
        setMessage(null);

        try {
            const budgets = monthlyAmounts.map((amount, idx) => ({
                periodYm: toYm(selectedYear, idx + 1),
                amount: Math.max(0, Math.trunc(amount || 0)),
            }));

            const res = await fetch('/api/settings/management-budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ budgets }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || 'Save failed');
            }

            setMessage({ type: 'success', text: '保存しました。' });
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: '保存に失敗しました。' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="max-w-5xl mx-auto py-10 px-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">管理売上予算設定 (SC-18)</h2>
                        <p className="text-sm text-gray-500 mt-1">金額はすべて税別（円）で管理します。</p>
                    </div>
                    <Link href="/settings" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100">
                        設定へ戻る
                    </Link>
                </div>

                {message && (
                    <div
                        className={`p-4 rounded mb-4 ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                {status === 'loading' ? (
                    <div className="bg-white p-6 rounded border border-gray-200">読み込み中...</div>
                ) : (
                    <div className="space-y-6">
                        {isReadOnly && (
                            <div className="bg-amber-50 text-amber-700 p-4 rounded border border-amber-200">
                                閲覧のみ可能です（スタッフ権限では編集・保存できません）。
                            </div>
                        )}
                        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center gap-4 flex-wrap">
                                <label className="text-sm font-medium text-gray-700">年度</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    disabled={loading}
                                    className="px-3 py-2 border border-gray-300 rounded bg-white"
                                >
                                    {yearOptions.map((y) => (
                                        <option key={y} value={y}>
                                            {y}年
                                        </option>
                                    ))}
                                </select>

                                <div className="ml-auto text-sm text-gray-500">
                                    合計: <span className="font-semibold text-gray-900">{formatCurrency(yearTotal)}</span>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">年度 / 四半期 / 月別 目標</h3>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <label className="text-sm font-medium text-gray-700">年度合計</label>
                                        <input
                                            type="number"
                                            value={yearTotal}
                                            onChange={(e) => handleYearTotalChange(Number(e.target.value) || 0)}
                                            disabled={isReadOnly || loading}
                                            className="w-56 px-3 py-2 border border-gray-300 rounded text-right"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { q: 0, label: 'Q1 (4-6月)' },
                                            { q: 1, label: 'Q2 (7-9月)' },
                                            { q: 2, label: 'Q3 (10-12月)' },
                                            { q: 3, label: 'Q4 (1-3月)' }
                                        ].map(({ q, label }) => (
                                            <div key={q} className="flex items-center justify-between gap-4">
                                                <label className="text-sm font-medium text-gray-700">{label}</label>
                                                <input
                                                    type="number"
                                                    value={quarterTotals[q]}
                                                    onChange={(e) => handleQuarterTotalChange(q, Number(e.target.value) || 0)}
                                                    disabled={isReadOnly || loading}
                                                    className="w-56 px-3 py-2 border border-gray-300 rounded text-right"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {[3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2].map((monthIdx) => (
                                            <div key={monthIdx} className="bg-gray-50 rounded border border-gray-200 p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-sm font-medium text-gray-700">{monthIdx + 1}月</div>
                                                    <div className="text-xs text-gray-400">{toYm(selectedYear, monthIdx + 1)}</div>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={monthlyAmounts[monthIdx] || 0}
                                                    onChange={(e) => handleMonthChange(monthIdx, Number(e.target.value) || 0)}
                                                    disabled={isReadOnly || loading}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded text-right bg-white"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-6">
                                {isMaster && (
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || loading}
                                        className="px-6 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                                    >
                                        {saving ? '保存中...' : '保存'}
                                    </button>
                                )}
                                <button
                                    onClick={() => fetchYearBudgets(selectedYear)}
                                    disabled={saving || loading}
                                    className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                                >
                                    {loading ? '読込中...' : '再読込'}
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
