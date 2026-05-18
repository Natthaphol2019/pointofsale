"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        router.push("/");
    };

    // ฟังก์ชันเช็คว่าเมนูไหนกำลังถูกเลือกอยู่ (ให้ตัวหนังสือสว่างขึ้น)
    const isActive = (path: string) => pathname === path ? "bg-pos-brand text-white shadow-md" : "hover:bg-pos-border text-pos-text-muted hover:text-pos-text";

    return (
        <div className="flex h-[100dvh] bg-pos-bg text-pos-text overflow-hidden">
            {/* 📌 แถบเมนูด้านซ้าย (Sidebar) */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 w-64 bg-pos-card border-r border-pos-border flex flex-col 
                transform transition-transform duration-300 ease-in-out pb-safe pt-safe
                ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
            `}>
                <div className="p-6 border-b border-pos-border flex justify-between items-center mt-safe md:mt-0">
                    <div>
                        <h2 className="text-2xl font-bold text-pos-brand">MooPik Admin</h2>
                        <p className="text-sm text-pos-text-muted mt-1">ระบบจัดการหลังร้าน</p>
                    </div>
                    {/* ปุ่มปิดบนมือถือ */}
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden w-8 h-8 flex items-center justify-center bg-pos-bg rounded-lg border border-pos-border text-pos-text-muted">
                        ✕
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto overscroll-none touch-pan-y no-scrollbar">
                    <Link href="/dashboard" onClick={() => setIsSidebarOpen(false)} className={`block px-4 py-3 rounded-xl transition-all active:scale-95 touch-manipulation font-medium ${isActive('/dashboard')}`}>
                        📊 Dashboard
                    </Link>
                    <Link href="/menu-setting" onClick={() => setIsSidebarOpen(false)} className={`block px-4 py-3 rounded-xl transition-all active:scale-95 touch-manipulation font-medium ${isActive('/menu-setting')}`}>
                        🍔 จัดการเมนูอาหาร
                    </Link>
                    <Link href="/staff-setting" onClick={() => setIsSidebarOpen(false)} className={`block px-4 py-3 rounded-xl transition-all active:scale-95 touch-manipulation font-medium ${isActive('/staff-setting')}`}>
                        👥 จัดการพนักงาน
                    </Link>
                    <Link href="/category-setting" onClick={() => setIsSidebarOpen(false)} className={`block px-4 py-3 rounded-xl transition-all active:scale-95 touch-manipulation font-medium ${isActive('/category-setting')}`}>
                        🗂️ จัดการหมวดหมู่
                    </Link>
                    <Link href='/addon-setting' onClick={() => setIsSidebarOpen(false)} className={`block px-4 py-3 rounded-xl transition-all active:scale-95 touch-manipulation font-medium ${isActive('/addon-setting')}`}>
                        ➕ จัดการท็อปปิ้ง/ส่วนเสริม
                    </Link>
                    <Link href="/sales-report" onClick={() => setIsSidebarOpen(false)} className={`block px-4 py-3 rounded-xl transition-all active:scale-95 touch-manipulation font-medium ${isActive('/sales-report')}`}>
                        📈 รายงานยอดขาย
                    </Link>
                </nav>

                <div className="p-4 border-t border-pos-border mb-safe md:mb-0">
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 rounded-xl text-pos-danger hover:bg-pos-danger/10 transition-all font-medium touch-manipulation active:scale-95"
                    >
                        🚪 ออกจากระบบ
                    </button>
                </div>
            </aside>

            {/* 📌 Overlay เวลาเปิด Sidebar (มือถือ) */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* 📌 พื้นที่เนื้อหาตรงกลาง (Content) */}
            <main className="flex-1 flex flex-col min-w-0 bg-pos-bg overflow-hidden relative">
                {/* Header บนมือถือ สำหรับปุ่มเปิด Sidebar */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-pos-border bg-pos-card pt-safe mt-safe z-10 sticky top-0 shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="w-12 h-12 flex items-center justify-center bg-pos-bg border border-pos-border rounded-2xl text-pos-text active:scale-95 touch-manipulation shadow-sm font-bold text-xl"
                        >
                            ☰
                        </button>
                        <h1 className="font-bold text-xl text-pos-brand">เมนูจัดการ</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 overscroll-none pb-safe">
                    {children}
                </div>
            </main>
        </div>
    );
}