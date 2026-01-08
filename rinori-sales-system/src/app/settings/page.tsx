'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

type SettingItem = {
    title: string;
    description: string;
    href: string;
    icon: string;
    color: string;
};

export default function SettingsPage() {
    const { data: session } = useSession();
    const user = session?.user as any;

    const generalSettings: SettingItem[] = [
        {
            title: 'アカウント設定',
            description: 'ユーザー名、パスワードの変更',
            href: '/settings/account',
            icon: '👤',
            color: 'from-blue-400 to-blue-600'
        }
    ];

    const masterSettings: SettingItem[] = [
        {
            title: '販路マスタ',
            description: '販売チャネルの登録・管理',
            href: '/settings/sales-channels',
            icon: '🏪',
            color: 'from-green-400 to-emerald-600'
        },
        {
            title: '広告カテゴリー',
            description: '広告費の分類カテゴリー管理',
            href: '/ad-expenses?tab=categories',
            icon: '📢',
            color: 'from-orange-400 to-red-600'
        },
        {
            title: '除外キーワード設定',
            description: '売上取込時の除外ルール設定',
            href: '/settings/exclusion-keywords',
            icon: '🚫',
            color: 'from-red-400 to-rose-600'
        },
        {
            title: '商品予算設定',
            description: '商品別の販売目標数量設定',
            href: '/budget',
            icon: '🎯',
            color: 'from-purple-400 to-violet-600'
        },
        {
            title: 'カテゴリー管理',
            description: '商品カテゴリーの作成・編集・紐付け管理',
            href: '/settings/categories',
            icon: '📁',
            color: 'from-amber-400 to-orange-600'
        },
        {
            title: 'ネクストエンジン連携',
            description: 'NE API連携の認証・店舗紐付け設定',
            href: '/settings/nextengine',
            icon: '🔄',
            color: 'from-blue-500 to-indigo-700'
        }
    ];

    const systemSettings: SettingItem[] = [
        {
            title: 'ユーザー管理',
            description: 'システムユーザーの追加・編集',
            href: '/settings/users',
            icon: '👥',
            color: 'from-cyan-400 to-blue-600'
        },
        {
            title: '税率設定',
            description: '消費税率の設定',
            href: '/settings/tax-rates',
            icon: '💹',
            color: 'from-indigo-400 to-purple-600'
        },
        {
            title: 'データエクスポート',
            description: 'データベースのバックアップ',
            href: '/settings/export',
            icon: '📤',
            color: 'from-teal-400 to-cyan-600'
        },
        {
            title: 'データ復元',
            description: 'バックアップからの復元',
            href: '/settings/import',
            icon: '📥',
            color: 'from-pink-400 to-rose-600'
        }
    ];

    const renderSettingCard = (item: SettingItem) => (
        <Link
            key={item.href}
            href={item.href}
            className="group block bg-white rounded-xl shadow-lg border-2 border-neutral-200 p-6 hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
        >
            <div className="flex items-start gap-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0`}>
                    {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[#00214d] mb-1 group-hover:text-[#d4af37] transition-colors">
                        {item.title}
                    </h3>
                    <p className="text-sm text-neutral-600 line-clamp-2">
                        {item.description}
                    </p>
                </div>
                <div className="text-neutral-400 group-hover:text-[#d4af37] group-hover:translate-x-1 transition-all text-xl flex-shrink-0">
                    →
                </div>
            </div>
        </Link>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50">
            <main className="max-w-[1400px] mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#00214d] mb-2">設定</h1>
                    <p className="text-neutral-600">システムの各種設定を管理します</p>
                </div>

                {/* 一般設定 */}
                <section className="mb-10">
                    <h2 className="text-xl font-bold text-[#00214d] mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-[#d4af37] rounded-full"></span>
                        一般設定
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {generalSettings.map(renderSettingCard)}
                    </div>
                </section>

                {/* マスター管理 */}
                <section className="mb-10">
                    <h2 className="text-xl font-bold text-[#00214d] mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-[#d4af37] rounded-full"></span>
                        マスター管理
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {masterSettings.map(renderSettingCard)}
                    </div>
                </section>

                {/* システム管理 (マスター権限のみ) */}
                {user?.role === 'master' && (
                    <section>
                        <h2 className="text-xl font-bold text-[#00214d] mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-[#d4af37] rounded-full"></span>
                            システム管理
                            <span className="ml-2 px-3 py-1 bg-[#d4af37] text-[#00214d] rounded-full text-xs font-bold">マスター限定</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {systemSettings.map(renderSettingCard)}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
