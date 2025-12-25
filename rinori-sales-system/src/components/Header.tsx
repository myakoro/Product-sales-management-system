"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const router = useRouter();

    if (!session) return null;

    const navItems = [
        { label: 'ダッシュボード', href: '/' },
        { label: '商品マスタ', href: '/products' },
        { label: '売上取込', href: '/import/sales' },
        { label: '予算設定', href: '/budget' },
        { label: 'PL分析', href: '/pl/monthly' },
        { label: '広告費管理', href: '/ad-expenses' },
        { label: '設定', href: '/settings' },
    ];

    return (
        <header style={{
            backgroundColor: 'white',
            borderBottom: '1px solid #e0e0e0',
            padding: '0 1.5rem',
            height: '64px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <h1 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0 }}>
                    <Link href="/" style={{ textDecoration: 'none', color: '#333' }}>
                        Rinori 売上管理
                    </Link>
                </h1>
                <nav>
                    <ul style={{ display: 'flex', gap: '1.25rem', listStyle: 'none', margin: 0, padding: 0 }}>
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    style={{
                                        textDecoration: 'none',
                                        color: '#555',
                                        fontSize: '0.9rem',
                                        fontWeight: 500
                                    }}
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#666' }}>
                    {user?.name || "ゲスト"} ({user?.role === 'master' ? 'マスター' : 'スタッフ'})
                </span>
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        color: '#666'
                    }}>
                    ログアウト
                </button>
            </div>
        </header>
    );
}
