"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface ImportHistory {
    id: number;
    importType: string;
    targetYm: string;
    importMode: string;
    comment: string | null;
    recordCount: number;
    importedAt: string;
    importedBy: { username: string };
    salesChannel: { id: number, name: string } | null;
}

interface SalesChannel {
    id: number;
    name: string;
}

export default function ImportHistoryPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const isMaster = userRole === 'master';

    const [histories, setHistories] = useState<ImportHistory[]>([]);
    const [channels, setChannels] = useState<SalesChannel[]>([]);
    const [loading, setLoading] = useState(false);

    // Edit Modal State
    const [editingHistory, setEditingHistory] = useState<ImportHistory | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string>("");

    useEffect(() => {
        fetchData();
        fetchChannels();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/import/history');
            if (res.ok) {
                const data = await res.json();
                setHistories(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchChannels = async () => {
        try {
            const res = await fetch('/api/settings/sales-channels');
            if (res.ok) {
                const data = await res.json();
                setChannels(data); // All channels including inactive ones if needed, or filter?
                // Spec says "Change Channel" dropdown should only show active? Usually yes.
                // But if the current one is inactive, we should handle that.
                // For now, let's just use all provided by the API (which returns all).
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (history: ImportHistory) => {
        if (!confirm(`【警告】\n対象年月: ${history.targetYm}\n販路: ${history.salesChannel?.name || 'なし'}\n\nこの取込履歴と、紐づく売上データを完全に削除します。\nよろしいですか？`)) {
            return;
        }

        try {
            const res = await fetch(`/api/import/history?id=${history.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert("削除しました");
                fetchData();
            } else {
                alert("削除に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        }
    };

    const openEditModal = (history: ImportHistory) => {
        setEditingHistory(history);
        setSelectedChannelId(history.salesChannel?.id.toString() || "");
    };

    const closeEditModal = () => {
        setEditingHistory(null);
        setSelectedChannelId("");
    };

    const handleSaveChannel = async () => {
        if (!editingHistory || !selectedChannelId) return;

        try {
            const res = await fetch('/api/import/history', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingHistory.id,
                    salesChannelId: Number(selectedChannelId)
                })
            });

            if (res.ok) {
                alert("販路を変更しました");
                closeEditModal();
                fetchData();
            } else {
                alert("変更に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('ja-JP');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-6 py-3 mb-6">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-semibold">取込履歴管理</h1>
                    <div className="flex gap-4">
                        <Link href="/import/sales" className="text-blue-600 hover:underline">
                            + 新規売上取込
                        </Link>
                        <Link href="/" className="text-gray-600 hover:text-primary">
                            ダッシュボードへ戻る
                        </Link>
                    </div>
                </div>
            </div>

            <main className="max-w-[1400px] mx-auto px-6 pb-12">
                <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">読み込み中...</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">取込日時</th>
                                    <th className="px-4 py-3 whitespace-nowrap">種類</th>
                                    <th className="px-4 py-3 whitespace-nowrap">対象年月</th>
                                    <th className="px-4 py-3 whitespace-nowrap">モード</th>
                                    <th className="px-4 py-3 whitespace-nowrap">販路</th>
                                    <th className="px-4 py-3 whitespace-nowrap">コメント</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">件数</th>
                                    <th className="px-4 py-3 whitespace-nowrap">実行者</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {histories.map((h) => (
                                    <tr key={h.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500">{formatDate(h.importedAt)}</td>
                                        <td className="px-4 py-3">
                                            {h.importType === 'sales' ? '売上' : h.importType}
                                        </td>
                                        <td className="px-4 py-3 font-mono">{h.targetYm}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${h.importMode === 'overwrite'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {h.importMode === 'overwrite' ? '上書き' : '追加'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {h.salesChannel?.name || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={h.comment || ""}>
                                            {h.comment || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            {h.recordCount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {h.importedBy?.username || '不明'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {isMaster && (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(h)}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        販路変更
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(h)}
                                                        className="text-red-600 hover:underline"
                                                    >
                                                        削除
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {histories.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-gray-500">
                                            履歴がありません
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Edit Modal */}
                {editingHistory && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeEditModal}>
                        <div className="bg-white rounded-lg p-6 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-semibold mb-4">販路の変更</h3>
                            <div className="mb-4">
                                <label className="block font-medium text-gray-700 mb-1">
                                    新しい販路
                                </label>
                                <select
                                    value={selectedChannelId}
                                    onChange={(e) => setSelectedChannelId(e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                >
                                    <option value="">選択してください</option>
                                    {channels.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={closeEditModal}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleSaveChannel}
                                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded"
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}


