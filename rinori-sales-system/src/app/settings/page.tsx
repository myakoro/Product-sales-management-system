'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
    const { data: session } = useSession();
    const user = session?.user as any;

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>設定</h1>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* 一般設定 */}
                <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>一般</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <li>
                            <Link href="/settings/account" style={{ color: '#0070f3', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>アカウント設定</span>
                                <span style={{ color: '#ccc' }}>&gt;</span>
                            </Link>
                        </li>
                    </ul>
                </section>

                {/* マスター管理 */}
                <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>マスター管理</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <li>
                            <Link href="/settings/sales-channels" style={{ color: '#0070f3', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>販路マスタ</span>
                                <span style={{ color: '#ccc' }}>&gt;</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/ad-expenses?tab=categories" style={{ color: '#0070f3', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>広告カテゴリー</span>
                                <span style={{ color: '#ccc' }}>&gt;</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/settings/exclusion-keywords" style={{ color: '#0070f3', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>除外キーワード設定</span>
                                <span style={{ color: '#ccc' }}>&gt;</span>
                            </Link>
                        </li>
                    </ul>
                </section>

                {/* システム管理 (マスター権限のみ) */}
                {user?.role === 'master' && (
                    <section style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>システム管理</h2>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <li>
                                <Link href="/settings/users" style={{ color: '#0070f3', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>ユーザー管理</span>
                                    <span style={{ color: '#ccc' }}>&gt;</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/settings/tax-rates" style={{ color: '#0070f3', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>税率設定</span>
                                    <span style={{ color: '#ccc' }}>&gt;</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/settings/export" style={{ color: '#0070f3', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>データエクスポート</span>
                                    <span style={{ color: '#ccc' }}>&gt;</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/settings/import" style={{ color: '#0070f3', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>データ復元</span>
                                    <span style={{ color: '#ccc' }}>&gt;</span>
                                </Link>
                            </li>
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
}
