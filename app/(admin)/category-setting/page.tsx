"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Category {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export default function CategorySettingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal (ใช้ร่วมกันทั้ง เพิ่ม และ แก้ไข)
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", sort_order: 1 });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true }); // เรียงตามตัวเลขที่ตั้งไว้

    if (data) setCategories(data);
    if (error) console.error("Error fetching categories:", error);
    setLoading(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("categories").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) {
      setCategories(categories.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
    }
  };

  // ➕ เปิด Modal เพิ่มหมวดหมู่
  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({ name: "", sort_order: categories.length + 1 }); // แนะนำเลขลำดับถัดไปให้เลย
    setShowModal(true);
  };

  // 📝 เปิด Modal แก้ไขหมวดหมู่
  const handleOpenEdit = (category: Category) => {
    setEditId(category.id);
    setFormData({ name: category.name, sort_order: category.sort_order });
    setShowModal(true);
  };

  // ฟังก์ชันบันทึกข้อมูล (เพิ่ม/แก้ไข)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("กรุณากรอกชื่อหมวดหมู่");

    const payload = {
      name: formData.name,
      sort_order: Number(formData.sort_order),
      is_active: true
    };

    if (editId) {
      // โหมดแก้ไข
      const { data, error } = await supabase.from("categories").update(payload).eq("id", editId).select().single();
      if (error) {
        alert("แก้ไขข้อมูลไม่สำเร็จ");
        console.error(error);
      } else if (data) {
        // อัปเดต State และเรียงลำดับใหม่ทันที
        const updatedList = categories.map(c => c.id === editId ? data : c).sort((a, b) => a.sort_order - b.sort_order);
        setCategories(updatedList);
        setShowModal(false);
      }
    } else {
      // โหมดเพิ่มใหม่
      const { data, error } = await supabase.from("categories").insert([payload]).select().single();
      if (error) {
        alert("เพิ่มหมวดหมู่ไม่สำเร็จ");
        console.error(error);
      } else if (data) {
        const updatedList = [...categories, data].sort((a, b) => a.sort_order - b.sort_order);
        setCategories(updatedList);
        setShowModal(false);
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${name}" ?\n(หากมีเมนูอยู่ในหมวดหมู่นี้ อาจทำให้ลบไม่สำเร็จ ต้องย้ายเมนูออกก่อน)`)) {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (!error) {
        setCategories(categories.filter(c => c.id !== id));
      } else {
        alert("ลบข้อมูลไม่สำเร็จ (อาจมีเมนูอาหารค้างอยู่ในหมวดหมู่นี้ครับ)");
      }
    }
  };

  if (loading) return <div className="p-8 text-pos-text-muted">กำลังโหลดข้อมูลหมวดหมู่...</div>;

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-pos-brand mb-1">จัดการหมวดหมู่เมนู</h1>
          <p className="text-pos-text-muted">เพิ่ม/แก้ไข และจัดลำดับหมวดหมู่การแสดงผล</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-pos-brand text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-all font-bold shadow-lg active:scale-95 flex items-center gap-2"
        >
          ➕ เพิ่มหมวดหมู่
        </button>
      </div>
      
      {/* 📋 ตารางหมวดหมู่ */}
      <div className="bg-pos-card rounded-2xl border border-pos-border shadow-lg overflow-hidden max-w-4xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-pos-bg text-pos-text-muted text-sm border-b border-pos-border">
              <tr>
                <th className="p-4 font-medium w-24 text-center">ลำดับ</th>
                <th className="p-4 font-medium w-24 text-center">สถานะ</th>
                <th className="p-4 font-medium">ชื่อหมวดหมู่</th>
                <th className="p-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pos-border">
              {categories.map((cat) => (
                <tr key={cat.id} className={`hover:bg-pos-bg/50 transition-colors ${!cat.is_active ? 'opacity-50 grayscale' : ''}`}>
                  <td className="p-4 text-center">
                    <span className="bg-pos-bg border border-pos-border px-3 py-1 rounded-lg font-mono font-bold text-pos-text-muted shadow-inner">
                      {cat.sort_order}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => toggleActive(cat.id, cat.is_active)}
                      className={`w-12 h-6 rounded-full transition-all relative ${cat.is_active ? 'bg-pos-success' : 'bg-gray-600'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${cat.is_active ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="p-4 font-bold text-xl text-white">{cat.name}</td>
                  <td className="p-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => handleOpenEdit(cat)}
                      className="px-4 py-2 bg-pos-border hover:bg-pos-brand hover:text-white rounded-lg transition-all font-medium text-sm"
                    >
                      📝 แก้ไข
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="px-4 py-2 bg-pos-danger/10 text-pos-danger hover:bg-pos-danger hover:text-white rounded-lg transition-all font-medium text-sm"
                    >
                      🗑️ ลบ
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-pos-text-muted">ยังไม่มีหมวดหมู่เมนู</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📝 Modal ฟอร์มเพิ่ม/แก้ไขหมวดหมู่ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 rounded-3xl w-full max-w-sm animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 border-b border-pos-border pb-4">
              {editId ? "📝 แก้ไขหมวดหมู่" : "➕ เพิ่มหมวดหมู่ใหม่"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-pos-text-muted mb-1">ชื่อหมวดหมู่</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="เช่น ของหวาน, ท็อปปิ้ง"
                  className="w-full bg-pos-bg border border-pos-border rounded-xl p-4 text-lg text-white focus:outline-none focus:border-pos-brand"
                />
              </div>

              <div>
                <label className="block text-sm text-pos-text-muted mb-1">ลำดับการแสดงผล (เลขน้อยขึ้นก่อน)</label>
                <input 
                  type="number" required min="1"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: Number(e.target.value)})}
                  className="w-full bg-pos-bg border border-pos-border rounded-xl p-4 text-lg font-mono text-white focus:outline-none focus:border-pos-brand text-center"
                />
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