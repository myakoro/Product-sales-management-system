
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function NextEngineSettingsPage() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [authStatus, setAuthStatus] = useState<{
        connected: boolean;
        updatedAt?: string;
    }>({ connected: false });

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/auth/nextengine/status');
                const data = await res.json();
                if (data.connected) {
                    setAuthStatus({
                        connected: true,
                        updatedAt: new Date(data.updatedAt).toLocaleString()
                    });
                }
            } catch (error) {
                console.error('Failed to fetch NE status:', error);
            }
        };

        fetchStatus();

        // URLパラメータのチェック
        const params = new URLSearchParams(window.location.search);
        if (params.get('auth') === 'success') {
            alert('ネクストエンジンとの連携に成功しました！');
            // パラメータを消すためにリダイレクト（任意）
            window.history.replaceState({}, '', window.location.pathname);
        } else if (params.get('auth') === 'error') {
            alert('連携に失敗しました。ClientIDやシークレット、RedirectURIの設定を確認してください。');
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleConnect = () => {
        setIsLoading(true);
        // GET /api/auth/nextengine/login へリダイレクト
        window.location.href = '/api/auth/nextengine/login';
    };

    return (
        <div className="min-h-screen bg-neutral-50 py-8 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/settings" className="text-neutral-500 hover:text-[#00214d]">
                        ← 設定に戻る
                    </Link>
                    <h1 className="text-3xl font-bold text-[#00214d]">ネクストエンジン連携設定</h1>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-8 mb-8">
                    <h2 className="text-xl font-bold text-[#00214d] mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-[#d4af37] rounded-full"></span>
                        API接続ステータス
                    </h2>

                    <div className="flex items-center justify-between p-6 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="flex items-center gap-4">
                            <div className={`w-4 h-4 rounded-full ${authStatus.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-neutral-300'}`}></div>
                            <div>
                                <p className="font-bold text-lg">
                                    {authStatus.connected ? '接続済み' : '未接続'}
                                </p>
                                {authStatus.updatedAt && (
                                    <p className="text-sm text-neutral-500">最終更新: {authStatus.updatedAt}</p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleConnect}
                            disabled={isLoading}
                            className={`px-6 py-2 rounded-lg font-bold transition-all ${isLoading
                                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                : 'bg-[#00214d] text-white hover:bg-[#00337a] shadow-md hover:shadow-lg'
                                }`}
                        >
                            {isLoading ? '処理中...' : authStatus.connected ? '再連携する' : 'ネクストエンジンと連携する'}
                        </button>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                        <p className="font-bold mb-1">💡 ヒント</p>
                        <p>連携を開始すると、ネクストエンジンのログイン画面に移動します。許可を行うと本システムに戻り、データの自動取得が可能になります。</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-8">
                    <h2 className="text-xl font-bold text-[#00214d] mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-[#d4af37] rounded-full"></span>
                        店舗マッピング設定
                    </h2>

                    <p className="text-neutral-600 mb-6">
                        ネクストエンジンの「店舗ID」を、Rinori側のどの「販路」として集計するか設定します。
                        連携完了後に店舗一覧が取得可能になります。
                    </p>

                    <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50">
                        <p className="text-neutral-400">
                            まずはネクストエンジンとの連携を完了させてください
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
