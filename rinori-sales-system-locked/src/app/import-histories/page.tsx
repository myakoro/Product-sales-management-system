'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type SalesChannel = {
    id: number;
    name: string;
};

type ImportHistory = {
    id: number;
    importType: string;
    targetYm: string | null;
    importMode: string | null;
    comment: string | null;
    recordCount: number;
    importedAt: string;
    importedBy: {
        id: number;
        username: string;
    };
    salesChannel: {
        id: number;
        name: string;
    } | null;
};

type ApiResponse = {
    data: ImportHistory[];
    total: number;
    limit: number;
    offset: number;
};

export default function ImportHistoriesPage() {
    const [histories, setHistories] = useState<ImportHistory[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);

    const [filterChannelId, setFilterChannelId] = useState('');
    const [filterFromYm, setFilterFromYm] = useState('');
    const [filterToYm, setFilterToYm] = useState('');

    const [showChannelModal, setShowChannelModal] = useState(false);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
    const [newChannelId, setNewChannelId] = useState('');

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    useEffect(() => {
        fetch('/api/sales-channels?activeOnly=true')
            .then(res => res.json())
            .then(data => setSalesChannels(data))
            .catch(err => console.error('Failed to fetch sales channels:', err));
    }, []);

    const fetchHistories = async () => {
        setLoading(true);
        try {
            let url = '/api/import-histories?limit=100';
            if (filterChannelId) url += `&salesChannelId=${filterChannelId}`;
            if (filterFromYm) url += `&fromYm=${filterFromYm}`;
            if (filterToYm) url += `&toYm=${filterToYm}`;

            const res = await fetch(url);
            if (res.ok) {
                const data: ApiResponse = await res.json();
                setHistories(data.data);
                setTotal(data.total);
            }
        } catch (err) {
            console.error('Failed to fetch histories:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistories();
    }, []);

    const handleSearch = () => {
        fetchHistories();
    };

    const openChannelModal = (historyId: number, currentChannelId: number | null) => {
        setSelectedHistoryId(historyId);
        setNewChannelId(currentChannelId?.toString() || '');
        setShowChannelModal(true);
    };

    const handleChannelChange = async () => {
        if (!selectedHistoryId || !newChannelId) return;

        try {
            const res = await fetch(`/api/import-histories/${selectedHistoryId}/channel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salesChannelId: parseInt(newChannelId) })
            });

            if (res.ok) {
                setShowChannelModal(false);
                fetchHistories();
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || '販路変更に失敗しました'));
            }
        } catch (err) {
            console.error('Failed to change channel:', err);
            alert('通信エラーが発生しました');
        }
    };

    const openDeleteConfirm = (historyId: number) => {
        setDeleteTargetId(historyId);
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        if (!deleteTargetId) return;

        try {
            const res = await fetch(`/api/import-histories/${deleteTargetId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setShowDeleteConfirm(false);
                fetchHistories();
            } else {
                const error = await res.json();
                alert('エラー: ' + (error.error || '削除に失敗しました'));
            }
        } catch (err) {
            console.error('Failed to delete:', err);
            alert('通信エラーが発生しました');
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('ja-JP');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <h1 className="text-lg font-semibold">Rinori 売上管理システム</h1>
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                        ダッシュボード
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <h2 className="text-2xl font-semibold mb-6">取込履歴</h2>

                <div className="bg-white border border-gray-200 rounded p-4 mb-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">販路</label>
                            <select
                                value={filterChannelId}
                                onChange={(e) => setFilterChannelId(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                            >
                                <option value="">すべて</option>
                                {salesChannels.map(ch => (
                                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">対象年月（から）</label>
                            <input
                                type="month"
                                value={filterFromYm}
                                onChange={(e) => setFilterFromYm(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">対象年月（まで）</label>
                            <input
                                type="month"
                                value={filterToYm}
                                onChange={(e) => setFilterToYm(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                        >
                            検索
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 text-sm text-gray-600">
                        {total}件の履歴
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left">取込日時</th>
                                <th className="px-4 py-3 text-left">種別</th>
                                <th className="px-4 py-3 text-left">対象年月</th>
                                <th className="px-4 py-3 text-left">モード</th>
                                <th className="px-4 py-3 text-left">販路</th>
                                <th className="px-4 py-3 text-left">コメント</th>
                                <th className="px-4 py-3 text-right">件数</th>
                                <th className="px-4 py-3 text-left">実行者</th>
                                <th className="px-4 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {histories.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                        履歴がありません
                                    </td>
                                </tr>
                            )}
                            {histories.map(h => (
                                <tr key={h.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{formatDate(h.importedAt)}</td>
                                    <td className="px-4 py-3">{h.importType === 'sales' ? '売上' : h.importType}</td>
                                    <td className="px-4 py-3">{h.targetYm || '-'}</td>
                                    <td className="px-4 py-3">
                                        {h.importMode === 'append' ? '追加' : h.importMode === 'overwrite' ? '上書き' : '-'}
                                    </td>
                                    <td className="px-4 py-3">{h.salesChannel?.name || '-'}</td>
                                    <td className="px-4 py-3 max-w-xs truncate">{h.comment || '-'}</td>
                                    <td className="px-4 py-3 text-right">{h.recordCount.toLocaleString()}</td>
                                    <td className="px-4 py-3">{h.importedBy.username}</td>
                                    <td className="px-4 py-3 text-center">
                                        {h.importType === 'sales' && (
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => openChannelModal(h.id, h.salesChannel?.id || null)}
                                                    className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                                                >
                                                    販路変更
                                                </button>
                                                <button
                                                    onClick={() => openDeleteConfirm(h.id)}
                                                    className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
                                                >
                                                    削除
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {showChannelModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">販路変更</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">新しい販路</label>
                            <select
                                value={newChannelId}
                                onChange={(e) => setNewChannelId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            >
                                <option value="">選択してください</option>
                                {salesChannels.map(ch => (
                                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => setShowChannelModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleChannelChange}
                                disabled={!newChannelId}
                                className="px-4 py-2 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">確認</h3>
                        <p className="text-gray-700 mb-6">
                            この取込に紐づく売上データがすべて削除されます。よろしいですか？
                        </p>
                        <div className="flex gap-4 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                            >
                                いいえ
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:opacity-90"
                            >
                                はい、削除する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
