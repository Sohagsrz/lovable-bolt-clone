import { NextAuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/signin",
    },
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    select: {
                        id: true,
                        email: true,
                        password: true,
                        name: true,
                        usageCount: true,
                        usageLimit: true,
                        plan: true,
                        role: true
                    }
                });

                if (!user || !user.password) {
                    throw new Error("Invalid credentials");
                }

                const isCorrectPassword = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isCorrectPassword) {
                    throw new Error("Invalid credentials");
                }

                return user;
            },
        }),
    ],
    callbacks: {
        jwt: async ({ token, user }) => {
            if (user) {
                token.id = user.id;
                token.usageCount = user.usageCount;
                token.usageLimit = user.usageLimit;
                token.role = user.role;
                token.plan = user.plan;
            }
            return token;
        },
        session: async ({ session, token }) => {
            if (session.user) {
                session.user.id = token.id;
                session.user.usageCount = token.usageCount;
                session.user.usageLimit = token.usageLimit;
                session.user.role = token.role;
                session.user.plan = token.plan;
            }
            return session;
        },
    },
};
