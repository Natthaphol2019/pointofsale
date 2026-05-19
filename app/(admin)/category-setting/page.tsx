"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit2, X, Save, Folders, ShieldAlert } from "lucide-react";

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export default function CategorySettingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", sort_order: "" });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    if (data) setCategories(data);
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({ name: "", sort_order: (categories.length + 1).toString() });
    setShowModal(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditId(cat.id);
    setFormData({ name: cat.name, sort_order: cat.sort_order.toString() });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sort_order) return;

    const payload = {
      name: formData.name,
      sort_order: Number(formData.sort_order),
    };

    if (editId) {
      const { data, error } = await supabase.from("categories").update(payload).eq("id", editId).select().single();
      if (!error && data) {
        setCategories(categories.map((c) => (c.id === editId ? data : c)).sort((a, b) => a.sort_order - b.sort_order));
        setShowModal(false);
      }
    } else {
      const { data, error } = await supabase.from("categories").insert([payload]).select().single();
      if (!error && data) {
        setCategories([...categories, data].sort((a, b) => a.sort_order - b.sort_order));
        setShowModal(false);
      }
    }
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
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">หมวดหมู่เมนู</h1>
          <p className="text-slate-500 font-medium">จัดการหมวดหมู่อาหารและลำดับการจัดเรียงบนหน้าจอ POS</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-gradient-to-r from-[#ff5722] to-[#ff8a50] text-white px-6 py-3 rounded-xl hover:shadow-[0_8px_24px_rgba(255,87,34,0.3)] transition-all font-bold active:scale-[0.98] flex items-center gap-2"
        >
          <Plus size={20} strokeWidth={2.5} /> เพิ่มหมวดหมู่
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center w-24">ลำดับ</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">ชื่อหมวดหมู่</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right rounded-tr-2xl">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 text-center font-bold text-slate-400 whitespace-nowrap">{cat.sort_order}</td>
                  <td className="px-6 py-4 font-bold text-slate-900 text-[15px] whitespace-nowrap flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ff5722]/10 text-[#ff5722] flex items-center justify-center">
                        <Folders size={16} strokeWidth={2.5} />
                    </div>
                    {cat.name}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button 
                      onClick={() => handleOpenEdit(cat)} 
                      className="px-4 py-2.5 inline-flex items-center gap-2 bg-slate-100 text-slate-600 hover:bg-[#ff5722] hover:text-white hover:shadow-md rounded-xl transition-all font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50 active:scale-95"
                    >
                      <Edit2 size={16} strokeWidth={2} /> แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <ShieldAlert size={40} className="mx-auto text-slate-300 mb-3" />
                    ไม่มีข้อมูลหมวดหมู่
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ฟอร์มหมวดหมู่ */}
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
              {editId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">ลำดับการแสดงผล (ตัวเลข)</label>
                <input 
                  type="number" required placeholder="เช่น 1 หรือ 2"
                  value={formData.sort_order} onChange={(e) => setFormData({...formData, sort_order: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-2xl p-3.5 transition-all text-slate-900 font-bold" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                  ชื่อหมวดหมู่ <span className="text-[#ff5722]">*</span>
                </label>
                <input 
                  type="text" required placeholder="เช่น ของหวาน, เครื่องดื่ม"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-2xl p-3.5 transition-all text-slate-900 font-medium" 
                />
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