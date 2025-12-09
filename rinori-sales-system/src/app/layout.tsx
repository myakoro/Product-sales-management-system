import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Rinori 売上管理システム",
    description: "売上・予算・PL管理システム",
};

import { NextAuthProvider } from "./providers";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body>
                <NextAuthProvider>
                    {children}
                </NextAuthProvider>
            </body>
        </html>
    );
}
