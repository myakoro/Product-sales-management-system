'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { useSession } from 'next-auth/react';

type UserRow = {
    id: number;
    username: string;
    role: 'master' | 'staff';
    createdAt: string;
};

export default function UserManagementPage() {
    const { data: session, status } = useSession();
    const currentRole = (session?.user as any)?.role as 'master' | 'staff' | undefined;

    const [users, setUsers] = useState<UserRow[]>([]);
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'master' | 'staff'>('staff');
    const [initialPassword, setInitialPassword] = useState('');

    const [filter, setFilter] = useState('all');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setError('');
                const res = await fetch('/api/admin/users');
                const data = await res.json();
                if (!res.ok) {
                    setError(data.error || 'ユーザー一覧の取得に失敗しました。');
                    return;
                }
                const rows: UserRow[] = data.map((u: any) => ({
                    id: u.id,
                    username: u.username,
                    role: u.role as 'master' | 'staff',
                    createdAt: u.createdAt,
                }));
                setUsers(rows);
            } catch (err) {
                console.error(err);
                setError('ユーザー一覧の取得中にエラーが発生しました。');
            }
        };

        if (currentRole === 'master') {
            fetchUsers();
        }
    }, [currentRole]);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!username || !initialPassword) {
            setError('ユーザー名と初期パスワードを入力してください');
            return;
        }

        if (users.some((u) => u.username === username)) {
            setError('このユーザー名は既に存在します');
            return;
        }

        const createUser = async () => {
            try {
                const res = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, role, initialPassword }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'ユーザーの作成に失敗しました。');
                    return;
                }

                const newUser: UserRow = {
                    id: data.id,
                    username: data.username,
                    role: data.role as 'master' | 'staff',
                    createdAt: data.createdAt,
                };

                setUsers((prev) => [...prev, newUser]);
                setUsername('');
                setInitialPassword('');
                setRole('staff');
                setSuccessMsg('ユーザーを追加しました。初期パスワードを利用者に共有してください。');
            } catch (err) {
                console.error(err);
                setError('ユーザーの作成中にエラーが発生しました。');
            }
        };

        createUser();
    };

    const handleToggleRole = (id: number) => {
        setError('');
        setSuccessMsg('');

        const toggle = async () => {
            try {
                const res = await fetch(`/api/admin/users/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'toggleRole' }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || '権限の変更に失敗しました。');
                    return;
                }

                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === data.id
                            ? { ...u, role: data.role as 'master' | 'staff' }
                            : u
                    )
                );
                setSuccessMsg('権限を変更しました。');
            } catch (err) {
                console.error(err);
                setError('権限変更中にエラーが発生しました。');
            }
        };

        toggle();
    };

    const handleResetPassword = (id: number, username: string) => {
        setError('');

        const reset = async () => {
            try {
                const res = await fetch(`/api/admin/users/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'resetPassword' }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'パスワードリセットに失敗しました。');
                    return;
                }

                setSuccessMsg(`ユーザー「${username}」の一時パスワード: ${data.tempPassword}`);
            } catch (err) {
                console.error(err);
                setError('パスワードリセット中にエラーが発生しました。');
            }
        };

        reset();
    };

    const filteredUsers = users.filter((u) =>
        filter === 'all' ? true : filter === 'master' ? u.role === 'master' : u.role === 'staff'
    );

    const isMaster = currentRole === 'master';

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-4xl mx-auto py-10 px-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">ユーザー管理 (SC-21)</h2>

                {!isMaster ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded">
                        この画面はマスター権限ユーザーのみが利用できます。
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded mb-4 text-sm">
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="bg-green-50 text-green-600 p-4 rounded mb-4 text-sm">
                                {successMsg}
                            </div>
                        )}

                        {/* 新規ユーザー作成フォーム */}
                        <section className="bg-white p-6 rounded-lg shadow mb-8">
                            <h3 className="text-lg font-semibold mb-4 text-gray-700">ユーザー新規作成</h3>
                            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                                        ユーザー名
                                    </label>
                                    <input
                                        id="username"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">
                                        権限
                                    </label>
                                    <select
                                        id="role"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as 'master' | 'staff')}
                                        className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="master">マスター</option>
                                        <option value="staff">スタッフ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="initial-password">
                                        初期パスワード
                                    </label>
                                    <input
                                        id="initial-password"
                                        type="text"
                                        value={initialPassword}
                                        onChange={(e) => setInitialPassword(e.target.value)}
                                        className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">作成後、この値を利用者に安全な方法で共有します。</p>
                                </div>
                                <div>
                                    <button
                                        type="submit"
                                        className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                    >
                                        ユーザーを追加
                                    </button>
                                </div>
                            </form>
                        </section>

                        {/* 一覧 */}
                        <section className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b">
                                <h3 className="text-lg font-semibold text-gray-700">ユーザー一覧</h3>
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="px-3 py-2 border rounded text-sm"
                                >
                                    <option value="all">すべて</option>
                                    <option value="master">マスターのみ</option>
                                    <option value="staff">スタッフのみ</option>
                                </select>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">ユーザー名</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">権限</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500">作成日時</th>
                                        <th className="px-6 py-3 text-sm font-medium text-gray-500 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-6 text-center text-gray-500 text-sm">
                                                ユーザーが見つかりません。
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 text-sm">{user.username}</td>
                                                <td className="px-6 py-3 text-sm">
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs ${
                                                            user.role === 'master'
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                    >
                                                        {user.role === 'master' ? 'マスター' : 'スタッフ'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    {new Date(user.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-right space-x-2">
                                                    <button
                                                        onClick={() => handleToggleRole(user.id)}
                                                        className="px-3 py-1 border rounded text-xs hover:bg-gray-50"
                                                    >
                                                        権限切替
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetPassword(user.id, user.username)}
                                                        className="px-3 py-1 border rounded text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    >
                                                        パスワードリセット
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
