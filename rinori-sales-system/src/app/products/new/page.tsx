'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NewProductForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productCodeFromQuery = searchParams.get('code');
    const productNameFromQuery = searchParams.get('name');
    const statusFromQuery = searchParams.get('status');
    const fromCandidates = searchParams.has('code'); // 候補一覧から来たかどうか

    const [productCode, setProductCode] = useState(productCodeFromQuery || '');
    const [productName, setProductName] = useState(productNameFromQuery || '');
    const [salesPrice, setSalesPrice] = useState('');
    const [cost, setCost] = useState('');
    const [productType, setProductType] = useState<'own' | 'purchase'>('own');
    const [managementStatus, setManagementStatus] = useState<'managed' | 'unmanaged'>(
        statusFromQuery === 'unmanaged' || statusFromQuery === '管理外' ? 'unmanaged' : 'managed'
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productCode,
                    productName,
                    salesPriceExclTax: salesPrice ? parseFloat(salesPrice) : 0,
                    costExclTax: cost ? parseFloat(cost) : 0,
                    productType,
                    managementStatus
                })
            });

            if (res.ok) {
                alert('商品を登録しました');
                // 候補一覧から来た場合は候補一覧に戻る
                router.push(fromCandidates ? '/products/candidates' : '/products');
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || '登録に失敗しました'));
            }
        } catch (error) {
            console.error('登録エラー:', error);
            alert('通信エラーが発生しました');
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <Link href={fromCandidates ? '/products/candidates' : '/products'} style={{ color: '#0070f3', textDecoration: 'none' }}>
                    ← {fromCandidates ? '新商品候補一覧に戻る' : '商品マスタ一覧に戻る'}
                </Link>
            </div>

            <h1 style={{ marginBottom: '2rem' }}>商品マスタ新規登録</h1>

            <form onSubmit={handleSubmit} style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        商品コード <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                        placeholder="RINO-XXXXX"
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        商品名 <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            販売価格（税別）
                        </label>
                        <input
                            type="number"
                            value={salesPrice}
                            onChange={(e) => setSalesPrice(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}
                            placeholder="0"
                        />
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                            未設定の場合は0として登録されます
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            原価（税別）
                        </label>
                        <input
                            type="number"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}
                            placeholder="0"
                        />
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                            未設定の場合は0として登録されます
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            商品区分 <span style={{ color: 'red' }}>*</span>
                        </label>
                        <select
                            value={productType}
                            onChange={(e) => setProductType(e.target.value as 'own' | 'purchase')}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}
                        >
                            <option value="own">自社</option>
                            <option value="purchase">仕入</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            管理ステータス <span style={{ color: 'red' }}>*</span>
                        </label>
                        <select
                            value={managementStatus}
                            onChange={(e) => setManagementStatus(e.target.value as 'managed' | 'unmanaged')}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}
                        >
                            <option value="managed">管理中</option>
                            <option value="unmanaged">管理外</option>
                        </select>
                    </div>
                </div>

                {managementStatus === 'managed' && (!salesPrice || !cost) && (
                    <div style={{
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '4px',
                        padding: '0.75rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        color: '#856404'
                    }}>
                        ⚠️ 「管理中」の商品で販売価格または原価が未設定の場合、トップページに警告が表示されます。
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        type="submit"
                        style={{
                            padding: '0.75rem 2rem',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        登録
                    </button>
                    <Link
                        href={fromCandidates ? '/products/candidates' : '/products'}
                        style={{
                            padding: '0.75rem 2rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            color: '#333',
                            display: 'inline-block'
                        }}
                    >
                        キャンセル
                    </Link>
                </div>
            </form>
        </div>
    );
}

export default function NewProductPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem' }}>読み込み中...</div>}>
            <NewProductForm />
        </Suspense>
    );
}
