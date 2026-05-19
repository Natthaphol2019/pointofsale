"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Users, 
  Folders, 
  PlusCircle, 
  TrendingUp, 
  LogOut, 
  Menu, 
  X,
  Store
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

    const navItems = [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "จัดการเมนู", path: "/menu-setting", icon: UtensilsCrossed },
        { name: "หมวดหมู่", path: "/category-setting", icon: Folders },
        { name: "ท็อปปิ้ง", path: "/addon-setting", icon: PlusCircle },
        { name: "พนักงาน", path: "/staff-setting", icon: Users },
        { name: "ยอดขาย", path: "/sales-report", icon: TrendingUp },
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <div className="flex h-[100dvh] bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
            {/* 📌 แถบเมนูด้านซ้าย (Sidebar) - สไตล์ High-class & Soft Shadow */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 w-72 bg-white flex flex-col 
                transform transition-transform duration-300 ease-in-out pb-safe pt-safe
                shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-slate-100
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}>
                {/* 👑 Brand / Logo */}
                <div className="p-6 md:p-8 flex justify-between items-center mt-safe md:mt-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff5722] to-[#ff8a50] flex items-center justify-center text-white shadow-lg shadow-[#ff5722]/30">
                            <Store size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">MooPik</h2>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Admin Portal</p>
                        </div>
                    </div>
                    {/* ปุ่มปิดบนมือถือ */}
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* 📋 Navigation */}
                <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto overscroll-none touch-pan-y no-scrollbar">
                    <div className="px-4 pb-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Main Menu</div>
                    
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <Link 
                                key={item.path}
                                href={item.path} 
                                onClick={() => setIsSidebarOpen(false)} 
                                className={`
                                    flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] touch-manipulation group
                                    ${active 
                                        ? "bg-gradient-to-r from-[#ff5722]/10 to-transparent text-[#ff5722] font-semibold" 
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"}
                                `}
                            >
                                <Icon size={18} className={`${active ? "text-[#ff5722]" : "text-slate-400 group-hover:text-slate-600"} transition-colors`} strokeWidth={active ? 2.5 : 2} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* 🚪 Profile / Logout */}
                <div className="p-4 md:p-6 mb-safe md:mb-0 border-t border-slate-100/50">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all font-medium active:scale-[0.98] group"
                    >
                        <LogOut size={18} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                        <span>ออกจากระบบ</span>
                    </button>
                </div>
            </aside>

            {/* 📌 Overlay มือถือ */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/20 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* 📌 พื้นที่เนื้อหาตรงกลาง (Content) */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-hidden relative">
                {/* Header บนมือถือ สำหรับปุ่มเปิด Sidebar */}
                <header className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-100 pt-safe mt-safe z-10 sticky top-0 shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="font-bold text-lg text-slate-900">MooPik Admin</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-6 md:p-10 overscroll-none pb-safe">
                    <div className="max-w-6xl mx-auto h-full flex flex-col">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}