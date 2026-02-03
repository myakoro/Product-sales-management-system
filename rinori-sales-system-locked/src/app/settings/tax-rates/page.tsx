'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useSession } from 'next-auth/react';

type TaxRate = {
    id: number;
    startYm: string;
    rate: number;
};

export default function TaxRatesPage() {
    const { data: session } = useSession();
    const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form inputs
    const [startYm, setStartYm] = useState('');
    const [rateInput, setRateInput] = useState('');

    useEffect(() => {
        fetchTaxRates();
    }, []);

    const fetchTaxRates = async () => {
        try {
            const res = await fetch('/api/tax-rates');
            if (!res.ok) throw new Error('Failed to fetch tax rates');
            const data = await res.json();
            setTaxRates(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!startYm || !rateInput) {
            setError('すべての項目を入力してください');
            return;
        }

        // Validate YYYY-MM
        if (!/^\d{4}-\d{2}$/.test(startYm)) {
            setError('適用開始年月は YYYY-MM 形式で入力してください');
            return;
        }

        const rateValue = parseFloat(rateInput);
        if (isNaN(rateValue)) {
            setError('税率は数値で入力してください');
            return;
        }

        // Convert % to decimal if user entered e.g. 10 for 10%
        // Spec says rate: 0.100 = 10%.
        // Let's assume user enters percentage (e.g. 10) and we convert to 0.10.
        // Or if user enters 0.1, we treat it as 10%?
        // Let's stick to standard practice: Input as %, convert to decimal.
        // But for clarity, let's explicitly ask for %.

        const decimalRate = rateValue / 100;

        try {
            const res = await fetch('/api/tax-rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startYm,
                    rate: decimalRate
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create tax rate');
            }

            setSuccessMsg('税率設定を追加しました');
            setStartYm('');
            setRateInput('');
            fetchTaxRates();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('この設定を削除してよろしいですか？')) return;

        try {
            const res = await fetch(`/api/tax-rates?id=${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete');
            }

            setSuccessMsg('税率設定を削除しました');
            fetchTaxRates();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-4xl mx-auto py-10 px-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">税率設定 (SC-18)</h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="bg-green-50 text-green-600 p-4 rounded mb-4">
                        {successMsg}
                    </div>
                )}

                {/* Add Form */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">新規登録</h3>
                    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                適用開始年月 (YYYY-MM)
                            </label>
                            <input
                                type="text"
                                value={startYm}
                                onChange={(e) => setStartYm(e.target.value)}
                                placeholder="2025-10"
                                className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                税率 (%)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={rateInput}
                                    onChange={(e) => setRateInput(e.target.value)}
                                    placeholder="10"
                                    className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500 pr-8"
                                />
                                <span className="absolute right-3 top-2 text-gray-500">%</span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                        >
                            追加
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <h3 className="text-lg font-semibold p-6 border-b text-gray-700">登録済み税率一覧</h3>
                    {loading ? (
                        <div className="p-6 text-center text-gray-500">読み込み中...</div>
                    ) : taxRates.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">登録された税率はありません</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-gray-500">適用開始年月</th>
                                    <th className="px-6 py-3 font-medium text-gray-500">税率</th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {taxRates.map((rate) => (
                                    <tr key={rate.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">{rate.startYm}</td>
                                        <td className="px-6 py-4">{(rate.rate * 100).toFixed(1)}%</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(rate.id)}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium"
                                            >
                                                削除
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
