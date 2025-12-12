'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DataImportPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (status === 'loading') {
        return <div className="p-8">読み込み中...</div>;
    }

    if (!session || (session.user as any).role !== 'master') {
        router.push('/');
        return null;
    }

    const handleImport = async () => {
        if (!file) {
            alert('SQLiteの.dbファイルを選択してください');
            return;
        }

        if (!confirm('データベースを復元します。現在のデータは置き換わります。よろしいですか？')) {
            return;
        }

        setIsImporting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/import/database', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || '復元に失敗しました');
            }

            const data = await response.json();
            alert(`復元が完了しました。\nバックアップ: ${data.backupFilename || '-'}\n\n${data.message || ''}`);

            setFile(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '復元に失敗しました');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">データ復元</h1>
                    <p className="mt-2 text-gray-600">
                        SQLiteデータベース（.db）をアップロードして復元できます。
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">データベース復元</h2>
                        <p className="text-gray-600 text-sm">
                            すべてのデータ（ユーザー、商品、売上、予算など）を含むSQLiteデータベースファイルをアップロードします。
                        </p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">重要な注意事項</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>アップロードしたDBで現在のデータが置き換わります</li>
                                        <li>実行前に必ずエクスポートでバックアップを取得してください</li>
                                        <li>復元後に反映されない場合は再起動/再デプロイが必要です</li>
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

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">SQLite DBファイル（.db）</label>
                        <input
                            type="file"
                            accept=".db"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-700"
                        />
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleImport}
                            disabled={isImporting || !file}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            {isImporting ? '復元中...' : 'データベースを復元'}
                        </button>

                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            戻る
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
