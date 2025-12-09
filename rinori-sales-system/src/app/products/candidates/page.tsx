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
        </div>
    );
}
