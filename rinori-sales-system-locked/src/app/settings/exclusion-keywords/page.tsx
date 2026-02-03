"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ExclusionKeyword {
    id: number;
    keyword: string;
    matchType: string;
    createdAt: string;
}

export default function ExclusionKeywordsSettingsPage() {
    const [keywords, setKeywords] = useState<ExclusionKeyword[]>([]);
    const [loading, setLoading] = useState(false);
    const [newKeyword, setNewKeyword] = useState("");
    const [matchType, setMatchType] = useState("startsWith"); // startsWith or contains
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchKeywords();
    }, []);

    const fetchKeywords = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/exclusion-keywords');
            if (res.ok) {
                const data = await res.json();
                setKeywords(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyword.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/settings/exclusion-keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: newKeyword, matchType })
            });

            if (res.ok) {
                setNewKeyword("");
                setMatchType("startsWith");
                fetchKeywords();
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

    const handleDelete = async (id: number) => {
        if (!confirm("本当に削除しますか？")) return;

        try {
            const res = await fetch(`/api/settings/exclusion-keywords/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchKeywords();
            } else {
                alert("削除に失敗しました");
            }
        } catch (e) {
            console.error(e);
            alert("エラーが発生しました");
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50">
            <header className="bg-rinori-navy border-b-2 border-rinori-gold px-6 py-4 shadow-md">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-white">除外キーワード設定（売上取込）</h1>
                    <Link href="/settings" className="px-4 py-2 text-white hover:text-rinori-gold transition-colors duration-200 font-medium">
                        設定に戻る
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="bg-white rounded-lg shadow-md border-2 border-neutral-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-rinori-navy mb-4">新規除外ルールの追加</h2>
                    <p className="text-sm text-neutral-600 mb-4 flex items-start gap-2">
                        <svg className="w-5 h-5 text-rinori-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                            ここで登録したキーワードに一致する商品（SKU）は、売上CSVの取込時に自動的に除外されます。
                            SKU変換前の元のコードに対して判定されます。
                        </span>
                    </p>
                    <form onSubmit={handleCreate} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">除外したいキーワード</label>
                            <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                placeholder="例: RINO-FR014-B"
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                                required
                            />
                        </div>
                        <div className="w-48">
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">判定タイプ</label>
                            <select
                                value={matchType}
                                onChange={(e) => setMatchType(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                            >
                                <option value="startsWith">前方一致</option>
                                <option value="contains">部分一致</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                        >
                            追加
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-lg shadow-md border-2 border-neutral-200 overflow-hidden">
                    <div className="p-4 border-b-2 border-neutral-200 bg-rinori-navy">
                        <h2 className="font-bold text-white">登録済み除外ルール一覧</h2>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <svg className="animate-spin h-8 w-8 text-rinori-navy mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-neutral-500">読み込み中...</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-100 text-neutral-700">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">キーワード</th>
                                    <th className="px-6 py-3 font-semibold">判定タイプ</th>
                                    <th className="px-6 py-3 font-semibold">登録日</th>
                                    <th className="px-6 py-3 font-semibold">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {keywords.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <svg className="w-16 h-16 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p className="text-neutral-400">登録された除外ルールはありません</p>
                                        </td>
                                    </tr>
                                )}
                                {keywords.map((item) => (
                                    <tr key={item.id} className="hover:bg-rinori-cream/30 transition-colors">
                                        <td className="px-6 py-4 font-mono font-medium text-neutral-800">{item.keyword}</td>
                                        <td className="px-6 py-4 text-neutral-600">
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 border border-neutral-300">
                                                {item.matchType === 'startsWith' ? '前方一致' : '部分一致'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-500">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-600 hover:text-red-800 font-medium transition-colors duration-200"
                                            >
                                                削除
                                            </button>
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
