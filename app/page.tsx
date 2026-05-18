"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // เช็ค path ให้ตรงกับโฟลเดอร์ lib ของคุณด้วยนะครับ

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

  // 1. โหลดรายชื่อผู้ใช้งานทั้งหมด (ทั้ง ADMIN และ STAFF)
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("role", { ascending: true }); // ให้ ADMIN ขึ้นก่อน STAFF

      if (data) setProfiles(data);
      if (error) console.error("Error fetching profiles:", error);
    };
    fetchProfiles();
  }, []);

  // 2. ลอจิกตรวจสอบรหัส PIN และแยกหน้าตาม Role
  useEffect(() => {
    if (pin.length === 4 && selectedUser) {
      if (pin === selectedUser.pin_code) {
        // รหัสถูกต้อง! เก็บข้อมูลลง LocalStorage
        localStorage.setItem("currentStaffId", selectedUser.id);
        localStorage.setItem("currentStaffName", selectedUser.full_name);
        localStorage.setItem("currentRole", selectedUser.role);
        
        // 🚀 แยกทางไปตาม Role
        if (selectedUser.role === "ADMIN") {
          router.push("/dashboard"); // ไปฝั่ง (admin)
        } else {
          router.push("/tables"); // ไปฝั่ง (staff)
        }
      } else {
        // รหัสผิด
        setErrorMsg("รหัส PIN ไม่ถูกต้อง");
        setPin("");
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-pos-brand mb-2">MooPik POS</h1>
        <p className="text-pos-text-muted text-lg">กรุณาเลือกผู้ใช้งานเพื่อเข้าสู่ระบบ</p>
      </div>

      {/* Grid แสดงรายชื่อทั้งหมด */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl w-full">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => setSelectedUser(profile)}
            className={`border transition-all rounded-2xl p-8 flex flex-col items-center justify-center shadow-lg active:scale-95 ${
              profile.role === 'ADMIN' 
                ? "bg-pos-card border-pos-brand/50 hover:border-pos-brand" // สีของแอดมิน
                : "bg-pos-card border-pos-border hover:border-pos-brand"    // สีของพนักงาน
            }`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 text-3xl ${profile.role === 'ADMIN' ? 'bg-pos-brand/20 text-pos-brand' : 'bg-pos-border'}`}>
              {profile.role === 'ADMIN' ? '👑' : '🧑‍🍳'}
            </div>
            <h2 className="text-xl font-semibold">{profile.full_name}</h2>
            <p className="text-sm text-pos-text-muted mt-1">{profile.role}</p>
          </button>
        ))}
      </div>

      {/* Modal Numpad */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 rounded-3xl w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-2">เข้าสู่ระบบ</h2>
            <p className="text-pos-brand font-medium mb-6">คุณ: {selectedUser.full_name}</p>

            <div className="flex gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < pin.length ? "bg-pos-brand scale-125" : "bg-pos-border"}`} />
              ))}
            </div>

            {errorMsg && <p className="text-pos-danger mb-4 animate-bounce">{errorMsg}</p>}

            <div className="grid grid-cols-3 gap-4 w-full">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button key={num} onClick={() => handleNumPress(num)} className="h-16 text-2xl font-semibold bg-pos-border hover:bg-pos-border/80 rounded-xl active:bg-pos-brand active:scale-95 transition-all">
                  {num}
                </button>
              ))}
              <button onClick={handleClose} className="h-16 text-lg font-medium text-pos-text-muted hover:text-white transition-all">ยกเลิก</button>
              <button onClick={() => handleNumPress("0")} className="h-16 text-2xl font-semibold bg-pos-border hover:bg-pos-border/80 rounded-xl active:bg-pos-brand active:scale-95 transition-all">0</button>
              <button onClick={handleDelete} className="h-16 text-2xl font-semibold bg-pos-danger/20 text-pos-danger hover:bg-pos-danger/40 rounded-xl active:scale-95 transition-all">⌫</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}