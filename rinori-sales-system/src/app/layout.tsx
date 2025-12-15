import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Rinori 売上管理システム",
    description: "売上・予算・PL管理システム",
};

import { NextAuthProvider } from "./providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <NextAuthProvider>
                    <Header />
                    <main style={{ flex: 1, backgroundColor: '#f9fafb' }}>
                        {children}
                    </main>
                    <Footer />
                </NextAuthProvider>
            </body>
        </html>
    );
}
