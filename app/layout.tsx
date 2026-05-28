import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IEM Monitor — BV Nhi Đồng 1",
  description: "Phòng khám Chuyển hóa Bẩm sinh — Bệnh viện Nhi Đồng 1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="bg-gray-50 min-h-screen antialiased">{children}</body>
    </html>
  );
}
