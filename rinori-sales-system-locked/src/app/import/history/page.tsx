"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface ImportHistory {
    id: number;
    importType: string;
    targetYm: string;
    importMode: string;
    dataSource: string; // V1.51追加
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
        <div className="min-h-screen bg-neutral-50">
            <div className="bg-rinori-navy border-b-2 border-rinori-gold px-6 py-4 mb-8 shadow-md">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-white">取込履歴管理</h1>
                    <div className="flex gap-3">
                        <Link href="/import/sales" className="px-5 py-2.5 bg-rinori-gold text-rinori-navy rounded-md hover:bg-rinori-gold/90 font-medium shadow-md hover:shadow-lg transition-all duration-200">
                            新規売上取込
                        </Link>
                        <Link href="/" className="px-5 py-2.5 text-white hover:text-rinori-gold transition-colors duration-200 font-medium">
                            ダッシュボードへ戻る
                        </Link>
                    </div>
                </div>
            </div>

            <main className="max-w-[1400px] mx-auto px-6 pb-12">
                <div className="bg-white rounded-lg shadow-md border-2 border-neutral-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <svg className="animate-spin h-8 w-8 text-rinori-navy mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-neutral-500">読み込み中...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-rinori-navy text-white font-semibold">
                                <tr>
                                    <th className="px-4 py-3 whitespace-nowrap">取込日時</th>
                                    <th className="px-4 py-3 whitespace-nowrap">種類</th>
                                    <th className="px-4 py-3 whitespace-nowrap">データソース</th>
                                    <th className="px-4 py-3 whitespace-nowrap">対象年月</th>
                                    <th className="px-4 py-3 whitespace-nowrap">モード</th>
                                    <th className="px-4 py-3 whitespace-nowrap">販路</th>
                                    <th className="px-4 py-3 whitespace-nowrap">コメント</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">件数</th>
                                    <th className="px-4 py-3 whitespace-nowrap">実行者</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {histories.map((h) => (
                                    <tr key={h.id} className="hover:bg-rinori-cream/30 transition-colors">
                                        <td className="px-4 py-3 text-neutral-600 text-sm">{formatDate(h.importedAt)}</td>
                                        <td className="px-4 py-3 text-neutral-700 font-medium">
                                            {h.importType === 'sales' ? '売上' : h.importType}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${h.dataSource === 'Amazon'
                                                ? 'bg-orange-50 text-orange-700 border-orange-300'
                                                : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                                                }`}>
                                                {h.dataSource === 'Amazon' && (
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.53.406-3.045.61-4.516.61-2.265 0-4.463-.42-6.588-1.265-2.11-.84-3.987-2.033-5.63-3.582-.22-.21-.304-.433-.247-.663.043-.18.148-.3.314-.36z"/>
                                                    </svg>
                                                )}
                                                {h.dataSource || 'NE'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-neutral-700">{h.targetYm}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${h.importMode === 'overwrite'
                                                ? 'bg-red-50 text-red-700 border-red-300'
                                                : 'bg-blue-50 text-blue-700 border-blue-300'
                                                }`}>
                                                {h.importMode === 'overwrite' ? '上書き' : '追加'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-rinori-navy">
                                            {h.salesChannel?.name || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-neutral-600 max-w-xs truncate text-sm" title={h.comment || ""}>
                                            {h.comment || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-neutral-700 font-medium">
                                            {h.recordCount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-neutral-600 text-sm">
                                            {h.importedBy?.username || '不明'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {isMaster && (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(h)}
                                                        className="px-3 py-1.5 text-rinori-navy hover:bg-rinori-navy hover:text-white border border-rinori-navy rounded-md transition-all duration-200 text-sm font-medium"
                                                    >
                                                        販路変更
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(h)}
                                                        className="px-3 py-1.5 text-red-600 hover:bg-red-600 hover:text-white border border-red-600 rounded-md transition-all duration-200 text-sm font-medium"
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
                                        <td colSpan={10} className="p-12 text-center">
                                            <svg className="w-16 h-16 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-neutral-500">履歴がありません</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Edit Modal */}
                {editingHistory && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={closeEditModal}>
                        <div className="bg-white rounded-lg p-8 w-96 shadow-2xl border-2 border-rinori-gold/30 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-rinori-gold/20 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-rinori-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-rinori-navy">販路の変更</h3>
                            </div>
                            <div className="mb-6">
                                <label className="block font-semibold text-neutral-700 mb-2">
                                    新しい販路
                                </label>
                                <select
                                    value={selectedChannelId}
                                    onChange={(e) => setSelectedChannelId(e.target.value)}
                                    className="w-full border-2 border-neutral-200 rounded-md px-4 py-2.5 bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
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
                                    className="px-5 py-2.5 text-neutral-700 hover:bg-neutral-100 border-2 border-neutral-300 rounded-md transition-all duration-200 font-medium"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleSaveChannel}
                                    className="px-5 py-2.5 text-white bg-rinori-navy hover:bg-rinori-navy/90 rounded-md shadow-md hover:shadow-lg transition-all duration-200 font-medium"
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


