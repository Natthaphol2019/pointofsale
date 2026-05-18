import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

// ตั้งค่าฟอนต์ Prompt (รองรับภาษาไทยและอังกฤษ)
const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["thai", "latin"],
  variable: "--font-prompt", // สร้าง CSS Variable ไว้เรียกใช้
});

export const metadata: Metadata = {
  title: "MooPik POS",
  description: "ระบบจัดการร้านอาหารและจุดชำระเงิน",
  robots: "noindex, nofollow", // 🛑 Anti-SEO บล็อกไม่ให้ Google เข้ามาค้นหาเจอ
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      {/* ใส่ตัวแปรฟอนต์เข้าไปที่ body และเรียกใช้ font-sans ของ Tailwind */}
      <body className={`${prompt.variable} font-sans antialiased bg-pos-bg text-pos-text`}>
        {children}
      </body>
    </html>
  );
}