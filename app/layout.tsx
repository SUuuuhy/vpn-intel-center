import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VPN 市场增长信息中心",
  description: "面向产品增长和运营团队的 VPN 市场情报中心。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
