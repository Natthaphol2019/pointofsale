"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit2, X, Save, Users, ShieldAlert, User, ShieldCheck } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  pin_code: string;
}

export default function StaffSettingPage() {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    role: "STAFF",
    pin_code: "",
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("role");
    if (data) setStaff(data);
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({ full_name: "", role: "STAFF", pin_code: "" });
    setShowModal(true);
  };

  const handleOpenEdit = (user: Profile) => {
    setEditId(user.id);
    setFormData({
      full_name: user.full_name,
      role: user.role,
      pin_code: user.pin_code,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || formData.pin_code.length !== 4) {
      return alert("กรุณากรอกชื่อและรหัส PIN 4 หลักให้ถูกต้อง");
    }

    const payload = {
      full_name: formData.full_name,
      role: formData.role,
      pin_code: formData.pin_code,
    };

    if (editId) {
      const { data, error } = await supabase.from("profiles").update(payload).eq("id", editId).select().single();
      if (!error && data) {
        setStaff(staff.map((s) => (s.id === editId ? data : s)));
        setShowModal(false);
      }
    } else {
      const { data, error } = await supabase.from("profiles").insert([payload]).select().single();
      if (!error && data) {
        setStaff([...staff, data]);
        setShowModal(false);
      }
    }
  };

  const generatePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({ ...formData, pin_code: randomPin });
  };

  if (loading) return (
    <div className="flex justify-center items-center h-48">
      <div className="w-8 h-8 border-4 border-[#ff5722]/20 border-t-[#ff5722] rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">จัดการพนักงาน</h1>
          <p className="text-slate-500 font-medium">จัดการข้อมูลส่วนตัว สิทธิ์การเข้าถึง และรหัส PIN 4 หลัก</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-gradient-to-r from-[#ff5722] to-[#ff8a50] text-white px-6 py-3 rounded-xl hover:shadow-[0_8px_24px_rgba(255,87,34,0.3)] transition-all font-bold active:scale-[0.98] flex items-center gap-2"
        >
          <Plus size={20} strokeWidth={2.5} /> เพิ่มพนักงาน
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">ชื่อพนักงาน</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">สิทธิ์ / หน้าที่</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">รหัสเข้าใช้งาน</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right rounded-tr-2xl">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role.toUpperCase() === 'ADMIN' ? 'bg-[#ff5722]/10 text-[#ff5722]' : 'bg-slate-100 text-slate-500'}`}>
                      {user.role.toUpperCase() === 'ADMIN' ? <ShieldCheck size={20} strokeWidth={2.5} /> : <User size={20} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-[15px]">{user.full_name}</div>
                      <div className="text-xs text-slate-400 font-medium">ID: {user.id.substring(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest uppercase ${
                      user.role.toUpperCase() === "ADMIN" 
                        ? "bg-[#ff5722]/10 text-[#ff5722]" 
                        : "bg-blue-50 text-blue-600"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap font-mono text-lg font-bold tracking-widest text-slate-600">
                    {user.pin_code}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button 
                      onClick={() => handleOpenEdit(user)} 
                      className="px-4 py-2.5 inline-flex items-center gap-2 bg-slate-100 text-slate-600 hover:bg-[#ff5722] hover:text-white hover:shadow-md rounded-xl transition-all font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50 active:scale-95"
                    >
                      <Edit2 size={16} strokeWidth={2} /> แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Users size={40} className="mx-auto text-slate-300 mb-3" />
                    ไม่มีข้อมูลพนักงาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ฟอร์มพนักงาน */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl border border-white p-6 md:p-8 rounded-[2rem] shadow-2xl w-full max-w-sm relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              {editId ? <Edit2 className="text-[#ff5722]" size={24} /> : <Plus className="text-[#ff5722]" size={24} />}
              {editId ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                  ชื่อนามสกุล หรือ ชื่อเล่น <span className="text-[#ff5722]">*</span>
                </label>
                <input 
                  type="text" required placeholder="เช่น สมชาย ใจดี"
                  value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-2xl p-3.5 transition-all text-slate-900 font-medium" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">หน้าที่ (Role)</label>
                <select 
                  value={formData.role} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-2xl p-3.5 transition-all text-slate-700 font-medium"
                >
                  <option value="STAFF">🧑‍🍳 พนักงาน (STAFF)</option>
                  <option value="ADMIN">👑 ผู้ดูแลระบบ (ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">รหัส PIN 4 หลัก สำหรับเข้าระบบ</label>
                <div className="flex gap-2">
                  <input 
                    type="text" required maxLength={4} minLength={4} placeholder="xxxx"
                    value={formData.pin_code} 
                    onChange={(e) => setFormData({...formData, pin_code: e.target.value.replace(/[^0-9]/g, '')})} 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-2xl p-3.5 text-center transition-all text-slate-900 font-mono font-bold tracking-widest text-lg" 
                  />
                  <button 
                    type="button" onClick={generatePin} 
                    className="bg-slate-100 text-slate-600 px-4 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm whitespace-nowrap"
                  >
                    สุ่มรหัส
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-4 mt-4 border-t border-slate-100">
                <button 
                  type="button" onClick={() => setShowModal(false)} 
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 bg-[#ff5722] text-white font-bold rounded-2xl hover:bg-orange-600 hover:shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                >
                  <Save size={18} strokeWidth={2.5}/> บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}