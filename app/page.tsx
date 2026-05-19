"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; 
import { Store, ShieldCheck, User, Delete, X } from "lucide-react";

// โครงสร้างข้อมูลพนักงานและแอดมิน
interface Profile {
  id: string;
  full_name: string;
  role: string;
  pin_code: string;
}

export default function POSLogin() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 1. โหลดรายชื่อผู้ใช้งานทั้งหมด
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("role", { ascending: true }); // ADMIN ขึ้นก่อน STAFF

        if (data) setProfiles(data);
        if (error) console.error("Error fetching profiles:", error);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  // 2. ลอจิกตรวจสอบรหัส PIN และแยกหน้าตาม Role
  useEffect(() => {
    if (pin.length === 4 && selectedUser) {
      if (pin === selectedUser.pin_code) {
        // รหัสถูกต้อง! เก็บข้อมูลลง LocalStorage สำรับเรียกใช้หน้าบ้านง่ายๆ
        localStorage.setItem("currentStaffId", selectedUser.id);
        localStorage.setItem("currentStaffName", selectedUser.full_name);
        localStorage.setItem("currentRole", selectedUser.role);

        // 🌟 แก้ไข: บันทึกข้อมูลลง Cookie เพื่อส่งไปให้ Middleware ตรวจสอบด้วยได้
        const role = selectedUser.role.toLowerCase();
        document.cookie = `pos_role=${role}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `pos_user_id=${selectedUser.id}; path=/; max-age=86400; SameSite=Lax`;
        
        // 🚀 แยกทางไปตาม Role
        if (role === "admin") {
          router.push("/dashboard"); 
        } else {
          router.push("/tables"); 
        }
      } else {
        // รหัสผิด
        setErrorMsg("รหัส PIN ไม่ถูกต้อง");
        setPin(""); // รีเซ็ตเมื่อพินผิด
      }
    }
  }, [pin, selectedUser, router]);

  // ฟังก์ชันแป้นพิมพ์ Numpad
  const handleNumPress = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setErrorMsg("");
    }
  };
  const handleDelete = () => setPin((prev) => prev.slice(0, -1));
  const handleClose = () => {
    setSelectedUser(null);
    setPin("");
    setErrorMsg("");
  };

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] flex flex-col relative overflow-hidden font-sans">
      
      {/* 🔮 Background Decorators (ทรงกลมเบลอๆ ด้านหลังให้ดู High-Class) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[#ff5722]/10 to-[#ff8a50]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-slate-200 to-transparent rounded-full blur-3xl z-0" />

      {/* 📌 Header */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-20 pb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff5722] to-[#ff8a50] flex items-center justify-center text-white shadow-xl shadow-[#ff5722]/30 mb-6">
          <Store size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          MooPik <span className="text-[#ff5722]">POS</span>
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-base">เลือกระบบผู้ใช้งานเพื่อดำเนินการต่อ</p>
      </div>

      {/* 📌 Main Content - Grid ผู้ใช้งาน */}
      <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-6 pb-20">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="w-8 h-8 border-4 border-[#ff5722]/20 border-t-[#ff5722] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 justify-center">
            {profiles.map((profile) => {
              const isAdmin = profile.role.toUpperCase() === 'ADMIN';
              return (
                <button
                  key={profile.id}
                  onClick={() => setSelectedUser(profile)}
                  className={`
                    group relative bg-white flex flex-col items-center p-6 md:p-8 rounded-3xl transition-all duration-300
                    hover:-translate-y-1 active:scale-[0.97] touch-manipulation
                    ${isAdmin 
                      ? "shadow-[0_8px_30px_rgba(255,87,34,0.12)] border border-[#ff5722]/20 hover:border-[#ff5722]/50 hover:shadow-[0_12px_40px_rgba(255,87,34,0.2)]" 
                      : "shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-slate-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                    }
                  `}
                >
                  {/* Badge Admin */}
                  {isAdmin && (
                    <div className="absolute top-4 right-4 text-[#ff5722]">
                      <ShieldCheck size={18} strokeWidth={2.5} />
                    </div>
                  )}

                  {/* Avatar Icon */}
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110
                    ${isAdmin 
                      ? 'bg-gradient-to-br from-[#ff5722]/10 to-[#ff8a50]/20 text-[#ff5722]' 
                      : 'bg-slate-100 text-slate-500'
                    }
                  `}>
                    <User size={28} strokeWidth={2.5} />
                  </div>
                  
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-[#ff5722] transition-colors">{profile.full_name}</h2>
                  <p className="text-xs font-semibold uppercase tracking-wider mt-1 text-slate-400">{profile.role}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 📌 Modal Numpad แบบ Glassmorphism */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl border border-white p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-sm flex flex-col items-center relative animate-in zoom-in-95 duration-300">
            
            <button 
              onClick={handleClose} 
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-4">
              <User size={24} strokeWidth={2.5} />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-1">ยินดีต้อนรับ</h2>
            <p className="text-[#ff5722] font-semibold text-lg mb-8">{selectedUser.full_name}</p>

            {/* Pin Dots */}
            <div className="flex gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    i < pin.length 
                      ? "bg-[#ff5722] scale-110 shadow-[0_0_10px_rgba(255,87,34,0.5)]" 
                      : "bg-slate-200"
                  }`} 
                />
              ))}
            </div>

            {/* Error Message */}
            <div className="h-6 mb-4">
              {errorMsg && <p className="text-red-500 font-medium text-sm animate-in slide-in-from-bottom-2">{errorMsg}</p>}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button 
                  key={num} 
                  onClick={() => handleNumPress(num)} 
                  className="h-16 text-2xl font-semibold text-slate-800 bg-white border border-slate-100 shadow-sm hover:border-slate-300 hover:bg-slate-50 rounded-2xl active:bg-slate-100 active:scale-95 transition-all touch-manipulation"
                >
                  {num}
                </button>
              ))}
              <div /> {/* Empty space */}
              <button 
                onClick={() => handleNumPress("0")} 
                className="h-16 text-2xl font-semibold text-slate-800 bg-white border border-slate-100 shadow-sm hover:border-slate-300 hover:bg-slate-50 rounded-2xl active:bg-slate-100 active:scale-95 transition-all touch-manipulation"
              >
                0
              </button>
              <button 
                onClick={handleDelete} 
                className="h-16 flex items-center justify-center text-slate-500 bg-white border border-slate-100 shadow-sm hover:border-slate-300 hover:bg-red-50 hover:text-red-500 rounded-2xl active:scale-95 transition-all touch-manipulation"
              >
                <Delete size={24} />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}