"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, LayoutGrid, ClipboardList, Store } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    const handleLogout = async () => {
        // เคลียร์ Supabase Auth
        await supabase.auth.signOut();
        // เคลียร์ Cookie เดิมที่เคยเซฟไว้ตอนพิมพ์ PIN
        document.cookie = 'pos_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'pos_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        // เคลียร์ LocalStorage
        localStorage.clear();
        router.push("/");
    };

    const isActive = (path: string) => pathname.startsWith(path);
    const isOrderPage = pathname.startsWith('/order');

    return (
        <div className="flex flex-col h-[100dvh] bg-[#f8fafc] text-slate-800 font-sans">
            {/* 📌 Header สำหรับ POS (เน้นใช้งานด่วน สบายตา) */}
            <header className="flex-none bg-white border-b border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] pt-safe">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff5722] to-[#ff8a50] flex items-center justify-center text-white shadow-md shadow-[#ff5722]/20">
                            <Store size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-none">MooPik</h1>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Point of Sale</p>
                        </div>
                    </div>

                    {/* Navigation Desktop */}
                    <nav className="hidden sm:flex items-center gap-2">
                        <Link 
                            href="/tables" 
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${isActive('/tables') ? 'bg-[#ff5722]/10 text-[#ff5722]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                        >
                            <LayoutGrid size={18} strokeWidth={isActive('/tables') ? 2.5 : 2} />
                            โต๊ะอาหาร
                        </Link>
                        {/* เพียงแสดงสถานะหน้าออเดอร์ (กดไม่ได้) ให้รู้ว่าอยู่หน้านี้ */}
                        <div 
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all cursor-default select-none ${isActive('/order') ? 'bg-[#ff5722]/10 text-[#ff5722]' : 'opacity-50 text-slate-400'}`}
                        >
                            <ClipboardList size={18} strokeWidth={isActive('/order') ? 2.5 : 2} />
                            ออเดอร์
                        </div>
                    </nav>

                    {/* Logout */}
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors font-medium text-sm"
                    >
                        <span className="hidden sm:inline">ออกจากระบบ</span>
                        <LogOut size={18} className="sm:hidden" />
                    </button>
                </div>
            </header>

            {/* 📌 Content */}
            <main className={`flex-1 overflow-y-auto overscroll-none pb-safe ${isOrderPage ? 'mb-0' : 'mb-[72px] sm:mb-0'}`}>
                <div className={`max-w-7xl mx-auto h-full ${isOrderPage ? 'p-0 sm:p-6 lg:p-8' : 'p-4 sm:p-6 lg:p-8'}`}>
                    {children}
                </div>
            </main>

            {/* 📌 Bottom Navigation (เฉพาะบนมือถือ) - ซ่อนเมื่อเปิดหน้า Order */}
            {!isOrderPage && (
                <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] pb-safe z-50">
                    <div className="flex justify-around items-center h-[72px] px-6">                    
                        <Link 
                            href="/tables" 
                            className={`flex flex-col items-center gap-1 p-2 min-w-[80px] transition-colors ${isActive('/tables') ? 'text-[#ff5722]' : 'text-slate-400'}`}
                        >
                            <div className={`p-1.5 rounded-xl transition-colors ${isActive('/tables') ? 'bg-[#ff5722]/10' : 'bg-transparent'}`}>
                                <LayoutGrid size={22} strokeWidth={isActive('/tables') ? 2.5 : 2} />
                            </div>
                            <span className="text-[11px] font-medium">โต๊ะอาหาร</span>
                        </Link>
                        
                        {/* เพียงแสดงสถานะหน้าออเดอร์บนมือถือ (กดไม่ได้) */}
                        <div 
                            className={`flex flex-col items-center gap-1 p-2 min-w-[80px] cursor-default select-none transition-colors ${isActive('/order') ? 'text-[#ff5722]' : 'opacity-40 text-slate-400'}`}
                        >
                            <div className={`p-1.5 rounded-xl transition-colors ${isActive('/order') ? 'bg-[#ff5722]/10' : 'bg-transparent'}`}>
                                <ClipboardList size={22} strokeWidth={isActive('/order') ? 2.5 : 2} />
                            </div>
                            <span className="text-[11px] font-medium">ออเดอร์</span>
                        </div>
                    </div>
                </nav>
            )}
        </div>
    );
}
