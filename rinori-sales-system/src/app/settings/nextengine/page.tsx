
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type NEShop = {
    shopId: number;
    shopName: string;
};

type Channel = {
    id: number;
    name: string;
};

type NEMapping = {
    neShopId: number;
    channelId: number;
};

export default function NextEngineSettingsPage() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [authStatus, setAuthStatus] = useState<{
        connected: boolean;
        updatedAt?: string;
    }>({ connected: false });

    // 店舗マッピング関連の状態
    const [shops, setShops] = useState<NEShop[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [mappings, setMappings] = useState<NEMapping[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<{ [shopId: number]: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingMappings, setIsLoadingMappings] = useState(false);

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

    // 店舗一覧を取得
    const fetchShops = async () => {
        try {
            const res = await fetch('/api/nextengine/shops');
            if (res.ok) {
                const data = await res.json();
                setShops(data.shops || []);
            } else {
                throw new Error('Failed to fetch shops');
            }
        } catch (error) {
            console.error('Failed to fetch shops:', error);
            alert('店舗情報の取得に失敗しました。ページを再読み込みしてください。');
        }
    };

    // 販路一覧を取得
    const fetchChannels = async () => {
        try {
            const res = await fetch('/api/channels');
            if (res.ok) {
                const data = await res.json();
                setChannels(data || []);
            } else {
                throw new Error('Failed to fetch channels');
            }
        } catch (error) {
            console.error('Failed to fetch channels:', error);
            alert('店舗情報の取得に失敗しました。ページを再読み込みしてください。');
        }
    };

    // マッピング一覧を取得
    const fetchMappings = async () => {
        try {
            const res = await fetch('/api/nextengine/mappings');
            if (res.ok) {
                const data = await res.json();
                const fetchedMappings = data.mappings || [];
                setMappings(fetchedMappings);

                // 既存のマッピングをselectedChannelsに反映
                const initialSelected: { [shopId: number]: string } = {};
                fetchedMappings.forEach((mapping: NEMapping) => {
                    initialSelected[mapping.neShopId] = String(mapping.channelId);
                });
                setSelectedChannels(initialSelected);
            } else {
                throw new Error('Failed to fetch mappings');
            }
        } catch (error) {
            console.error('Failed to fetch mappings:', error);
            alert('店舗情報の取得に失敗しました。ページを再読み込みしてください。');
        }
    };

    // 店舗マッピングデータを初期ロード
    useEffect(() => {
        if (authStatus.connected) {
            setIsLoadingMappings(true);
            Promise.all([fetchShops(), fetchChannels(), fetchMappings()])
                .finally(() => setIsLoadingMappings(false));
        }
    }, [authStatus.connected]);

    // マッピングを保存
    const handleSaveMappings = async () => {
        setIsSaving(true);
        try {
            // 未設定（value=""）の行を除外
            const mappingsToSave = shops
                .filter(shop => selectedChannels[shop.shopId] && selectedChannels[shop.shopId] !== "")
                .map(shop => ({
                    neShopId: shop.shopId,
                    channelId: Number(selectedChannels[shop.shopId])
                }));

            // 順次POST
            for (const mapping of mappingsToSave) {
                const res = await fetch('/api/nextengine/mappings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mapping)
                });

                if (!res.ok) {
                    throw new Error('Failed to save mapping');
                }
            }

            alert('マッピングを保存しました');
            // 自動的にマッピング一覧を再取得
            await fetchMappings();
        } catch (error) {
            console.error('Failed to save mappings:', error);
            alert('マッピングの保存に失敗しました。もう一度お試しください。');
        } finally {
            setIsSaving(false);
        }
    };

    // プルダウン変更ハンドラー
    const handleChannelChange = (shopId: number, channelId: string) => {
        setSelectedChannels(prev => ({
            ...prev,
            [shopId]: channelId
        }));
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

                    {!authStatus.connected ? (
                        <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50">
                            <p className="text-neutral-400">
                                まずはネクストエンジンとの連携を完了させてください
                            </p>
                        </div>
                    ) : isLoadingMappings ? (
                        <div className="text-center py-12">
                            <svg className="animate-spin h-8 w-8 text-[#00214d] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-neutral-500 font-medium">店舗情報を読み込み中...</p>
                        </div>
                    ) : shops.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50">
                            <p className="text-neutral-400">
                                店舗情報が取得できませんでした
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border border-neutral-200 rounded-lg overflow-hidden">
                                    <thead>
                                        <tr className="bg-neutral-100">
                                            <th className="px-4 py-3 text-left text-sm font-bold text-[#00214d] border-b border-neutral-200">
                                                NE店舗ID
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-[#00214d] border-b border-neutral-200">
                                                NE店舗名
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-[#00214d] border-b border-neutral-200">
                                                Rinori販路
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shops.map((shop) => (
                                            <tr key={shop.shopId} className="border-b border-neutral-200 hover:bg-neutral-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-neutral-700">
                                                    {shop.shopId}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-neutral-700">
                                                    {shop.shopName}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={selectedChannels[shop.shopId] || ""}
                                                        onChange={(e) => handleChannelChange(shop.shopId, e.target.value)}
                                                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] outline-none transition-all text-sm"
                                                    >
                                                        <option value="">-- 選択してください --</option>
                                                        {channels.map((channel) => (
                                                            <option key={channel.id} value={channel.id}>
                                                                {channel.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleSaveMappings}
                                    disabled={isSaving}
                                    className={`px-6 py-2.5 rounded-lg font-bold transition-all ${
                                        isSaving
                                            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                            : 'bg-[#00214d] text-white hover:bg-[#00337a] shadow-md hover:shadow-lg'
                                    }`}
                                >
                                    {isSaving ? '保存中...' : '保存する'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
