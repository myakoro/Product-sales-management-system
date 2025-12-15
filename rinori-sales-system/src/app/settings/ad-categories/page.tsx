"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdCategorySettingsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/ad-expenses');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h1 className="text-xl font-bold mb-2">移動中...</h1>
                <p className="text-gray-600">広告費管理画面へ移動しています。</p>
            </div>
        </div>
    );
}
