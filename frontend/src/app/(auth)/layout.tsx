import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Authentication | Feedback System",
  description: "Secure authentication for Customer Feedback & Decision Insights SaaS",
};

export default function RootAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}

