'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Candidate = {
    id: number;
    productCode: string;
    sampleSku: string | null;
    productName: string | null;
    status: string;
    detectedAt: string;
};

export default function NewProductCandidatesPage() {
    const router = useRouter();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkSalesPrice, setBulkSalesPrice] = useState('');
    const [bulkCost, setBulkCost] = useState('');
    const [bulkProductType, setBulkProductType] = useState<'own' | 'purchased'>('own');
    const [bulkManagementStatus, setBulkManagementStatus] = useState<'managed' | 'unmanaged'>('managed');
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'ignored'>('pending');

    useEffect(() => {
        fetchCandidates();
    }, [activeTab]); // Fetch when tab changes

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/products/candidates?status=${activeTab}`);
            if (res.ok) {
                const data = await res.json();
                setCandidates(data);
                setSelectedIds([]); // Clear selection on tab change
            }
        } catch (error) {
            console.error('候補取得エラー:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(candidates.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        }
    };

    const handleBulkRegister = async (status: 'managed' | 'unmanaged' = 'managed') => {
        const statusLabel = status === 'managed' ? '管理中' : '管理外';
        if (!confirm(`選択した${selectedIds.length}件の商品を${statusLabel}として一括登録しますか？\n\n※ 販売価格・原価が空欄の場合は0で登録されます。\n後で商品マスタCSVで更新できます。`)) {
            return;
        }

        setBulkProcessing(true);
        try {
            const res = await fetch('/api/products/candidates/bulk-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateIds: selectedIds,
                    defaultSalesPriceExclTax: bulkSalesPrice ? parseFloat(bulkSalesPrice) : 0,
                    defaultCostExclTax: bulkCost ? parseFloat(bulkCost) : 0,
                    productType: bulkProductType,
                    managementStatus: status
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`${data.registeredCount}件の商品を${statusLabel}として登録しました`);
                setShowBulkModal(false);
                setSelectedIds([]);
                setBulkSalesPrice('');
                setBulkCost('');
                fetchCandidates();
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || '一括登録に失敗しました'));
            }
        } catch (error) {
            console.error('一括登録エラー:', error);
            alert('通信エラーが発生しました');
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkIgnore = async () => {
        if (!confirm(`選択した${selectedIds.length}件の商品を一括で無視リストに移動しますか？`)) {
            return;
        }

        setBulkProcessing(true);
        try {
            const res = await fetch('/api/products/candidates/bulk-ignore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateIds: selectedIds
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`${data.count}件の商品を無視リストに移動しました`);
                setSelectedIds([]);
                fetchCandidates();
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || '一括無視に失敗しました'));
            }
        } catch (error) {
            console.error('一括無視エラー:', error);
            alert('通信エラーが発生しました');
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleRegisterAsManaged = (candidate: Candidate) => {
        const params = new URLSearchParams({
            code: candidate.productCode,
            status: 'managed'
        });
        if (candidate.productName) {
            params.append('name', candidate.productName);
        }
        router.push(`/products/new?${params.toString()}`);
    };

    const handleRegisterAsUnmanaged = (candidate: Candidate) => {
        const params = new URLSearchParams({
            code: candidate.productCode,
            status: 'unmanaged'
        });
        if (candidate.productName) {
            params.append('name', candidate.productName);
        }
        router.push(`/products/new?${params.toString()}`);
    };

    const handleIgnore = async (candidateId: number, productCode: string) => {
        if (!confirm(`商品コード「${productCode}」を無視しますか？\nこの候補は一覧から削除されます。`)) {
            return;
        }
        updateStatus(candidateId, productCode, 'ignored');
    };

    const handleRestore = async (candidateId: number, productCode: string) => {
        if (!confirm(`商品コード「${productCode}」を未登録に戻しますか？`)) {
            return;
        }
        updateStatus(candidateId, productCode, 'pending');
    };

    const updateStatus = async (id: number, code: string, status: string) => {
        setProcessing(code);
        try {
            const res = await fetch(`/api/products/candidates/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                alert(status === 'ignored' ? '候補を無視しました。' : '候補を未登録に戻しました。');
                fetchCandidates();
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || 'ステータス更新に失敗しました'));
            }
        } catch (error) {
            console.error('更新エラー:', error);
            alert('通信エラーが発生しました');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50">
                <header className="bg-rinori-navy border-b-2 border-rinori-gold px-6 py-4 shadow-md mb-8">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-xl font-semibold text-white">新商品候補一覧</h1>
                    </div>
                </header>
                <div className="max-w-7xl mx-auto px-6 py-12 text-center">
                    <svg className="animate-spin h-8 w-8 text-rinori-navy mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-neutral-500">読み込み中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50">
            <header className="bg-rinori-navy border-b-2 border-rinori-gold px-6 py-4 shadow-md mb-8">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-white">新商品候補一覧</h1>
                    <Link href="/products" className="px-4 py-2 text-white hover:text-rinori-gold transition-colors duration-200 font-medium">
                        商品マスタ一覧へ戻る
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6">
                <div className="flex gap-4 mb-6 border-b-2 border-neutral-200">
                    <button
                        className={`px-6 py-3 border-b-2 font-semibold transition-colors duration-200 ${activeTab === 'pending' ? 'border-rinori-gold text-rinori-navy' : 'border-transparent text-neutral-500 hover:text-rinori-navy'}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        未登録
                    </button>
                    <button
                        className={`px-6 py-3 border-b-2 font-semibold transition-colors duration-200 ${activeTab === 'ignored' ? 'border-rinori-gold text-rinori-navy' : 'border-transparent text-neutral-500 hover:text-rinori-navy'}`}
                        onClick={() => setActiveTab('ignored')}
                    >
                        無視リスト
                    </button>
                </div>

                {selectedIds.length > 0 && (
                    <div className="mb-6 p-4 bg-rinori-gold/10 border-2 border-rinori-gold rounded-lg flex justify-between items-center shadow-sm">
                        <span className="font-semibold text-rinori-navy">{selectedIds.length}件選択中</span>
                        <div className="flex gap-3">
                            {activeTab === 'pending' && (
                                <>
                                    <button
                                        onClick={() => {
                                            setBulkManagementStatus('managed');
                                            setShowBulkModal(true);
                                        }}
                                        disabled={bulkProcessing}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm disabled:opacity-50"
                                    >
                                        管理中として一括登録...
                                    </button>
                                    <button
                                        onClick={() => {
                                            setBulkManagementStatus('unmanaged');
                                            setShowBulkModal(true);
                                        }}
                                        disabled={bulkProcessing}
                                        className="px-4 py-2 bg-neutral-600 text-white rounded-md hover:bg-neutral-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm disabled:opacity-50"
                                    >
                                        管理外として一括登録...
                                    </button>
                                    <button
                                        onClick={handleBulkIgnore}
                                        disabled={bulkProcessing}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm disabled:opacity-50"
                                    >
                                        一括無視
                                    </button>
                                </>
                            )}
                            {activeTab === 'ignored' && (
                                <button
                                    onClick={async () => {
                                        if (!confirm(`選択した${selectedIds.length}件の商品を一括で未登録に戻しますか？`)) return;
                                        setBulkProcessing(true);
                                        try {
                                            for (const id of selectedIds) {
                                                const candidate = candidates.find(c => c.id === id);
                                                if (candidate) await updateStatus(id, candidate.productCode, 'pending');
                                            }
                                            setSelectedIds([]);
                                        } finally {
                                            setBulkProcessing(false);
                                        }
                                    }}
                                    disabled={bulkProcessing}
                                    className="px-4 py-2 bg-rinori-navy text-white rounded-md hover:bg-rinori-navy/90 shadow-sm hover:shadow-md transition-all duration-200 font-medium text-sm disabled:opacity-50"
                                >
                                    選択した商品を一括で未登録に戻す
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {candidates.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-lg border-2 border-neutral-200">
                        <svg className="w-16 h-16 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-neutral-400">新商品候補はありません。</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md border-2 border-neutral-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-rinori-navy text-white">
                                <tr>
                                    <th className="px-4 py-3 text-center font-semibold w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === candidates.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            className="cursor-pointer w-4 h-4"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold">検出日時</th>
                                    <th className="px-4 py-3 text-left font-semibold">商品コード</th>
                                    <th className="px-4 py-3 text-left font-semibold">サンプルSKU</th>
                                    <th className="px-4 py-3 text-left font-semibold">商品名</th>
                                    <th className="px-4 py-3 text-left font-semibold">ステータス</th>
                                    <th className="px-4 py-3 text-center font-semibold">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {candidates.map((candidate) => (
                                    <tr key={candidate.id} className="hover:bg-rinori-cream/30 transition-colors">
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(candidate.id)}
                                                onChange={(e) => handleSelectOne(candidate.id, e.target.checked)}
                                                className="cursor-pointer w-4 h-4"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-600">
                                            {new Date(candidate.detectedAt).toLocaleString('ja-JP')}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono font-medium text-neutral-800">{candidate.productCode}</td>
                                        <td className="px-4 py-3 text-sm text-neutral-600">{candidate.sampleSku || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-neutral-600">{candidate.productName || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                                                {activeTab === 'pending' ? '未登録' : '無視'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex gap-2 justify-center flex-wrap">
                                                {activeTab === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleRegisterAsManaged(candidate)}
                                                            disabled={processing === candidate.productCode}
                                                            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs whitespace-nowrap transition-all duration-200"
                                                        >
                                                            管理中として登録
                                                        </button>
                                                        <button
                                                            onClick={() => handleRegisterAsUnmanaged(candidate)}
                                                            disabled={processing === candidate.productCode}
                                                            className="px-3 py-1.5 bg-neutral-600 text-white rounded-md hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs whitespace-nowrap transition-all duration-200"
                                                        >
                                                            管理外として登録
                                                        </button>
                                                        <button
                                                            onClick={() => handleIgnore(candidate.id, candidate.productCode)}
                                                            disabled={processing === candidate.productCode}
                                                            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs whitespace-nowrap transition-all duration-200"
                                                        >
                                                            無視
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRestore(candidate.id, candidate.productCode)}
                                                        disabled={processing === candidate.productCode}
                                                        className="px-3 py-1.5 bg-rinori-navy text-white rounded-md hover:bg-rinori-navy/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs whitespace-nowrap transition-all duration-200"
                                                    >
                                                        未登録に戻す (復活)
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Bulk Registration Modal */}
                {showBulkModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
                        <div className="bg-white p-8 rounded-lg max-w-lg w-full mx-4 shadow-2xl border-2 border-neutral-200 animate-slideIn">
                            <h2 className="text-xl font-bold text-rinori-navy mb-6">一括登録設定</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                        販売価格（税抜）<span className="text-neutral-500 text-xs ml-2">(任意)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={bulkSalesPrice}
                                        onChange={(e) => setBulkSalesPrice(e.target.value)}
                                        placeholder="例: 1000"
                                        className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                        原価（税抜）<span className="text-neutral-500 text-xs ml-2">(任意)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={bulkCost}
                                        onChange={(e) => setBulkCost(e.target.value)}
                                        placeholder="例: 500"
                                        className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                        商品タイプ
                                    </label>
                                    <select
                                        value={bulkProductType}
                                        onChange={(e) => setBulkProductType(e.target.value as 'own' | 'purchased')}
                                        className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                                    >
                                        <option value="own">自社</option>
                                        <option value="purchased">仕入</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                        管理ステータス
                                    </label>
                                    <select
                                        value={bulkManagementStatus}
                                        onChange={(e) => setBulkManagementStatus(e.target.value as 'managed' | 'unmanaged')}
                                        className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                                    >
                                        <option value="managed">管理中</option>
                                        <option value="unmanaged">管理外</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8 pt-6 border-t-2 border-neutral-200">
                                <button
                                    onClick={() => setShowBulkModal(false)}
                                    disabled={bulkProcessing}
                                    className="flex-1 px-6 py-2.5 border-2 border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={() => handleBulkRegister(bulkManagementStatus)}
                                    disabled={bulkProcessing}
                                    className="flex-1 px-6 py-2.5 bg-rinori-navy text-white rounded-md hover:bg-rinori-navy/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg font-medium transition-all duration-200"
                                >
                                    {bulkProcessing ? '登録中...' : '一括登録'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
