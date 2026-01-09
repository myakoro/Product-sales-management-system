'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

type NewProduct = {
    productCode: string;
    productName: string | null;
    asin: string | null;
    salesPriceExclTax: number | null;
    costExclTax: number | null;
    productType: string | null;
    managementStatus: string | null;
    categoryName: string | null;
    sampleSku: string;
    // バリデーション情報
    categoryExists?: boolean;
    asinDuplicate?: boolean;
    duplicateAsinCode?: string;
};

type UpdateProduct = {
    productCode: string;
    oldProductName: string | null;
    newProductName: string | null;
    oldAsin: string | null;
    newAsin: string | null;
    oldSalesPriceExclTax: number | null;
    newSalesPriceExclTax: number | null;
    oldCostExclTax: number | null;
    newCostExclTax: number | null;
    oldProductType: string | null;
    newProductType: string | null;
    oldManagementStatus: string | null;
    newManagementStatus: string | null;
    oldCategoryName: string | null;
    newCategoryName: string | null;
    // バリデーション情報
    categoryExists?: boolean;
    asinDuplicate?: boolean;
    duplicateAsinCode?: string;
};

export default function ProductImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);

    const [newProducts, setNewProducts] = useState<NewProduct[]>([]);
    const [updateProducts, setUpdateProducts] = useState<UpdateProduct[]>([]);

    const [selectedNew, setSelectedNew] = useState<Set<string>>(new Set());
    const [selectedUpdate, setSelectedUpdate] = useState<Set<string>>(new Set());

    const [showResults, setShowResults] = useState(false);
    const [resultMessage, setResultMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            // ファイル変更時に結果をクリア
            setNewProducts([]);
            setUpdateProducts([]);
            setSelectedNew(new Set());
            setSelectedUpdate(new Set());
            setShowResults(false);
        }
    };

    const handleCheck = async () => {
        if (!file) {
            alert('CSVファイルを選択してください');
            return;
        }

        setChecking(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/products/import/check', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const totalFound = (data.newProducts?.length || 0) + (data.updateProducts?.length || 0);

                if (totalFound === 0) {
                    alert('CSVファイルの内容と現在のデータベースに差分は見つかりませんでした。すべて最新の状態です。');
                } else {
                    setNewProducts(data.newProducts || []);
                    setUpdateProducts(data.updateProducts || []);

                    // デフォルトで全て選択
                    setSelectedNew(new Set(data.newProducts?.map((p: NewProduct) => p.productCode) || []));
                    setSelectedUpdate(new Set(data.updateProducts?.map((p: UpdateProduct) => p.productCode) || []));

                    // スムーズな遷移
                    window.scrollTo({ top: 500, behavior: 'smooth' });
                }
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || '差分チェックに失敗しました'));
            }
        } catch (error) {
            console.error('差分チェックエラー:', error);
            alert('通信エラーが発生しました:' + (error as Error).message);
        } finally {
            setChecking(false);
        }
    };

    const handleSelectAllNew = () => {
        // カテゴリー未登録の商品は除外
        const validProducts = newProducts.filter(p => p.categoryExists !== false);
        setSelectedNew(new Set(validProducts.map(p => p.productCode)));
    };

    const handleDeselectAllNew = () => {
        setSelectedNew(new Set());
    };

    const handleSelectAllUpdate = () => {
        // カテゴリー未登録の商品は除外
        const validProducts = updateProducts.filter(p => p.categoryExists !== false);
        setSelectedUpdate(new Set(validProducts.map(p => p.productCode)));
    };

    const handleDeselectAllUpdate = () => {
        setSelectedUpdate(new Set());
    };

    const handleToggleNew = (productCode: string, product: NewProduct) => {
        // カテゴリー未登録の場合は選択不可
        if (product.categoryExists === false) {
            return;
        }
        const newSet = new Set(selectedNew);
        if (newSet.has(productCode)) {
            newSet.delete(productCode);
        } else {
            newSet.add(productCode);
        }
        setSelectedNew(newSet);
    };

    const handleToggleUpdate = (productCode: string, product: UpdateProduct) => {
        // カテゴリー未登録の場合は選択不可
        if (product.categoryExists === false) {
            return;
        }
        const newSet = new Set(selectedUpdate);
        if (newSet.has(productCode)) {
            newSet.delete(productCode);
        } else {
            newSet.add(productCode);
        }
        setSelectedUpdate(newSet);
    };

    const handleApply = async () => {
        const selectedNewProducts = newProducts.filter(p => selectedNew.has(p.productCode));
        const selectedUpdateProducts = updateProducts.filter(p => selectedUpdate.has(p.productCode));

        if (selectedNewProducts.length === 0 && selectedUpdateProducts.length === 0) {
            alert('登録・更新する商品を選択してください');
            return;
        }

        if (!confirm(`新規: ${selectedNewProducts.length}件、更新: ${selectedUpdateProducts.length}件を登録・更新しますか？`)) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/products/import/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comment,
                    newProducts: selectedNewProducts,
                    updateProducts: selectedUpdateProducts
                })
            });

            if (res.ok) {
                const data = await res.json();
                setResultMessage(`登録・更新が完了しました。\n新規: ${data.newCount}件、更新: ${data.updateCount}件`);
                setShowResults(true);

                // 結果表示後、フォームをリセット
                setFile(null);
                setComment('');
                setNewProducts([]);
                setUpdateProducts([]);
                setSelectedNew(new Set());
                setSelectedUpdate(new Set());
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || '登録・更新に失敗しました'));
            }
        } catch (error) {
            console.error('登録・更新エラー:', error);
            alert('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const totalCandidates = newProducts.length + updateProducts.length;
    const totalSelected = selectedNew.size + selectedUpdate.size;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
                    ← ダッシュボードに戻る
                </Link>
            </div>

            <h1 style={{ marginBottom: '2rem' }}>商品一覧CSV取込 (SC-03)</h1>

            {showResults && (
                <div style={{
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '4px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    color: '#155724'
                }}>
                    {resultMessage}
                </div>
            )}

            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                    1. CSVファイルを選択
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        CSVファイル <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            width: '100%'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                        コメント（任意）
                    </label>
                    <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="例: 2025年12月商品更新"
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>

                <button
                    onClick={handleCheck}
                    disabled={!file || checking}
                    style={{
                        padding: '0.75rem 2rem',
                        backgroundColor: checking ? '#ccc' : '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: checking || !file ? 'not-allowed' : 'pointer',
                        fontWeight: '500'
                    }}
                >
                    {checking ? '差分チェック中...' : '差分チェック'}
                </button>
            </div>

            {totalCandidates > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
                        2. 差分候補一覧（{totalCandidates}件）
                    </h2>

                    <div style={{ marginBottom: '1.5rem', color: '#666' }}>
                        選択中: {totalSelected}件 / {totalCandidates}件
                    </div>

                    {newProducts.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                                    新規登録候補（{newProducts.length}件）
                                </h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={handleSelectAllNew}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        全て選択
                                    </button>
                                    <button
                                        onClick={handleDeselectAllNew}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#6c757d',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        全て解除
                                    </button>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', width: '50px' }}>選択</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>商品コード</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>商品名</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>ASIN</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>販売価格</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>原価</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>商品区分</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>ステータス</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>カテゴリー</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {newProducts.map((product) => {
                                        const hasInvalidCategory = product.categoryExists === false;
                                        const hasDuplicateAsin = product.asinDuplicate === true;
                                        return (
                                            <tr
                                                key={product.productCode}
                                                style={{
                                                    borderBottom: '1px solid #eee',
                                                    backgroundColor: hasInvalidCategory ? '#fef2f2' : 'transparent'
                                                }}
                                            >
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedNew.has(product.productCode)}
                                                        onChange={() => handleToggleNew(product.productCode, product)}
                                                        disabled={hasInvalidCategory}
                                                        style={{ cursor: hasInvalidCategory ? 'not-allowed' : 'pointer' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.75rem', fontWeight: '500' }}>{product.productCode}</td>
                                                <td style={{ padding: '0.75rem' }}>{product.productName || '-'}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <span>{product.asin || '-'}</span>
                                                        {hasDuplicateAsin && (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center' }} title={`ASIN重複: ${product.duplicateAsinCode}`}>
                                                                <AlertTriangle size={16} color="#f59e0b" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                    {product.salesPriceExclTax !== null ? `¥${product.salesPriceExclTax.toLocaleString()}` : '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                    {product.costExclTax !== null ? `¥${product.costExclTax.toLocaleString()}` : '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {product.productType === 'own' ? '自社' : product.productType === 'purchase' ? '仕入' : product.productType || '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {product.managementStatus === 'managed' ? '管理中' : product.managementStatus === 'unmanaged' ? '管理外' : product.managementStatus || '-'}
                                                </td>
                                                <td style={{ padding: '0.75rem', color: hasInvalidCategory ? '#dc2626' : 'inherit', fontWeight: hasInvalidCategory ? '600' : 'normal' }}>
                                                    {product.categoryName || '-'}
                                                    {hasInvalidCategory && ' (未登録)'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {updateProducts.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                                    更新候補（{updateProducts.length}件）
                                </h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={handleSelectAllUpdate}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        全て選択
                                    </button>
                                    <button
                                        onClick={handleDeselectAllUpdate}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#6c757d',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        全て解除
                                    </button>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', width: '50px' }}>選択</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>商品コード</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>商品名</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>ASIN</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>販売価格</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>原価</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>商品区分</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>ステータス</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>カテゴリー</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {updateProducts.map((product) => {
                                        const hasInvalidCategory = product.categoryExists === false;
                                        const hasDuplicateAsin = product.asinDuplicate === true;
                                        return (
                                            <tr
                                                key={product.productCode}
                                                style={{
                                                    borderBottom: '1px solid #eee',
                                                    backgroundColor: hasInvalidCategory ? '#fef2f2' : 'transparent'
                                                }}
                                            >
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUpdate.has(product.productCode)}
                                                        onChange={() => handleToggleUpdate(product.productCode, product)}
                                                        disabled={hasInvalidCategory}
                                                        style={{ cursor: hasInvalidCategory ? 'not-allowed' : 'pointer' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.75rem', fontWeight: '500' }}>{product.productCode}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {product.oldProductName !== product.newProductName ? (
                                                        <>
                                                            <span style={{ color: '#999', textDecoration: 'line-through' }}>{product.oldProductName || '-'}</span>
                                                            {' → '}
                                                            <span style={{ color: '#28a745', fontWeight: '500' }}>{product.newProductName || '-'}</span>
                                                        </>
                                                    ) : (
                                                        product.newProductName || '-'
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {product.oldAsin !== product.newAsin ? (
                                                        <>
                                                            <span style={{ color: '#999', textDecoration: 'line-through' }}>{product.oldAsin || '-'}</span>
                                                            {' → '}
                                                            <span style={{ color: '#28a745', fontWeight: '500' }}>{product.newAsin || '-'}</span>
                                                        </>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <span>{product.newAsin || '-'}</span>
                                                            {hasDuplicateAsin && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center' }} title={`ASIN重複: ${product.duplicateAsinCode}`}>
                                                                    <AlertTriangle size={16} color="#f59e0b" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                    {product.oldSalesPriceExclTax !== product.newSalesPriceExclTax ? (
                                                        <>
                                                            <span style={{ color: '#999', textDecoration: 'line-through' }}>
                                                                ¥{product.oldSalesPriceExclTax?.toLocaleString() || '0'}
                                                            </span>
                                                            {' → '}
                                                            <span style={{ color: '#28a745', fontWeight: '500' }}>
                                                                ¥{product.newSalesPriceExclTax?.toLocaleString() || '0'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        `¥${product.newSalesPriceExclTax?.toLocaleString() || '0'}`
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                    {product.oldCostExclTax !== product.newCostExclTax ? (
                                                        <>
                                                            <span style={{ color: '#999', textDecoration: 'line-through' }}>
                                                                ¥{product.oldCostExclTax?.toLocaleString() || '0'}
                                                            </span>
                                                            {' → '}
                                                            <span style={{ color: '#28a745', fontWeight: '500' }}>
                                                                ¥{product.newCostExclTax?.toLocaleString() || '0'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        `¥${product.newCostExclTax?.toLocaleString() || '0'}`
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {product.oldProductType !== product.newProductType ? (
                                                        <>
                                                            <span style={{ color: '#999', textDecoration: 'line-through' }}>
                                                                {product.oldProductType === 'own' ? '自社' : product.oldProductType === 'purchase' ? '仕入' : product.oldProductType || '-'}
                                                            </span>
                                                            {' → '}
                                                            <span style={{ color: '#28a745', fontWeight: '500' }}>
                                                                {product.newProductType === 'own' ? '自社' : product.newProductType === 'purchase' ? '仕入' : product.newProductType || '-'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        product.newProductType === 'own' ? '自社' : product.newProductType === 'purchase' ? '仕入' : product.newProductType || '-'
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {product.oldManagementStatus !== product.newManagementStatus ? (
                                                        <>
                                                            <span style={{ color: '#999', textDecoration: 'line-through' }}>
                                                                {product.oldManagementStatus === 'managed' ? '管理中' : product.oldManagementStatus === 'unmanaged' ? '管理外' : product.oldManagementStatus || '-'}
                                                            </span>
                                                            {' → '}
                                                            <span style={{ color: '#28a745', fontWeight: '500' }}>
                                                                {product.newManagementStatus === 'managed' ? '管理中' : product.newManagementStatus === 'unmanaged' ? '管理外' : product.newManagementStatus || '-'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        product.newManagementStatus === 'managed' ? '管理中' : product.newManagementStatus === 'unmanaged' ? '管理外' : product.newManagementStatus || '-'
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem', color: hasInvalidCategory ? '#dc2626' : 'inherit', fontWeight: hasInvalidCategory ? '600' : 'normal' }}>
                                                    {product.oldCategoryName !== product.newCategoryName ? (
                                                        <>
                                                            <span style={{ color: '#999', textDecoration: 'line-through' }}>{product.oldCategoryName || '-'}</span>
                                                            {' → '}
                                                            <span style={{ color: hasInvalidCategory ? '#dc2626' : '#28a745', fontWeight: '500' }}>
                                                                {product.newCategoryName || '-'}
                                                                {hasInvalidCategory && ' (未登録)'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {product.newCategoryName || '-'}
                                                            {hasInvalidCategory && ' (未登録)'}
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <button
                        onClick={handleApply}
                        disabled={loading || totalSelected === 0}
                        style={{
                            padding: '0.75rem 2rem',
                            backgroundColor: loading || totalSelected === 0 ? '#ccc' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading || totalSelected === 0 ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            fontSize: '1rem'
                        }}
                    >
                        {loading ? '登録・更新中...' : `登録・更新（${totalSelected}件）`}
                    </button>
                </div>
            )}
        </div>
    );
}
