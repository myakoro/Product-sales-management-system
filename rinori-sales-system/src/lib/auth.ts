import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "ユーザー名", type: "text" },
                password: { label: "パスワード", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                // 緊急用: admin / admin でログインされた場合は、admin ユーザーを必ず作成・更新して認証を通す
                if (credentials.username === "admin" && credentials.password === "admin") {
                    const defaultPassword = "admin";
                    const hash = await bcrypt.hash(defaultPassword, 10);

                    const adminUser = await prisma.user.upsert({
                        where: { username: "admin" },
                        update: {
                            passwordHash: hash,
                            role: "master",
                        },
                        create: {
                            username: "admin",
                            passwordHash: hash,
                            role: "master",
                        },
                    });

                    return {
                        id: adminUser.id.toString(),
                        name: adminUser.username,
                        email: null,
                        role: adminUser.role,
                    };
                }

                // 初回起動時など、ユーザーが1人もいない場合はデフォルト管理者を自動作成
                const userCount = await prisma.user.count();
                if (userCount === 0) {
                    const defaultPassword = "admin";
                    const hash = await bcrypt.hash(defaultPassword, 10);
                    await prisma.user.create({
                        data: {
                            username: "admin",
                            passwordHash: hash,
                            role: "master",
                        },
                    });
                }

                let user = await prisma.user.findUnique({
                    where: { username: credentials.username }
                });

                // admin ユーザーが存在しない状態で admin ログインが来た場合は、復旧用に再作成する
                if (!user && credentials.username === "admin") {
                    const defaultPassword = "admin";
                    const hash = await bcrypt.hash(defaultPassword, 10);
                    user = await prisma.user.create({
                        data: {
                            username: "admin",
                            passwordHash: hash,
                            role: "master",
                        },
                    });
                }

                if (!user) {
                    return null;
                }

                // Temporary: Allow plaintext password for initial setup if hash check fails
                // OR better: check if hash valid.
                // Assuming dev.db has users with hashed passwords or we reset them.
                // We will rely on our seed/reset script to set proper hashes.

                const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

                if (!isValid) {
                    console.log("Invalid password for user:", credentials.username);
                    return null;
                }

                return {
                    id: user.id.toString(),
                    name: user.username,
                    email: null, // We don't use email
                    role: user.role
                };
            }
        })
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
            }
            return session;
        }
    },
    session: {
        strategy: "jwt",
        // ログイン状態の有効期限: 2時間（秒単位）
        maxAge: 60 * 60 * 2,
    },
    secret: process.env.NEXTAUTH_SECRET || "development-secret-key-change-me",
};
