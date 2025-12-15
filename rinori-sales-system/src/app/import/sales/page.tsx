"use client";

import { useState, useEffect } from "react";
import { parseSalesCsv, SalesCsvRow } from "@/lib/csv-parser";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SalesImportPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [targetYm, setTargetYm] = useState("2024-12"); // Default to current month or meaningful default
    const [mode, setMode] = useState("append");
    const [comment, setComment] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [previewRows, setPreviewRows] = useState<SalesCsvRow[]>([]);
    const [error, setError] = useState("");
    const [channels, setChannels] = useState<{ id: number, name: string }[]>([]);
    const [salesChannelId, setSalesChannelId] = useState("");

    useEffect(() => {
        // Fetch channels on mount
        fetch('/api/settings/sales-channels')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const active = data.filter((c: any) => c.isActive);
                    setChannels(active);
                }
            })
            .catch(err => console.error(err));
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setError("");

            try {
                const rows = await parseSalesCsv(f);
                if (rows.length === 0) {
                    setError("CSVファイルにデータが含まれていません");
                    setPreviewRows([]);
                    return;
                }
                setPreviewRows(rows);
            } catch (err) {
                console.error(err);
                setError("CSVの解析に失敗しました");
                setPreviewRows([]);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || previewRows.length === 0) return;
        if (!salesChannelId) {
            setError("販路を選択してください");
            return;
        }

        if (mode === 'overwrite') {
            if (!confirm(`${targetYm} のデータを全て削除して上書きします。よろしいですか？`)) {
                return;
            }
        }

        setIsUploading(true);
        try {
            const res = await fetch("/api/import/sales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetYm,
                    mode,
                    comment,
                    salesChannelId: Number(salesChannelId),
                    rows: previewRows,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                alert(`取込完了しました。\n登録件数: ${data.insertedCount}\n新商品候補: ${data.newCandidatesCount}`);
                // Refresh or redirect?
                // Ideally redirect to history or dashboard.
                // For now stay or clear?
                setFile(null);
                setPreviewRows([]);
                // router.push("/import/history"); // If exists
            } else {
                const errData = await res.json();
                setError(errData.error || "取込に失敗しました");
            }
        } catch (err) {
            console.error(err);
            setError("通信エラーが発生しました");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <div className="bg-white border-b border-gray-200 px-6 py-3 mb-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-semibold">売上CSV取込</h1>
                    <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                        ダッシュボードへ戻る
                    </Link>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 pb-12">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-sm border border-gray-200 space-y-6">

                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">対象年月</label>
                            <input
                                type="month"
                                required
                                value={targetYm}
                                onChange={(e) => setTargetYm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">取込モード</label>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="append"
                                        checked={mode === 'append'}
                                        onChange={(e) => setMode(e.target.value)}
                                        className="mr-2"
                                    />
                                    追加 (Append)
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="overwrite"
                                        checked={mode === 'overwrite'}
                                        onChange={(e) => setMode(e.target.value)}
                                        className="mr-2"
                                    />
                                    上書き (Overwrite)
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">販路 <span className="text-red-500">*</span></label>
                        <select
                            value={salesChannelId}
                            onChange={(e) => setSalesChannelId(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
                        >
                            <option value="">選択してください</option>
                            {channels.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">CSVファイル選択</label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            required
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            ネクストエンジン形式の売上CSV (Shift_JIS対応)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">コメント (任意)</label>
                        <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="例: 10月前半売上分"
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                    </div>

                    {previewRows.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-sm font-medium mb-2">プレビュー (先頭5件 / 全{previewRows.length}件)</h3>
                            <div className="overflow-x-auto border border-gray-200 rounded">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-700">
                                        <tr>
                                            <th className="px-4 py-2">商品コード(SKU)</th>
                                            <th className="px-4 py-2">商品名</th>
                                            <th className="px-4 py-2 text-right">数量</th>
                                            <th className="px-4 py-2 text-right">税込金額</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {previewRows.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2 font-mono">{row.productCode}</td>
                                                <td className="px-4 py-2">{row.productName}</td>
                                                <td className="px-4 py-2 text-right">{row.quantity}</td>
                                                <td className="px-4 py-2 text-right">¥{row.salesAmount税込.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={isUploading || !file}
                            className={`w-full py-3 rounded text-white font-medium
                                ${isUploading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-600'}
                            `}
                        >
                            {isUploading ? '取込中...' : '取込実行'}
                        </button>
                    </div>
                </form>
            </main>
        </div >
    );
}
