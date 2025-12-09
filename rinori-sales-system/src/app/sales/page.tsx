"use client";

import { useState } from "react";
import Link from "next/link";

export default function SalesImportPage() {
    const [formData, setFormData] = useState({
        targetYm: "",
        importMode: "append",
        comment: "",
        file: null as File | null,
    });


    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, file: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check file
        if (!formData.file) {
            alert("CSVファイルを選択してください");
            return;
        }

        // 上書きモードの場合は確認ダイアログを表示
        if (formData.importMode === "overwrite") {
            setShowConfirmDialog(true);
            return;
        }

        executeImport();
    };

    const executeImport = async () => {
        setShowConfirmDialog(false);
        setLoading(true);

        try {
            const uploadData = new FormData();
            uploadData.append("targetYm", formData.targetYm);
            uploadData.append("importMode", formData.importMode);
            uploadData.append("comment", formData.comment);
            if (formData.file) {
                uploadData.append("file", formData.file);
            }

            const res = await fetch("/api/sales/import", {
                method: "POST",
                body: uploadData,
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("API Error Response:", res.status, errorText);
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || `Server Error: ${res.status}`);
                } catch (e: any) {
                    throw new Error(`Server Error: ${res.status} - ${errorText.substring(0, 100)}`);
                }
            }

            const data = await res.json();

            if (res.ok && data.success) {
                let msg = data.message || `取込完了: ${data.count}件のデータを登録しました。`;
                if (data.skippedCodes && data.skippedCodes.length > 0 && !data.message) {
                    msg += `\n\n【注意】${data.skippedCodes.length}件の商品がマスタ未登録のため「新商品候補」として登録されました。`;
                }

                if (data.skippedCodes && data.skippedCodes.length > 0) {
                    msg += "\n\n「新商品候補一覧」画面へ移動しますか？";
                    if (confirm(msg)) {
                        // TODO: navigate to candidates page
                        window.location.href = "/products/candidates"; // using window.location for full refresh or router.push
                        return;
                    }
                } else {
                    alert(msg);
                }
                setFormData({ ...formData, file: null });
            } else {
                alert(data.error || "取込に失敗しました");
            }

        } catch (err: any) {
            console.error("Import Error Detail:", err);
            alert(`エラーが発生しました: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
                <h1 className="text-lg font-semibold">Rinori 売上管理システム</h1>
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-sm text-gray-600 hover:text-primary">
                        ダッシュボード
                    </Link>
                    <span className="text-sm text-gray-600">ユーザー: 管理者</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <h2 className="text-2xl font-semibold mb-6">売上CSV取込</h2>

                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
                    <p className="text-sm text-blue-800">
                        ネクストエンジンの売上CSVをアップロードすると、月次PL・商品別PL・予算vs実績が即時更新されます。
                        <br />
                        ※CSVには「商品コード」「受注数」「小計」が含まれている必要があります。
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded p-6">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                対象年月 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="month"
                                required
                                value={formData.targetYm}
                                onChange={(e) =>
                                    setFormData({ ...formData, targetYm: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                取込モード <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="append"
                                        checked={formData.importMode === "append"}
                                        onChange={(e) =>
                                            setFormData({ ...formData, importMode: e.target.value })
                                        }
                                        className="mr-2"
                                    />
                                    <span>追加（既存データに追加）</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="overwrite"
                                        checked={formData.importMode === "overwrite"}
                                        onChange={(e) =>
                                            setFormData({ ...formData, importMode: e.target.value })
                                        }
                                        className="mr-2"
                                    />
                                    <span className="text-red-600">上書き（対象年月のデータを全て削除して上書き）</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">コメント</label>
                            <input
                                type="text"
                                value={formData.comment}
                                onChange={(e) =>
                                    setFormData({ ...formData, comment: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                                placeholder="任意のコメント"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                CSVファイル <span className="text-red-500">*</span>
                            </label>
                            {/* file input value can't be controlled typically, but checking null */}
                            <input
                                type="file"
                                accept=".csv"
                                required // Browser validation
                                onChange={handleFileChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded"
                            // Resetting file input value requires ref, but simplified here by not binding value
                            // Ideally use ref to clear file input visual.
                            />
                            {formData.file && (
                                <p className="text-sm text-gray-600 mt-2">
                                    選択ファイル: {formData.file.name}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-6 py-2 bg-primary text-white rounded hover:opacity-90 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? '取込中...' : '取込実行'}
                        </button>
                        <Link
                            href="/"
                            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                        >
                            キャンセル
                        </Link>
                    </div>
                </form>

                {/* 上書き確認ダイアログ */}
                {showConfirmDialog && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md">
                            <h3 className="text-lg font-semibold mb-4">確認</h3>
                            <p className="text-gray-700 mb-6">
                                対象年月（{formData.targetYm}）のデータを全て削除して上書きします。よろしいですか？
                            </p>
                            <div className="flex gap-4 justify-end">
                                <button
                                    onClick={() => setShowConfirmDialog(false)}
                                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    いいえ
                                </button>
                                <button
                                    onClick={executeImport}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:opacity-90"
                                >
                                    はい
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
