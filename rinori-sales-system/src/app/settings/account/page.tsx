'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { useSession } from 'next-auth/react';

export default function AccountSettingsPage() {
    const { data: session } = useSession();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('すべての項目を入力してください');
            return;
        }

        if (newPassword.length < 8) {
            setError('新しいパスワードは8文字以上で入力してください');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('新しいパスワードと確認用パスワードが一致しません');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/account/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'パスワードの変更に失敗しました。');
                return;
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccessMsg('パスワードを変更しました。次回ログインから新しいパスワードを使用してください。');
        } catch (err) {
            console.error(err);
            setError('パスワードの変更中にエラーが発生しました。');
        } finally {
            setLoading(false);
        }
    };

    const username = (session?.user as any)?.name ?? '';

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-xl mx-auto py-10 px-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">アカウント設定 (SC-20)</h2>

                {username && (
                    <p className="mb-4 text-sm text-gray-600">ログイン中のユーザー: {username}</p>
                )}

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

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">パスワード変更</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="current-password">
                                現在のパスワード
                            </label>
                            <input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                autoComplete="current-password"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="new-password">
                                新しいパスワード
                            </label>
                            <input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                autoComplete="new-password"
                            />
                            <p className="mt-1 text-xs text-gray-500">8文字以上を推奨します。</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm-password">
                                新しいパスワード（確認）
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full px-4 py-2 rounded text-white font-semibold bg-blue-600 hover:bg-blue-700 transition ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {loading ? '変更中...' : 'パスワードを変更'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
