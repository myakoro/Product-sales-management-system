"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const pathname = usePathname();

    if (!session) return null;

    const navItems = [
        { label: 'ダッシュボード', href: '/', icon: '📊' },
        { label: '商品予算vs実績', href: '/budget/vs-actual', icon: '📈', priority: true },
        { label: '月次・期間PL', href: '/pl', icon: '💰', priority: true },
        { label: '商品別PL', href: '/pl/products', icon: '📊', priority: true },
        { label: '商品マスタ', href: '/products', icon: '📦' },
        { label: '売上取込', href: '/import/sales', icon: '📥' },
        { label: '広告費管理', href: '/ad-expenses', icon: '💳' },
        { label: '設定', href: '/settings', icon: '⚙️' },
    ];

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <header className="sticky top-0 z-50 bg-gradient-to-r from-[#00214d] via-[#002855] to-[#00214d] backdrop-blur-md bg-opacity-95 shadow-lg border-b-2 border-[#d4af37]">
            <div className="max-w-[1800px] mx-auto px-6 h-16 flex justify-between items-center">
                {/* Logo & Brand */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="group flex items-center gap-3 transition-transform hover:scale-105">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#d4af37] to-[#f4d03f] rounded-lg flex items-center justify-center shadow-md group-hover:shadow-xl transition-shadow">
                            <span className="text-[#00214d] font-bold text-xl">R</span>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-lg leading-tight">Rinori</h1>
                            <p className="text-[#d4af37] text-xs font-medium">売上管理システム</p>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden xl:block">
                        <ul className="flex gap-1">
                            {navItems.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`
                                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                            ${isActive(item.href)
                                                ? 'bg-[#d4af37] text-[#00214d] shadow-md'
                                                : item.priority
                                                    ? 'text-[#d4af37] hover:bg-white/10 hover:text-white'
                                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                            }
                                        `}
                                    >
                                        <span className="text-base">{item.icon}</span>
                                        <span className="whitespace-nowrap">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* User Info & Actions */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#d4af37] to-[#f4d03f] rounded-full flex items-center justify-center text-[#00214d] font-bold text-sm shadow-md">
                            {user?.name?.charAt(0) || "G"}
                        </div>
                        <div className="text-left">
                            <p className="text-white text-sm font-medium leading-tight">{user?.name || "ゲスト"}</p>
                            <p className="text-[#d4af37] text-xs">
                                {user?.role === 'master' ? 'マスター' : 'スタッフ'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all duration-200 border border-white/20 hover:border-[#d4af37] hover:shadow-md"
                    >
                        ログアウト
                    </button>
                </div>
            </div>
        </header>
    );
}
