"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SalesChannel {
    id: number;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function SalesChannelSettingsPage() {
    const [channels, setChannels] = useState<SalesChannel[]>([]);
    const [loading, setLoading] = useState(false);
    const [newName, setNewName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/sales-channels');
            if (res.ok) {
                const data = await res.json();
                setChannels(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/settings/sales-channels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });

            if (res.ok) {
                setNewName("");
                fetchChannels();
            } else {
                alert("作成に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (id: number, updates: Partial<SalesChannel>) => {
        try {
            const res = await fetch('/api/settings/sales-channels', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...updates })
            });

            if (res.ok) {
                setEditingId(null);
                fetchChannels();
            } else {
                alert("更新に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        }
    };

    const startEditing = (channel: SalesChannel) => {
        setEditingId(channel.id);
        setEditingName(channel.name);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingName("");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <h1 className="text-lg font-semibold">販路マスタ設定</h1>
                <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                    ダッシュボードへ戻る
                </Link>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="bg-white rounded shadow border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4">新規販路追加</h2>
                    <form onSubmit={handleCreate} className="flex gap-4">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="販路名 (例: テスト店舗)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            追加
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="font-bold text-gray-700">登録済み販路一覧</h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">読み込み中...</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-6 py-3">ID</th>
                                    <th className="px-6 py-3">販路名</th>
                                    <th className="px-6 py-3">状態</th>
                                    <th className="px-6 py-3">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {channels.map((channel) => (
                                    <tr key={channel.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-500">{channel.id}</td>
                                        <td className="px-6 py-4 font-medium">
                                            {editingId === channel.id ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="px-2 py-1 border border-gray-300 rounded w-full"
                                                />
                                            ) : (
                                                channel.name
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleUpdate(channel.id, { isActive: !channel.isActive })}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border ${channel.isActive
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                                    }`}
                                            >
                                                {channel.isActive ? '有効' : '無効(非表示)'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingId === channel.id ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleUpdate(channel.id, { name: editingName })}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        保存
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="text-gray-500 hover:underline"
                                                    >
                                                        キャンセル
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(channel)}
                                                    className="text-gray-600 hover:text-blue-600"
                                                >
                                                    編集
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
