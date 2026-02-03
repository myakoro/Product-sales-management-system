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
    const [asin, setAsin] = useState(''); // V1.51追加

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
                    managementStatus,
                    asin // V1.51追加
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
        <div className="min-h-screen bg-neutral-50">
            <header className="bg-rinori-navy border-b-2 border-rinori-gold px-6 py-4 shadow-md mb-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-xl font-semibold text-white">Rinori 売上管理システム</h1>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6">
                <div className="mb-6">
                    <Link href={fromCandidates ? '/products/candidates' : '/products'} className="flex items-center gap-2 text-rinori-navy hover:text-rinori-gold transition-colors duration-200 font-medium">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {fromCandidates ? '新商品候補一覧に戻る' : '商品マスタ一覧に戻る'}
                    </Link>
                </div>

                <h2 className="text-2xl font-bold text-rinori-navy mb-6">商品マスタ新規登録</h2>

                <form onSubmit={handleSubmit} className="bg-white border-2 border-neutral-200 rounded-lg p-8 shadow-md space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">
                            商品コード <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={productCode}
                            onChange={(e) => setProductCode(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                            placeholder="RINO-XXXXX"
                        />
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-white border-2 border-orange-200 rounded-lg p-4">
                        <label className="block text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.53.406-3.045.61-4.516.61-2.265 0-4.463-.42-6.588-1.265-2.11-.84-3.987-2.033-5.63-3.582-.22-.21-.304-.433-.247-.663.043-.18.148-.3.314-.36z"/>
                            </svg>
                            ASIN (Amazon)
                        </label>
                        <input
                            type="text"
                            value={asin}
                            onChange={(e) => setAsin(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-orange-300 rounded-md focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                            placeholder="B07W4B3RGM"
                        />
                        <p className="text-xs text-neutral-600 mt-2 flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Amazon売上CSV取込時の紐付けに使用します
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">
                            商品名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                販売価格（税別）
                            </label>
                            <input
                                type="number"
                                value={salesPrice}
                                onChange={(e) => setSalesPrice(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                                placeholder="0"
                            />
                            <p className="text-xs text-neutral-500 mt-2">
                                未設定の場合は0として登録されます
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                原価（税別）
                            </label>
                            <input
                                type="number"
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                                placeholder="0"
                            />
                            <p className="text-xs text-neutral-500 mt-2">
                                未設定の場合は0として登録されます
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                商品区分 <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={productType}
                                onChange={(e) => setProductType(e.target.value as 'own' | 'purchase')}
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                            >
                                <option value="own">自社</option>
                                <option value="purchase">仕入</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                管理ステータス <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={managementStatus}
                                onChange={(e) => setManagementStatus(e.target.value as 'managed' | 'unmanaged')}
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                            >
                                <option value="managed">管理中</option>
                                <option value="unmanaged">管理外</option>
                            </select>
                        </div>
                    </div>

                    {managementStatus === 'managed' && (!salesPrice || !cost) && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-md p-4 flex items-start gap-3">
                            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-amber-800">
                                「管理中」の商品で販売価格または原価が未設定の場合、トップページに警告が表示されます。
                            </p>
                        </div>
                    )}

                    <div className="flex gap-4 pt-6 border-t-2 border-neutral-200">
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-rinori-navy text-white rounded-md hover:bg-rinori-navy/90 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                        >
                            登録
                        </button>
                        <Link
                            href={fromCandidates ? '/products/candidates' : '/products'}
                            className="px-6 py-2.5 border-2 border-neutral-300 rounded-md hover:bg-neutral-50 transition-all duration-200 font-medium inline-flex items-center"
                        >
                            キャンセル
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function NewProductPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">読み込み中...</div>}>
            <NewProductForm />
        </Suspense>
    );
}
