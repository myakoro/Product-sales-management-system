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

                const user = await prisma.user.findUnique({
                    where: { username: credentials.username }
                });

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
    },
    secret: process.env.NEXTAUTH_SECRET || "development-secret-key-change-me",
};
