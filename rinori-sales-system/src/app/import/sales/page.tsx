"use client";

import { useState, useEffect } from "react";
import { parseSalesCsv, SalesCsvRow } from "@/lib/csv-parser";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SalesImportPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);

    // Calculate previous month as default
    const getPreviousMonth = () => {
        const now = new Date();
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const month = now.getMonth() === 0 ? 12 : now.getMonth();
        return `${year}-${String(month).padStart(2, '0')}`;
    };

    const [targetYm, setTargetYm] = useState(getPreviousMonth());
    const [mode, setMode] = useState("append");
    const [comment, setComment] = useState("");
    const [dataSource, setDataSource] = useState<"NE" | "Amazon">("NE"); // V1.51追加
    const [isUploading, setIsUploading] = useState(false);
    const [previewRows, setPreviewRows] = useState<SalesCsvRow[]>([]);
    const [error, setError] = useState("");
    const [channels, setChannels] = useState<{ id: number, name: string }[]>([]);
    const [salesChannelId, setSalesChannelId] = useState("");

    // V1.51追加: 未登録ASIN警告用
    const [unregisteredAsins, setUnregisteredAsins] = useState<{ asin: string; title: string }[]>([]);
    const [showAsinWarning, setShowAsinWarning] = useState(false);

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
            setUnregisteredAsins([]);
            setShowAsinWarning(false);

            try {
                const rows = await parseSalesCsv(f, dataSource === 'Amazon');
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

    const handleSubmit = async (e: React.FormEvent, skipAsinCheck: boolean = false) => {
        if (e) e.preventDefault();

        if (!file || previewRows.length === 0) return;
        if (!salesChannelId) {
            setError("販路を選択してください");
            return;
        }

        if (mode === 'overwrite' && !skipAsinCheck) {
            if (!confirm(`${targetYm} のデータを全て削除して上書きします。よろしいですか？`)) {
                return;
            }
        }

        setIsUploading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("targetYm", targetYm);
            formData.append("importMode", mode);
            formData.append("comment", comment);
            formData.append("salesChannelId", salesChannelId);
            formData.append("dataSource", dataSource);
            if (skipAsinCheck) {
                formData.append("skipUnregisteredAsins", "true");
            }

            const res = await fetch("/api/import/sales", {
                method: "POST",
                body: formData, // FormDataを使用するように変更
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert(`取込完了しました。\n登録件数: ${data.importedCount}\nスキップ件数: ${data.skippedCount || 0}`);
                setFile(null);
                setPreviewRows([]);
                setComment("");
            } else if (data.error === 'unregistered_asins') {
                setUnregisteredAsins(data.unregisteredAsins);
                setShowAsinWarning(true);
            } else {
                setError(data.error || "取込に失敗しました");
            }
        } catch (err) {
            console.error(err);
            setError("通信エラーが発生しました");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50">
            <div className="bg-rinori-navy border-b-2 border-rinori-gold px-6 py-4 mb-8 shadow-md">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-white">売上CSV取込</h1>
                    <div className="flex gap-3">
                        <Link href="/import/history" className="px-5 py-2.5 bg-rinori-gold text-rinori-navy rounded-md hover:bg-rinori-gold/90 font-medium shadow-md hover:shadow-lg transition-all duration-200">
                            取込履歴
                        </Link>
                        <Link href="/" className="px-5 py-2.5 text-white hover:text-rinori-gold transition-colors duration-200 font-medium">
                            ダッシュボードへ戻る
                        </Link>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 pb-12">
                {/* CSV Template Download Section */}
                <div className="bg-gradient-to-r from-rinori-cream to-white border-2 border-rinori-gold/30 rounded-lg p-6 mb-8 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-rinori-gold/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-rinori-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-rinori-navy text-lg mb-2">
                                CSV様式をダウンロード
                            </h3>
                            <p className="text-sm text-neutral-600 mb-4">
                                ネクストエンジン以外で手動作成する場合は、この様式に従ってください
                            </p>
                            <a
                                href="/templates/sales_template.csv"
                                download="売上CSV様式.csv"
                                className="inline-block px-5 py-2.5 bg-rinori-navy text-white rounded-md hover:bg-rinori-navy/90 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                            >
                                CSV様式ダウンロード
                            </a>
                        </div>
                    </div>

                    <div className="mt-5 pt-5 border-t border-rinori-gold/20">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-rinori-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-neutral-700">
                                過去の取込履歴を確認・修正する
                            </span>
                            <Link
                                href="/import/history"
                                className="text-rinori-navy hover:text-rinori-gold text-sm font-medium ml-auto transition-colors duration-200"
                            >
                                取込履歴を見る →
                            </Link>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md border-2 border-neutral-200 space-y-6">

                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-md border-l-4 border-red-500 flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">対象年月</label>
                            <input
                                type="month"
                                required
                                value={targetYm}
                                onChange={(e) => setTargetYm(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">データソース</label>
                            <select
                                value={dataSource}
                                onChange={(e) => {
                                    setDataSource(e.target.value as "NE" | "Amazon");
                                    setPreviewRows([]);
                                    setFile(null);
                                }}
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                            >
                                <option value="NE">NE (CSV)</option>
                                <option value="Amazon">Amazon (CSV)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">販路 <span className="text-red-500">*</span></label>
                            <select
                                value={salesChannelId}
                                onChange={(e) => setSalesChannelId(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md bg-white focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200 font-medium"
                            >
                                <option value="">選択してください</option>
                                {channels.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">取込モード</label>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="append"
                                        checked={mode === 'append'}
                                        onChange={(e) => setMode(e.target.value)}
                                        className="mr-2 w-4 h-4 text-rinori-navy focus:ring-rinori-gold"
                                    />
                                    <span className="group-hover:text-rinori-navy transition-colors">追加</span>
                                </label>
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="overwrite"
                                        checked={mode === 'overwrite'}
                                        onChange={(e) => setMode(e.target.value)}
                                        className="mr-2 w-4 h-4 text-rinori-navy focus:ring-rinori-gold"
                                    />
                                    <span className="group-hover:text-rinori-navy transition-colors">上書き</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">CSVファイル選択</label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            required
                            className="block w-full text-sm text-neutral-600
                                file:mr-4 file:py-2.5 file:px-5
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-rinori-navy file:text-white
                                hover:file:bg-rinori-navy/90 file:shadow-md hover:file:shadow-lg
                                file:transition-all file:duration-200 file:cursor-pointer"
                        />
                        <p className="text-xs text-neutral-500 mt-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-rinori-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {dataSource === 'Amazon'
                                ? "Amazon ビジネスレポート (CSV)"
                                : "ネクストエンジン形式の売上CSV (Shift_JIS対応)"
                            }
                        </p>
                    </div>

                    {/* V1.51追加: 未登録ASIN警告ダイアログ */}
                    {showAsinWarning && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border-2 border-amber-200 animate-in zoom-in-95 duration-200">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                        <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-amber-700 mb-2">
                                            未登録のASINが見つかりました
                                        </h2>
                                        <p className="text-neutral-600">
                                            以下のASIN（<span className="font-semibold text-amber-700">{unregisteredAsins.length}件</span>）は商品マスタに登録されていないため、<span className="font-bold text-amber-700">スキップして取り込まれます</span>。
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto border-2 border-neutral-200 rounded-lg mb-6">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-neutral-100 sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3 border-b-2 border-neutral-200 font-semibold text-neutral-700">ASIN</th>
                                                <th className="px-4 py-3 border-b-2 border-neutral-200 font-semibold text-neutral-700">タイトル</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {unregisteredAsins.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-rinori-cream/30 transition-colors text-xs">
                                                    <td className="px-4 py-3 font-mono whitespace-nowrap text-neutral-700">{item.asin}</td>
                                                    <td className="px-4 py-3 truncate max-w-xs text-neutral-600" title={item.title}>{item.title}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-3 mt-auto">
                                    <button
                                        onClick={() => setShowAsinWarning(false)}
                                        className="px-6 py-2.5 border-2 border-neutral-300 rounded-md hover:bg-neutral-50 font-medium transition-all duration-200"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAsinWarning(false);
                                            handleSubmit(undefined as any, true);
                                        }}
                                        className="px-6 py-2.5 bg-rinori-navy text-white rounded-md hover:bg-rinori-navy/90 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                                    >
                                        スキップして続行
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">コメント (任意)</label>
                        <input
                            type="text"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="例: 10月前半売上分"
                            className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-md focus:border-rinori-gold focus:ring-2 focus:ring-rinori-gold/20 transition-all duration-200"
                        />
                    </div>

                    {previewRows.length > 0 && (
                        <div className="mt-6 bg-neutral-50 rounded-lg p-4 border-2 border-neutral-200">
                            <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-rinori-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                プレビュー (先頭5件 / 全{previewRows.length}件)
                            </h3>
                            <div className="overflow-x-auto border-2 border-neutral-200 rounded-lg bg-white">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-rinori-navy text-white">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">商品コード(SKU)</th>
                                            <th className="px-4 py-3 font-semibold">商品名</th>
                                            <th className="px-4 py-3 text-right font-semibold">数量</th>
                                            <th className="px-4 py-3 text-right font-semibold">税込金額</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {previewRows.slice(0, 5).map((row, i) => (
                                            <tr key={i} className="hover:bg-rinori-cream/30 transition-colors">
                                                <td className="px-4 py-3 font-mono text-neutral-700">{row.productCode}</td>
                                                <td className="px-4 py-3 text-neutral-700">{row.productName}</td>
                                                <td className="px-4 py-3 text-right text-neutral-700">{row.quantity}</td>
                                                <td className="px-4 py-3 text-right font-medium text-neutral-700">¥{row.salesAmount税込.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t-2 border-neutral-200">
                        <button
                            type="submit"
                            disabled={isUploading || !file}
                            className={`w-full py-3.5 rounded-md text-white font-semibold text-lg transition-all duration-200
                                ${isUploading || !file 
                                    ? 'bg-neutral-300 cursor-not-allowed' 
                                    : 'bg-rinori-navy hover:bg-rinori-navy/90 shadow-lg hover:shadow-xl'
                                }
                            `}
                        >
                            {isUploading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    取込中...
                                </span>
                            ) : '取込実行'}
                        </button>
                    </div>
                </form>
            </main>
        </div >
    );
}
