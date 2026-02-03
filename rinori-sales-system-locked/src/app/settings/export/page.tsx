'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DataExportPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // マスター権限チェック
    if (status === 'loading') {
        return <div className="p-8">読み込み中...</div>;
    }

    if (!session || (session.user as any).role !== 'master') {
        router.push('/');
        return null;
    }

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);

        try {
            const response = await fetch('/api/export/database');

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'エクスポートに失敗しました');
            }

            // ファイルをダウンロード
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // ファイル名を取得（Content-Dispositionヘッダーから）
            const contentDisposition = response.headers.get('Content-Disposition');
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
            const filename = filenameMatch ? filenameMatch[1] : 'database-backup.db';

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            alert('データベースのエクスポートが完了しました');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エクスポートに失敗しました');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">データエクスポート</h1>
                    <p className="mt-2 text-gray-600">
                        データベース全体をバックアップファイルとしてダウンロードできます。
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            データベースバックアップ
                        </h2>
                        <p className="text-gray-600 text-sm">
                            すべてのデータ（ユーザー、商品、売上、予算など）を含むSQLiteデータベースファイルをダウンロードします。
                        </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">
                                    重要な注意事項
                                </h3>
                                <div className="mt-2 text-sm text-yellow-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>ダウンロードしたファイルには機密情報が含まれています</li>
                                        <li>安全な場所に保管してください</li>
                                        <li>定期的にバックアップを取ることをお勧めします</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            {isExporting ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    エクスポート中...
                                </span>
                            ) : (
                                'データベースをダウンロード'
                            )}
                        </button>

                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            戻る
                        </button>
                    </div>
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        バックアップファイルの使い方
                    </h3>
                    <div className="text-sm text-blue-800 space-y-2">
                        <p>
                            ダウンロードしたSQLiteファイル（.db）は、以下の用途で使用できます:
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>別のサーバーへの移行時にデータを復元</li>
                            <li>ローカル環境でのデータ分析</li>
                            <li>災害復旧時のバックアップとして使用</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
