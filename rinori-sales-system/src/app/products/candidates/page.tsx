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

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const res = await fetch('/api/products/candidates');
            if (res.ok) {
                const data = await res.json();
                setCandidates(data);
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

    const handleBulkRegister = async () => {
        if (!confirm(`選択した${selectedIds.length}件の商品を管理中として一括登録しますか？\n\n※ 販売価格・原価が空欄の場合は0で登録されます。\n後で商品マスタCSVで更新できます。`)) {
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
                    managementStatus: bulkManagementStatus
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`${data.registeredCount}件の商品を登録しました`);
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

        setProcessing(productCode);
        try {
            const res = await fetch(`/api/products/candidates/${candidateId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ignored' })
            });

            if (res.ok) {
                alert('候補を無視しました。');
                fetchCandidates();
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || '無視処理に失敗しました'));
            }
        } catch (error) {
            console.error('無視処理エラー:', error);
            alert('通信エラーが発生しました');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem' }}>
                <h1>新商品候補一覧 (SC-07)</h1>
                <p>読み込み中...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1>新商品候補一覧 (SC-07)</h1>
                <Link href="/products" style={{ color: '#0070f3', textDecoration: 'none' }}>
                    商品マスタ一覧へ戻る
                </Link>
            </div>

            {selectedIds.length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500' }}>{selectedIds.length}件選択中</span>
                    <button
                        onClick={() => setShowBulkModal(true)}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        選択した商品を管理中として一括登録
                    </button>
                </div>
            )}

            {candidates.length === 0 ? (
                <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                }}>
                    新商品候補はありません。
                </div>
            ) : (
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                            <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', width: '50px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === candidates.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                            </th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>検出日時</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>商品コード</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>サンプルSKU</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>商品名</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>ステータス</th>
                            <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {candidates.map((candidate) => (
                            <tr key={candidate.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(candidate.id)}
                                        onChange={(e) => handleSelectOne(candidate.id, e.target.checked)}
                                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                    />
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {new Date(candidate.detectedAt).toLocaleString('ja-JP')}
                                </td>
                                <td style={{ padding: '1rem', fontWeight: '500' }}>{candidate.productCode}</td>
                                <td style={{ padding: '1rem', color: '#666' }}>{candidate.sampleSku || '-'}</td>
                                <td style={{ padding: '1rem', color: '#666' }}>{candidate.productName || '-'}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '12px',
                                        fontSize: '0.875rem',
                                        backgroundColor: '#fff3cd',
                                        color: '#856404',
                                        fontWeight: '500'
                                    }}>
                                        未登録
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => handleRegisterAsManaged(candidate)}
                                            disabled={processing === candidate.productCode}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                backgroundColor: '#28a745',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: processing === candidate.productCode ? 'not-allowed' : 'pointer',
                                                fontWeight: '500',
                                                fontSize: '0.8rem',
                                                opacity: processing === candidate.productCode ? 0.6 : 1,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            管理中として登録
                                        </button>
                                        <button
                                            onClick={() => handleRegisterAsUnmanaged(candidate)}
                                            disabled={processing === candidate.productCode}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                backgroundColor: '#6c757d',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: processing === candidate.productCode ? 'not-allowed' : 'pointer',
                                                fontWeight: '500',
                                                fontSize: '0.8rem',
                                                opacity: processing === candidate.productCode ? 0.6 : 1,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            管理外として登録
                                        </button>
                                        <button
                                            onClick={() => handleIgnore(candidate.id, candidate.productCode)}
                                            disabled={processing === candidate.productCode}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                backgroundColor: '#dc3545',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: processing === candidate.productCode ? 'not-allowed' : 'pointer',
                                                fontWeight: '500',
                                                fontSize: '0.8rem',
                                                opacity: processing === candidate.productCode ? 0.6 : 1,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            無視
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Bulk Registration Modal */}
            {showBulkModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>一括登録設定</h2>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                販売価格（税抜）<span style={{ color: '#666', fontSize: '0.875rem', marginLeft: '0.5rem' }}>(任意)</span>
                            </label>
                            <input
                                type="number"
                                value={bulkSalesPrice}
                                onChange={(e) => setBulkSalesPrice(e.target.value)}
                                placeholder="例: 1000"
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                原価（税抜）<span style={{ color: '#666', fontSize: '0.875rem', marginLeft: '0.5rem' }}>(任意)</span>
                            </label>
                            <input
                                type="number"
                                value={bulkCost}
                                onChange={(e) => setBulkCost(e.target.value)}
                                placeholder="例: 500"
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                商品タイプ
                            </label>
                            <select
                                value={bulkProductType}
                                onChange={(e) => setBulkProductType(e.target.value as 'own' | 'purchased')}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="own">自社</option>
                                <option value="purchased">仕入</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                管理ステータス
                            </label>
                            <select
                                value={bulkManagementStatus}
                                onChange={(e) => setBulkManagementStatus(e.target.value as 'managed' | 'unmanaged')}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="managed">管理中</option>
                                <option value="unmanaged">管理外</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowBulkModal(false)}
                                disabled={bulkProcessing}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleBulkRegister}
                                disabled={bulkProcessing}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#0070f3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                {bulkProcessing ? '登録中...' : '一括登録'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
