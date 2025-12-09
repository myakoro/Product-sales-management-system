"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
    const { data: session } = useSession();
    const user = session?.user as any;

    return (
        <header style={{
            backgroundColor: 'white',
            borderBottom: '1px solid #e0e0e0',
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Rinori 売上管理システム</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#666' }}>
                    ユーザー: {user?.name || "ゲスト"} ({user?.role === 'master' ? 'マスター権限' : 'スタッフ権限'})
                </span>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                    }}>
                    ログアウト
                </button>
            </div>
        </header>
    );
}
