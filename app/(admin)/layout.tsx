"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        localStorage.clear();
        router.push("/");
    };

    // ฟังก์ชันเช็คว่าเมนูไหนกำลังถูกเลือกอยู่ (ให้ตัวหนังสือสว่างขึ้น)
    const isActive = (path: string) => pathname === path ? "bg-pos-brand text-white" : "hover:bg-pos-border";

    return (
        <div className="flex h-screen bg-pos-bg text-pos-text overflow-hidden">
            {/* 📌 แถบเมนูด้านซ้าย (Sidebar) */}
            <aside className="w-64 bg-pos-card border-r border-pos-border flex flex-col">
                <div className="p-6 border-b border-pos-border">
                    <h2 className="text-2xl font-bold text-pos-brand">MooPik Admin</h2>
                    <p className="text-sm text-pos-text-muted mt-1">ระบบจัดการหลังร้าน</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/dashboard" className={`block px-4 py-3 rounded-xl transition-all ${isActive('/dashboard')}`}>
                        📊 Dashboard
                    </Link>
                    <Link href="/menu-setting" className={`block px-4 py-3 rounded-xl transition-all ${isActive('/menu-setting')}`}>
                        🍔 จัดการเมนูอาหาร
                    </Link>
                    <Link href="/staff-setting" className={`block px-4 py-3 rounded-xl transition-all ${isActive('/staff-setting')}`}>
                        👥 จัดการพนักงาน
                    </Link>
                    <Link href="/category-setting" className={`block px-4 py-3 rounded-xl transition-all ${isActive('/category-setting')}`}>
                        🗂️ จัดการหมวดหมู่
                    </Link>
                    <Link href='/addon-setting' className={`block px-4 py-3 rounded-xl transition-all ${isActive('/addon-setting')}`}>
                        ➕ จัดการท็อปปิ้ง/ส่วนเสริม
                    </Link>
                    <Link href="/sales-report" className={`block px-4 py-3 rounded-xl transition-all ${isActive('/reports')}`}>
                        📈 รายงานยอดขาย
                    </Link>

                </nav>

                <div className="p-4 border-t border-pos-border">
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 rounded-xl text-pos-danger hover:bg-pos-danger/10 transition-all font-medium"
                    >
                        🚪 ออกจากระบบ
                    </button>
                </div>
            </aside>

            {/* 📌 พื้นที่เนื้อหาตรงกลาง (Content) */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}