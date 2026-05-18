"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  pin_code: string;
}

export default function StaffSettingPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal เพิ่มพนักงาน
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    full_name: "",
    role: "STAFF",
    pin_code: ""
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("role", { ascending: true }) // เรียง ADMIN ขึ้นก่อน
      .order("full_name");

    if (data) setProfiles(data);
    if (error) console.error("Error fetching profiles:", error);
    setLoading(false);
  };

  // ฟังก์ชันเพิ่มพนักงานใหม่
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate รหัส PIN ต้องเป็นตัวเลข 4 หลัก
    if (!/^\d{4}$/.test(newStaff.pin_code)) {
      return alert("รหัส PIN ต้องเป็นตัวเลข 4 หลักเท่านั้นครับ");
    }
    if (!newStaff.full_name) return alert("กรุณาใส่ชื่อพนักงาน");

    const { data, error } = await supabase
      .from("profiles")
      .insert([{
        full_name: newStaff.full_name,
        role: newStaff.role,
        pin_code: newStaff.pin_code
      }])
      .select().single();

    if (error) {
      alert("เพิ่มพนักงานไม่สำเร็จ (รหัส PIN อาจซ้ำ หรือระบบมีปัญหา)");
      console.error(error);
    } else if (data) {
      setProfiles([...profiles, data]);
      setShowAddModal(false);
      setNewStaff({ full_name: "", role: "STAFF", pin_code: "" }); // ล้างค่าฟอร์ม
    }
  };

  // ฟังก์ชันลบพนักงาน
  const handleDeleteStaff = async (id: string, name: string, role: string) => {
    if (role === "ADMIN" && profiles.filter(p => p.role === "ADMIN").length === 1) {
      return alert("ไม่สามารถลบ Admin คนสุดท้ายได้ครับ!");
    }
    
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อ "${name}" ?\n(บิลเก่าๆ ที่พนักงานคนนี้เคยทำไว้จะยังคงอยู่)`)) {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (!error) {
        setProfiles(profiles.filter(p => p.id !== id));
      } else {
        alert("ลบข้อมูลไม่สำเร็จ");
      }
    }
  };

  if (loading) return <div className="p-8 text-pos-text-muted">กำลังโหลดข้อมูลพนักงาน...</div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-pos-brand mb-1">จัดการพนักงาน</h1>
          <p className="text-pos-text-muted">เพิ่มพนักงานใหม่ และตั้งค่ารหัส PIN เข้าสู่ระบบ</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-pos-brand text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-all font-bold shadow-lg active:scale-95 flex items-center gap-2"
        >
          ➕ เพิ่มผู้ใช้งาน
        </button>
      </div>
      
      {/* 📋 ตารางรายชื่อพนักงาน */}
      <div className="bg-pos-card rounded-2xl border border-pos-border shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-pos-bg text-pos-text-muted text-sm border-b border-pos-border">
              <tr>
                <th className="p-4 font-medium w-16 text-center">สิทธิ์</th>
                <th className="p-4 font-medium">ชื่อ-นามสกุล</th>
                <th className="p-4 font-medium text-center">รหัส PIN (4 หลัก)</th>
                <th className="p-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-pos-bg/50 transition-colors">
                  <td className="p-4 text-center text-2xl">
                    {profile.role === 'ADMIN' ? '👑' : '🧑‍🍳'}
                  </td>
                  <td className="p-4 font-bold text-lg">
                    {profile.full_name}
                    <span className={`ml-3 px-2 py-0.5 text-xs rounded-full border ${
                      profile.role === 'ADMIN' ? 'bg-pos-brand/10 border-pos-brand/30 text-pos-brand' : 'bg-pos-text-muted/10 border-pos-border text-pos-text-muted'
                    }`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-pos-bg border border-pos-border px-4 py-2 rounded-lg font-mono text-xl tracking-widest text-white shadow-inner">
                      {profile.pin_code}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteStaff(profile.id, profile.full_name, profile.role)}
                      className="px-4 py-2 bg-pos-danger/10 text-pos-danger hover:bg-pos-danger hover:text-white rounded-lg transition-all font-medium"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📝 Modal เพิ่มพนักงานใหม่ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 rounded-3xl w-full max-w-md animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 border-b border-pos-border pb-4">เพิ่มผู้ใช้งานใหม่</h2>
            
            <form onSubmit={handleAddStaff} className="space-y-5">
              <div>
                <label className="block text-sm text-pos-text-muted mb-1">ชื่อ-นามสกุล / ชื่อเล่น</label>
                <input 
                  type="text" required
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})}
                  placeholder="เช่น Staff เจมส์"
                  className="w-full bg-pos-bg border border-pos-border rounded-xl p-3 focus:outline-none focus:border-pos-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-pos-text-muted mb-1">สิทธิ์การใช้งาน</label>
                  <select 
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    className="w-full bg-pos-bg border border-pos-border rounded-xl p-3 focus:outline-none focus:border-pos-brand"
                  >
                    <option value="STAFF">🧑‍🍳 STAFF (พนักงาน)</option>
                    <option value="ADMIN">👑 ADMIN (แอดมิน)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-pos-text-muted mb-1">รหัส PIN (4 หลัก)</label>
                  <input 
                    type="text" required maxLength={4}
                    value={newStaff.pin_code}
                    onChange={(e) => {
                      // บังคับพิมพ์ได้แค่ตัวเลข
                      const val = e.target.value.replace(/\D/g, '');
                      setNewStaff({...newStaff, pin_code: val});
                    }}
                    placeholder="เช่น 1234"
                    className="w-full bg-pos-bg border border-pos-brand/50 rounded-xl p-3 focus:outline-none focus:border-pos-brand font-mono text-center text-lg tracking-widest text-pos-brand font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 mt-2 border-t border-pos-border">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-3 bg-pos-border text-pos-text-muted font-bold rounded-xl hover:text-white transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="py-3 bg-pos-brand text-white font-bold rounded-xl hover:bg-orange-600 transition-all active:scale-95 shadow-lg"
                >
                  บันทึกผู้ใช้งาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}