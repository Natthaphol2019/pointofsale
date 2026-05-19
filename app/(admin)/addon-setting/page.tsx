"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Edit, Trash2, ArrowUpDown, Search, Settings2, Hash, DollarSign } from "lucide-react";
import Swal from "sweetalert2";

interface AddOn {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export default function AddonSettingPage() {
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof AddOn, direction: 'asc' | 'desc' } | null>(null);

  // Modal State
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
      .order("name", { ascending: true });
    
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

  // Sorting logic
  const handleSort = (key: keyof AddOn) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAddons = useMemo(() => {
    let sortableAddons = [...addons];
    
    // Filter
    if (searchQuery) {
      sortableAddons = sortableAddons.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    if (sortConfig !== null) {
      sortableAddons.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableAddons;
  }, [addons, sortConfig, searchQuery]);

  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({ name: "", price: "0" });
    setShowModal(true);
  };

  const handleOpenEdit = (addon: AddOn) => {
    setEditId(addon.id);
    setFormData({ name: addon.name, price: addon.price.toString() });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      Swal.fire({ title: "ข้อผิดพลาด", text: "กรุณากรอกชื่อท็อปปิ้ง", icon: "warning", confirmButtonColor: "#ff5722" });
      return;
    }

    const payload = {
      name: formData.name,
      price: Number(formData.price),
      is_active: true
    };

    if (editId) {
      const { data, error } = await supabase.from("add_ons").update(payload).eq("id", editId).select().single();
      if (error) {
        Swal.fire({ title: "ข้อผิดพลาด", text: "แก้ไขข้อมูลไม่สำเร็จ", icon: "error", confirmButtonColor: "#ff5722" });
      } else if (data) {
        setAddons(addons.map(a => a.id === editId ? data : a));
        setShowModal(false);
        Swal.fire({ title: "สำเร็จ", text: "อัปเดตข้อมูลเรียบร้อย", icon: "success", timer: 1500, showConfirmButton: false });
      }
    } else {
      const { data, error } = await supabase.from("add_ons").insert([payload]).select().single();
      if (error) {
        Swal.fire({ title: "ข้อผิดพลาด", text: "เพิ่มท็อปปิ้งไม่สำเร็จ", icon: "error", confirmButtonColor: "#ff5722" });
      } else if (data) {
        setAddons([...addons, data]);
        setShowModal(false);
        Swal.fire({ title: "สำเร็จ", text: "เพิ่มท็อปปิ้งใหม่เรียบร้อย", icon: "success", timer: 1500, showConfirmButton: false });
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบ?",
      html: `คุณต้องการลบ <b>"${name}"</b> ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from("add_ons").delete().eq("id", id);
      if (!error) {
        setAddons(addons.filter(a => a.id !== id));
        Swal.fire({ title: "ลบสำเร็จ", icon: "success", timer: 1500, showConfirmButton: false });
      } else {
        Swal.fire({ title: "ลบไม่สำเร็จ", text: error.message, icon: "error", confirmButtonColor: "#ef4444" });
      }
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-48">
      <div className="w-8 h-8 border-4 border-[#ff5722]/20 border-t-[#ff5722] rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight flex items-center gap-3">
            <Settings2 className="text-[#ff5722]" size={32} />
            จัดการท็อปปิ้ง (Add-on)
          </h1>
          <p className="text-slate-500 font-medium">เพิ่มรายการส่วนเสริมและราคา เพื่อให้พนักงานกดเลือกตอนสั่งอาหาร</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-[#ff5722] text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:bg-orange-600 transition-all font-bold flex items-center gap-2 active:scale-95"
        >
          <Plus size={20} /> เพิ่มท็อปปิ้ง
        </button>
      </div>

      {/* ค้นหา */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="ค้นหาชื่อท็อปปิ้ง..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5722]/20 focus:border-[#ff5722] transition-all text-slate-700"
        />
      </div>
      
      {/* 📋 ตารางท็อปปิ้ง */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap w-24 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("is_active")}>
                  <div className="flex items-center justify-center gap-1">สถานะ <ArrowUpDown size={14}/></div>
                </th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1"><Hash size={14}/> ชื่อท็อปปิ้ง <ArrowUpDown size={14}/></div>
                </th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 transition-colors w-48" onClick={() => handleSort("price")}>
                  <div className="flex items-center justify-end gap-1">ราคา (บาท) <ArrowUpDown size={14}/></div>
                </th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap text-right w-40">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAddons.map((addon) => (
                <tr key={addon.id} className={`hover:bg-slate-50/80 transition-colors ${!addon.is_active ? 'opacity-60 bg-slate-50' : ''}`}>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <button 
                      onClick={() => toggleActive(addon.id, addon.is_active)}
                      className={`w-12 h-6 rounded-full transition-all relative ${addon.is_active ? 'bg-[#10b981]' : 'bg-slate-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${addon.is_active ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className={`px-6 py-4 font-bold text-lg whitespace-nowrap ${!addon.is_active ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {addon.name}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-extrabold text-[#ff5722] text-lg bg-[#ff5722]/10 px-3 py-1 rounded-lg">
                      {addon.price > 0 ? `+฿${addon.price}` : 'ฟรี'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2 whitespace-nowrap">
                    <button 
                      onClick={() => handleOpenEdit(addon)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="แก้ไข"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(addon.id, addon.name)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบ"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {sortedAddons.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">ไม่พบข้อมูลท็อปปิ้ง</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📝 Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-2xl font-bold mb-6 border-b border-slate-100 pb-4 text-slate-800 flex items-center gap-2">
              <Edit className="text-[#ff5722]" size={24} />
              {editId ? "แก้ไขท็อปปิ้ง" : "เพิ่มท็อปปิ้งใหม่"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">ชื่อท็อปปิ้ง / ส่วนเสริม</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="เช่น ไข่ดาว, เพิ่มข้าว..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5722]/20 focus:border-[#ff5722] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#ff5722] mb-1.5 flex items-center gap-1">
                  <DollarSign size={14} /> ราคาบวกเพิ่ม (บาท)
                </label>
                <input 
                  type="number" required min="0" step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5722]/20 focus:border-[#ff5722] transition-all text-right"
                  placeholder="0"
                />
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  * หากเป็นตัวเลือกฟรีให้ระบุ 0
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="py-3 bg-[#ff5722] text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-md active:scale-95"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
