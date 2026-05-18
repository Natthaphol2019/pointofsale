"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface AddOn {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export default function AddonSettingPage() {
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal (ใช้ร่วมกันทั้ง เพิ่ม และ แก้ไข)
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "0" });

  useEffect(() => {
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("add_ons")
      .select("*")
      .order("name", { ascending: true }); // เรียงตามตัวอักษร

    if (data) setAddons(data);
    if (error) console.error("Error fetching add-ons:", error);
    setLoading(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("add_ons").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) {
      setAddons(addons.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
    }
  };

  // ➕ เปิด Modal เพิ่มท็อปปิ้ง
  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({ name: "", price: "0" });
    setShowModal(true);
  };

  // 📝 เปิด Modal แก้ไขท็อปปิ้ง
  const handleOpenEdit = (addon: AddOn) => {
    setEditId(addon.id);
    setFormData({ name: addon.name, price: addon.price.toString() });
    setShowModal(true);
  };

  // ฟังก์ชันบันทึกข้อมูล (เพิ่ม/แก้ไข)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("กรุณากรอกชื่อท็อปปิ้ง");

    const payload = {
      name: formData.name,
      price: Number(formData.price),
      is_active: true
    };

    if (editId) {
      // โหมดแก้ไข
      const { data, error } = await supabase.from("add_ons").update(payload).eq("id", editId).select().single();
      if (error) {
        alert("แก้ไขข้อมูลไม่สำเร็จ");
        console.error(error);
      } else if (data) {
        const updatedList = addons.map(a => a.id === editId ? data : a).sort((a, b) => a.name.localeCompare(b.name));
        setAddons(updatedList);
        setShowModal(false);
      }
    } else {
      // โหมดเพิ่มใหม่
      const { data, error } = await supabase.from("add_ons").insert([payload]).select().single();
      if (error) {
        alert("เพิ่มท็อปปิ้งไม่สำเร็จ");
        console.error(error);
      } else if (data) {
        const updatedList = [...addons, data].sort((a, b) => a.name.localeCompare(b.name));
        setAddons(updatedList);
        setShowModal(false);
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบท็อปปิ้ง "${name}" ?`)) {
      const { error } = await supabase.from("add_ons").delete().eq("id", id);
      if (!error) {
        setAddons(addons.filter(a => a.id !== id));
      } else {
        alert("ลบข้อมูลไม่สำเร็จ");
        console.error(error);
      }
    }
  };

  if (loading) return <div className="p-8 text-pos-text-muted">กำลังโหลดข้อมูลท็อปปิ้ง...</div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-pos-brand mb-1">จัดการท็อปปิ้ง (Add-on)</h1>
          <p className="text-pos-text-muted">เพิ่มรายการส่วนเสริมและราคา เพื่อให้พนักงานกดเลือกตอนสั่งอาหาร</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-pos-brand text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-all font-bold shadow-lg active:scale-95 flex items-center gap-2"
        >
          ➕ เพิ่มท็อปปิ้ง
        </button>
      </div>
      
      {/* 📋 ตารางท็อปปิ้ง */}
      <div className="bg-pos-card rounded-2xl border border-pos-border shadow-lg overflow-hidden max-w-4xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-pos-bg text-pos-text-muted text-sm border-b border-pos-border">
              <tr>
                <th className="p-4 font-medium w-24 text-center">สถานะ</th>
                <th className="p-4 font-medium">ชื่อท็อปปิ้ง / ส่วนเสริม</th>
                <th className="p-4 font-medium text-right text-pos-brand">ราคาบวกเพิ่ม (บาท)</th>
                <th className="p-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border">
              {addons.map((addon) => (
                <tr key={addon.id} className={`hover:bg-pos-bg/50 transition-colors ${!addon.is_active ? 'opacity-50 grayscale' : ''}`}>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleActive(addon.id, addon.is_active)}
                      className={`w-12 h-6 rounded-full transition-all relative ${addon.is_active ? 'bg-pos-success' : 'bg-gray-600'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${addon.is_active ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="p-4 font-bold text-xl text-white">{addon.name}</td>
                  <td className="p-4 text-right font-bold text-pos-brand text-xl">
                    {addon.price > 0 ? `+฿${addon.price}` : 'ฟรี'}
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => handleOpenEdit(addon)}
                      className="px-4 py-2 bg-pos-border hover:bg-pos-brand hover:text-white rounded-lg transition-all font-medium text-sm"
                    >
                      📝 แก้ไข
                    </button>
                    <button 
                      onClick={() => handleDelete(addon.id, addon.name)}
                      className="px-4 py-2 bg-pos-danger/10 text-pos-danger hover:bg-pos-danger hover:text-white rounded-lg transition-all font-medium text-sm"
                    >
                      🗑️ ลบ
                    </button>
                  </td>
                </tr>
              ))}
              {addons.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-pos-text-muted">ยังไม่มีรายการท็อปปิ้ง</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📝 Modal ฟอร์มเพิ่ม/แก้ไขท็อปปิ้ง */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 rounded-3xl w-full max-w-sm animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 border-b border-pos-border pb-4">
              {editId ? "📝 แก้ไขท็อปปิ้ง" : "➕ เพิ่มท็อปปิ้งใหม่"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-pos-text-muted mb-1">ชื่อท็อปปิ้ง / ส่วนเสริม</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="เช่น ไข่ดาว, เพิ่มข้าว, ใส่กล่อง"
                  className="w-full bg-pos-bg border border-pos-border rounded-xl p-4 text-lg text-white focus:outline-none focus:border-pos-brand"
                />
              </div>

              <div>
                <label className="block text-sm text-pos-brand font-bold mb-1">ราคาบวกเพิ่ม (บาท)</label>
                <input 
                  type="number" required min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-pos-bg border border-pos-brand/50 rounded-xl p-4 text-lg text-pos-brand font-bold focus:outline-none focus:border-pos-brand text-right"
                  placeholder="0"
                />
                <p className="text-xs text-pos-text-muted mt-2">
                  * หากเป็นตัวเลือกฟรี (เช่น ไม่ใส่ผัก) ให้ระบุราคาเป็น 0
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-pos-border">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-3 bg-pos-border text-pos-text-muted font-bold rounded-xl hover:text-white transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="py-3 bg-pos-brand text-white font-bold rounded-xl hover:bg-orange-600 transition-all active:scale-95 shadow-lg"
                >
                  {editId ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}