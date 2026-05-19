"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Cropper from "react-easy-crop";
import { Plus, Edit2, CheckCircle2, ImageOff, X, Save, ShieldAlert } from "lucide-react";
import Swal from "sweetalert2";

interface Category { id: string; name: string; }
interface MenuItem { 
  id: string; 
  name: string; 
  price: number; 
  cost: number; 
  is_active: boolean; 
  category_id: string; 
  image_url?: string;
}

// 🛠️ Helper ฟังก์ชันสำหรับวาดรูปและแปลงเป็น WebP
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", 0.8);
  });
}

export default function MenuSettingPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "", price: "", cost: "", category_id: "", image_url: ""
  });

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: catData } = await supabase.from("categories").select("*").order("sort_order");
    if (catData) {
      setCategories(catData);
      if (catData.length > 0) setFormData(prev => ({ ...prev, category_id: catData[0].id }));
    }
    const { data: menuData } = await supabase.from("menu_items").select("*").is("deleted_at", null).order("name");
    if (menuData) setMenus(menuData);
    setLoading(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("menu_items").update({ is_active: !currentStatus }).eq("id", id);
    if (!error) setMenus(menus.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m));
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({ name: "", price: "", cost: "", category_id: categories.length > 0 ? categories[0].id : "", image_url: "" });
    resetCropState();
    setShowModal(true);
  };

  const handleOpenEdit = (menu: MenuItem) => {
    setEditId(menu.id);
    setFormData({ name: menu.name, price: menu.price.toString(), cost: menu.cost.toString(), category_id: menu.category_id, image_url: menu.image_url || "" });
    resetCropState();
    setShowModal(true);
  };

  const resetCropState = () => {
    setImageSrc(null);
    setCroppedBlob(null);
    setPreviewUrl(null);
    setZoom(1);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result as string));
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const confirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const webpBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (webpBlob) {
        setCroppedBlob(webpBlob);
        setPreviewUrl(URL.createObjectURL(webpBlob));
        setImageSrc(null);
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการตัดรูปภาพ', confirmButtonColor: '#ff5722' });
    }
  };

  const uploadImage = async (blob: Blob): Promise<string | null> => {
    try {
      setUploading(true);
      const fileName = `${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from('menu-images').upload(fileName, blob, {
        contentType: 'image/webp'
      });
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.cost) return Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', confirmButtonColor: '#ff5722' });

    let finalImageUrl = formData.image_url; 

    if (croppedBlob) {
      const uploadedUrl = await uploadImage(croppedBlob);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        Swal.fire({ icon: 'error', title: 'อัปโหลดไม่สำเร็จ', text: 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่', confirmButtonColor: '#ff5722' });
        return;
      }
    }

    const payload = {
      name: formData.name,
      price: Number(formData.price),
      cost: Number(formData.cost),
      category_id: formData.category_id,
      image_url: finalImageUrl || null,
      is_active: true
    };

    if (editId) {
      const { data, error } = await supabase.from("menu_items").update(payload).eq("id", editId).select().single();
      if (!error && data) {
        setMenus(menus.map(m => m.id === editId ? data : m));
        setShowModal(false);
      }
    } else {
      const { data, error } = await supabase.from("menu_items").insert([payload]).select().single();
      if (!error && data) {
        setMenus([...menus, data]);
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
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">จัดการเมนูอาหาร</h1>
          <p className="text-slate-500 font-medium">เพิ่ม/แก้ไขเมนู และระบบตัดรูปภาพอัตโนมัติ (Crop & WebP)</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-gradient-to-r from-[#ff5722] to-[#ff8a50] text-white px-6 py-3 rounded-xl hover:shadow-[0_8px_24px_rgba(255,87,34,0.3)] transition-all font-bold active:scale-[0.98] flex items-center gap-2"
        >
          <Plus size={20} strokeWidth={2.5} /> เพิ่มเมนูใหม่
        </button>
      </div>
      
      {/* 📋 ตารางรายการอาหาร - อัปเกรด High-class */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center w-20">สถานะ</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider w-24">รูปภาพ</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">ชื่อเมนู</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">หมวดหมู่</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">ราคาขาย</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right rounded-tr-2xl">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {menus.map((menu) => (
                <tr key={menu.id} className={`hover:bg-slate-50/80 transition-colors group ${!menu.is_active ? 'opacity-60 bg-slate-50 grayscale' : ''}`}>
                  <td className="px-6 py-4 text-center align-middle whitespace-nowrap">
                    <button 
                      onClick={() => toggleActive(menu.id, menu.is_active)} 
                      className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-offset-2 ${menu.is_active ? 'bg-[#10b981] focus:ring-[#10b981]/50' : 'bg-slate-300 focus:ring-slate-300/50'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform duration-200 ${menu.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {menu.image_url ? (
                      <img src={menu.image_url} alt={menu.name} className="w-14 h-14 rounded-xl object-cover border border-slate-100 shadow-sm" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                        <ImageOff size={20} strokeWidth={1.5} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 text-[15px] whitespace-nowrap">{menu.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide">
                      {categories.find(c => c.id === menu.category_id)?.name || "ไม่ระบุ"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-[#ff5722] text-lg whitespace-nowrap">฿{menu.price}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button 
                      onClick={() => handleOpenEdit(menu)} 
                      className="px-4 py-2.5 inline-flex items-center gap-2 bg-slate-100 text-slate-600 hover:bg-[#ff5722] hover:text-white hover:shadow-md rounded-xl transition-all font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5722]/50 active:scale-95"
                    >
                      <Edit2 size={16} strokeWidth={2} /> แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
              {menus.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <ShieldAlert size={40} className="mx-auto text-slate-300 mb-3" />
                    ไม่มีข้อมูลเมนูอาหาร
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📝 Modal ฟอร์มเมนู - ปรับ UI เป็น Modern */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl border border-white p-6 md:p-8 rounded-[2rem] shadow-2xl w-full max-w-lg mb-[5vh] lg:mb-0 max-h-[90vh] overflow-y-auto no-scrollbar relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              {editId ? <Edit2 className="text-[#ff5722]" size={24} /> : <Plus className="text-[#ff5722]" size={24} />}
              {editId ? "แก้ไขเมนูอาหาร" : "เพิ่มเมนูอาหารใหม่"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                  หมวดหมู่ <span className="text-[#ff5722]">*</span>
                </label>
                <select 
                  value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-2xl p-3.5 transition-all text-slate-700 font-medium"
                >
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex justify-between">
                  ชื่อเมนู <span className="text-[#ff5722]">*</span>
                </label>
                <input 
                  type="text" required placeholder="เช่น หมูปิ้งคลาสสิก"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-2xl p-3.5 transition-all text-slate-900 font-medium" 
                />
              </div>

              {/* 📸 อัปโหลดรูปภาพ */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">รูปภาพ (อัตราส่วนแนะนำ 16:9)</label>
                
                {(previewUrl || formData.image_url) && !imageSrc && (
                  <div className="mb-4 relative w-full h-40 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden group">
                    <img src={previewUrl || formData.image_url!} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <label className="flex flex-col items-center justify-center w-full bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#ff5722]/50 hover:bg-[#ff5722]/5 rounded-2xl p-4 cursor-pointer transition-all">
                  <div className="text-center text-slate-500">
                    <p className="font-semibold text-sm">คลิกเพื่ออัปโหลดไฟล์ / ถ่ายรูป</p>
                    <p className="text-xs mt-1">รองรับ JPG, PNG</p>
                  </div>
                  <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={onFileChange} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ต้นทุน (฿)</label>
                  <input 
                    type="number" required min="0" placeholder="0"
                    value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none rounded-2xl p-3.5 text-right font-medium text-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#ff5722] mb-1.5">ราคาขาย (฿)</label>
                  <input 
                    type="number" required min="0" placeholder="0"
                    value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} 
                    className="w-full bg-[#ff5722]/5 border border-[#ff5722]/30 focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/10 outline-none rounded-2xl p-3.5 text-right text-[#ff5722] font-bold text-lg" 
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 mt-4 border-t border-slate-100">
                <button 
                  type="button" disabled={uploading} onClick={() => setShowModal(false)} 
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" disabled={uploading} 
                  className="flex-1 py-3.5 bg-[#ff5722] text-white font-bold rounded-2xl hover:bg-orange-600 hover:shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                >
                  {uploading ? "กำลังบันทึก..." : <><Save size={18} strokeWidth={2.5}/> บันทึกข้อมูล</>}
                </button>
              </div>
            </form>

            {/* ✂️ Overlay หน้าต่าง Crop รูปภาพ */}
            {imageSrc && (
              <div className="absolute inset-0 bg-white z-50 flex flex-col rounded-[2rem] overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center z-10 shadow-sm">
                  <h3 className="font-bold text-lg text-slate-900">กำหนดจุดโฟกัสรูปภาพ</h3>
                  <button onClick={() => setImageSrc(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"><X size={18}/></button>
                </div>
                <div className="flex-1 relative bg-slate-900">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={16 / 9} 
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>
                <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-semibold text-slate-600">ซูมเข้า/ออก</span>
                    <input 
                      type="range" min={1} max={3} step={0.1} value={zoom} 
                      onChange={(e) => setZoom(Number(e.target.value))} 
                      className="flex-1 accent-[#ff5722] h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <button onClick={confirmCrop} className="w-full py-4 bg-[#10b981] text-white font-bold rounded-2xl shadow-lg shadow-[#10b981]/20 hover:bg-emerald-600 transition-colors flex justify-center items-center gap-2">
                    <CheckCircle2 size={20} strokeWidth={2.5} /> ยืนยันการตัดรูป
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}