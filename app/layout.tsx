import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IEM Monitor - Theo dõi bệnh chuyển hóa bẩm sinh",
  description: "Ứng dụng theo dõi bệnh nhân rối loạn chuyển hóa bẩm sinh (IEM) tại nhà - Phòng khám Nhi đồng Hiếu Phúc",
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
